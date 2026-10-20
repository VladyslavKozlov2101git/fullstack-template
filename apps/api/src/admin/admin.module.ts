import { Module, type OnModuleInit } from "@nestjs/common";
import { HttpAdapterHost } from "@nestjs/core";
import express from "express";
import path from "node:path";

import { isAdminEmail } from "./admin-emails";

import { decoyDigest, verifyPassword } from "../auth/password";
import { PrismaService } from "../prisma.service";

// Served by an Express sub-application, not a Nest controller, so
// `setGlobalPrefix("api")` does not apply and the path is spelled out here.
//
// A single segment, not "/api/admin": AdminJS derives the path set it hands to
// its own frontend from the last segment of rootPath only, so a nested root
// renders a panel whose client-side loginPath and refreshTokenPath point at
// /admin/* while the server serves /api/admin/* — every form post 404s.
// Overriding loginPath and logoutPath fixes the server routes but not the
// frontend state. The cost is that nginx needs its own location block, which
// the CSP relaxation required anyway.
export const ADMIN_ROOT_PATH = "/admin";

// Not `access_token`. Two cookies with one name on overlapping paths is a
// debugging afternoon nobody needs.
const ADMIN_COOKIE = "adminjs_session";

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
      // Read here, not at module scope: `main.ts` calls `process.loadEnvFile()`
      // inside `bootstrap()`, after this file's imports have been evaluated.
      secret = process.env.ADMIN_SESSION_SECRET;

    if (!secret) {
      throw new Error(
        "ADMIN_SESSION_SECRET is not set. Copy apps/api/.env.example to .env and set it.",
      );
    }

    const admin = new AdminJS({ rootPath: ADMIN_ROOT_PATH, resources: [] }),
      // AdminJS serves its own frontend bundles with a bare `res.sendFile`,
      // whose default is `dotfiles: "ignore"`. pnpm keeps every package under
      // node_modules/.pnpm, so every asset path contains a dot-segment and all
      // of them 404 — the panel loads and renders blank, with no error logged
      // anywhere. The same assets registered first, with dotfiles allowed, take
      // precedence over the routes AdminJS adds for them. A flat node_modules
      // does not hit this, which is why upstream has not.
      assets = express.Router();

    for (const asset of AdminRouter.assets) {
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
        // repo rate-limits anything, so take the adapter's own limiter.
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
      {
        secret,
        resave: false,
        saveUninitialized: false,
        cookie: {
          // Scoped to the mount, so it never sits beside `access_token` on "/".
          path: ADMIN_ROOT_PATH,
          httpOnly: true,
          sameSite: "lax",
          // Same inversion as session.ts: anything but development gets Secure,
          // which is right for a deployment and breaks plain-http localhost.
          secure: process.env.NODE_ENV !== "development",
        },
      },
    );

    this.adapterHost.httpAdapter.getInstance().use(ADMIN_ROOT_PATH, router);
  }
}
