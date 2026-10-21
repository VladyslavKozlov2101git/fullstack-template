import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import express, { type RequestHandler } from "express";

import { isAdminPath } from "./admin/admin-path";
import { AppModule } from "./app.module";

async function bootstrap() {
  // Node's own loader, so there is no dotenv dependency. Nest does not read
  // `.env` on its own, and relying on @prisma/client loading it as a side
  // effect means the values depend on import order. In a real deployment the
  // platform supplies the variables and there is no file to read.
  try {
    process.loadEnvFile();
  } catch {
    /* no .env — the environment is expected to carry the variables */
  }

  // bodyParser: false, then the same two parsers by hand, because AdminJS
  // parses its own form posts with express-formidable. Once Nest's parser has
  // consumed the request stream, formidable waits for data that will never
  // arrive and the panel's login POST hangs forever with no error logged. The
  // check @adminjs/express has for this does not fire: it calls next(err) and
  // then next() unconditionally, so the chain reaches formidable anyway.
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bodyParser: false }),
    exceptAdmin =
      (middleware: RequestHandler): RequestHandler =>
      (req, res, next) =>
        isAdminPath(req.path) ? next() : middleware(req, res, next);

  app.use(exceptAdmin(express.json()));
  app.use(exceptAdmin(express.urlencoded({ extended: true })));

  // The panel keeps a Secure session cookie outside development, and
  // express-session will not send one unless the connection looks secure — its
  // own check, at express-session/index.js:242. nginx terminates TLS and
  // proxies plain http, so without this the login succeeds, no cookie is set,
  // and the panel bounces back to its login form forever on any deployment.
  //
  // It also fixes `req.ip`, which the panel's login limiter keys on. Behind a
  // proxy every client looks like 127.0.0.1, so five bad attempts from anyone
  // would lock out every admin. One hop, matching the documented topology.
  app.set("trust proxy", 1);

  app.setGlobalPrefix("api");
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  // Spec at /api/docs-json — packages/api-client generates from this.
  // ignoreGlobalPrefix keeps paths prefix-free; the client sets baseUrl to /api.
  const doc = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle("API")
      .setVersion("1.0")
      // The session is a cookie, not a bearer token — say so, or /api/docs
      // cannot authenticate and the spec misdescribes the guarded routes.
      .addCookieAuth("access_token")
      .build(),
    { ignoreGlobalPrefix: true },
  );
  SwaggerModule.setup("api/docs", app, doc);

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
