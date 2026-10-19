import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  // Spec at /api/docs-json — packages/api-client generates from this.
  // ignoreGlobalPrefix keeps paths prefix-free; the client sets baseUrl to /api.
  const doc = SwaggerModule.createDocument(
    app,
    new DocumentBuilder().setTitle('API').setVersion('1.0').build(),
    { ignoreGlobalPrefix: true },
  );
  SwaggerModule.setup('api/docs', app, doc);

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
