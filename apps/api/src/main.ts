import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";

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

  const app = await NestFactory.create(AppModule);

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
