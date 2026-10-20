import { Module, type OnModuleInit } from "@nestjs/common";
import { HttpAdapterHost } from "@nestjs/core";
import express, { type RequestHandler } from "express";
import session from "express-session";
import path from "node:path";

import { isAdminEmail } from "./admin-emails";
import { ADMIN_ROOT_PATH } from "./admin-path";
import { adminResources } from "./admin-resources";

import { decoyDigest, verifyPassword } from "../auth/password";
import { PrismaService } from "../prisma.service";

// Not `access_token`. Two cookies with one name on overlapping paths is a
// debugging afternoon nobody needs.
const ADMIN_COOKIE = "adminjs_session",
  // A bounded session, so a forgotten open tab is not a standing open door.
  SESSION_MAX_AGE_MS = 8 * 60 * 60 * 1000,
  // Length, not just presence: this value signs the session cookie, and a short
  // one is forgeable. 32 is what the generator in .env.example produces.
  SECRET_MIN_LENGTH = 32,
  // Relative to the mount; AdminJS asks for it by this path in both modes.
  COMPONENTS_BUNDLE_PATH = "/frontend/assets/components.bundle.js";

/**
 * AdminJS is mounted through `@adminjs/express` rather than `@adminjs/nestjs`.
 * The Nest adapter calls `admin.watch()` unconditionally, which starts a
 * rollup + babel bundler for custom components inside the API process. With no
 * custom components it has nothing to build, and it dies anyway: babel resolves
 * plugin names from the compilation root (`apps/api`), not from `adminjs`'s own
 * dependencies, so under pnpm's isolation it cannot find
 * `@babel/plugin-syntax-import-assertions`. Making it work would mean adding
 * that plugin plus three presets to this app to feed a dev-mode watcher we do
 * not want in production. Its only other job is the `app.use()` below.
 *
 * ponytail: a third PrismaClient, and so a third pool, because PrismaService is
 * provided per module in this repo. Upgrade path: one @Global() PrismaModule,
 * which means editing auth.module.ts and users.module.ts — out of scope here.
 */
@Module({ providers: [PrismaService] })
export class AdminModule implements OnModuleInit {
  constructor(
    private readonly adapterHost: HttpAdapterHost,
    private readonly prisma: PrismaService,
  ) {}

  async onModuleInit(): Promise<void> {
    // AdminJS 7 is ESM-only and `@adminjs/express`'s exports map declares no
    // `require` condition, so these must stay real dynamic imports. That is
    // what `module: "node20"` in tsconfig buys: under `commonjs` TypeScript
    // rewrites them into `require()` and the app dies at boot.
    const { default: AdminJS, Router: AdminRouter } = await import("adminjs"),
      { buildAuthenticatedRouter } = await import("@adminjs/express"),
      { Database, Resource } = await import("@adminjs/prisma"),
      // Read here, not at module scope: `main.ts` calls `process.loadEnvFile()`
      // inside `bootstrap()`, after this file's imports have been evaluated.
      secret = process.env.ADMIN_SESSION_SECRET;

    if (!secret || secret.length < SECRET_MIN_LENGTH) {
      throw new Error(
        `ADMIN_SESSION_SECRET must be set and at least ${SECRET_MIN_LENGTH} characters long. ` +
          "Generate one with: openssl rand -hex 32",
      );
    }

    AdminJS.registerAdapter({ Database, Resource });

    // Under NODE_ENV=production, `admin.initialize()` — which
    // `buildAuthenticatedRouter` calls for us — runs the rollup + babel
    // component bundler unless this is set (adminjs/lib/adminjs.js:125). It
    // then dies on `@babel/plugin-syntax-import-assertions` for the reason in
    // the comment above, and because the promise is never awaited the rejection
    // is fatal: the API does not boot at all in production.
    //
    // There are no custom components to bundle, so switching it off loses
    // nothing. The stub the bundler would have written is served below instead.
    // If custom components are ever added, this has to go and the bundler has to
    // be made to work.
    process.env.ADMIN_JS_SKIP_BUNDLE = "true";

    const admin = new AdminJS({
        rootPath: ADMIN_ROOT_PATH,
        resources: adminResources(this.prisma),
      }),
      sessionOptions: session.SessionOptions = {
        secret,
        name: ADMIN_COOKIE,
        resave: false,
        saveUninitialized: false,
        cookie: {
          // Scoped to the mount, so it never sits beside `access_token` on "/".
          path: ADMIN_ROOT_PATH,
          httpOnly: true,
          sameSite: "lax",
          maxAge: SESSION_MAX_AGE_MS,
          // Same inversion as session.ts: anything but development gets Secure,
          // which is right for a deployment and breaks plain-http localhost.
          // This one needs `trust proxy` set in main.ts to work behind nginx —
          // express-session checks the connection before sending it.
          secure: process.env.NODE_ENV !== "development",
        },
      },
      // AdminJS serves its own frontend bundles with a bare `res.sendFile`,
      // whose default is `dotfiles: "ignore"`. pnpm keeps every package under
      // node_modules/.pnpm, so every asset path contains a dot-segment and all
      // of them 404 — the panel loads and renders blank, with no error logged
      // anywhere. The same assets registered first, with dotfiles allowed, take
      // precedence over the routes AdminJS adds for them. A flat node_modules
      // does not hit this, which is why upstream has not.
      assets = express.Router();

    // In development AdminJS serves this through a route that generates it; in
    // production it expects a file the switched-off bundler never wrote. Serving
    // the stub ourselves makes both modes identical and keeps the panel from
    // requesting a script that 404s.
    assets.get(COMPONENTS_BUNDLE_PATH, (_req, res) => {
      res.type("application/javascript").send("AdminJS.UserComponents = {}");
    });

    for (const asset of AdminRouter.assets) {
      if (asset.path === COMPONENTS_BUNDLE_PATH) continue;

      assets.get(asset.path, (_req, res) => {
        res.sendFile(path.resolve(asset.src), { dotfiles: "allow" });
      });
    }

    const router = buildAuthenticatedRouter(
        admin,
        {
          cookieName: ADMIN_COOKIE,
          cookiePassword: secret,
          // The panel's login is a password endpoint on the public internet
          // whenever the proxy in front of it is missing. Nothing else in this
          // repo rate-limits anything, so take the adapter's own limiter. It
          // keys on `req.ip`, which is why `trust proxy` is not optional: behind
          // a proxy every client would share one bucket and five bad attempts
          // from anyone would lock out every admin.
          maxRetries: { count: 5, duration: 300 },
          authenticate: async (email, password) => {
            const user = await this.prisma.user.findUnique({
                where: { email: email.trim().toLowerCase() },
                // The global omit hides the digest from every other query; this is
                // the one place besides login that needs it back.
                omit: { password: false },
              }),
              // Verified unconditionally, decoy included, so an address that is not
              // on the allowlist costs exactly as much as one that is — otherwise
              // the panel leaks who its admins are. auth.service.ts does the same
              // for unknown emails.
              matches = await verifyPassword(password, user?.password ?? (await decoyDigest()));

            if (!matches || !user || !isAdminEmail(user.email)) return null;

            return { email: user.email, id: user.id };
          },
        },
        assets,
        sessionOptions,
      ),
      instance = this.adapterHost.httpAdapter.getInstance(),
      // The allowlist is re-read on every request, not only at login, so taking
      // someone out of ADMIN_EMAILS ends their session on their next click rather
      // than whenever the cookie happens to expire. jwt-auth.guard.ts reloads the
      // user every request for exactly this reason, and a panel that revokes more
      // slowly than the app would be the weaker door.
      //
      // Our own session() has to run first to populate req.session; the copy
      // inside the AdminJS router then returns early, because express-session
      // starts with `if (req.session) return next()`.
      revokeUnlistedAdmin: RequestHandler = (req, res, next) => {
        const email = (req.session as { adminUser?: { email?: string } } | undefined)?.adminUser
          ?.email;

        if (email !== undefined && !isAdminEmail(email)) {
          req.session.destroy(() => res.redirect(`${ADMIN_ROOT_PATH}/login`));

          return;
        }

        next();
      };

    instance.use(ADMIN_ROOT_PATH, session(sessionOptions), revokeUnlistedAdmin);

    instance.use(ADMIN_ROOT_PATH, router);
  }
}
