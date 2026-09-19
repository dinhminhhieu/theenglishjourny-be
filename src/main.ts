import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AppConfigService, Environment } from './config/env.validation';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const config = app.get<AppConfigService>(ConfigService);

  const port = config.get('PORT', { infer: true });
  const prefix = config.get('API_PREFIX', { infer: true });
  const origins = config
    .get('ALLOWED_ORIGINS', { infer: true })
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.setGlobalPrefix(prefix);
  app.enableCors({
    origin: origins.length > 0 ? origins : true,
    credentials: true,
  });
  app.enableShutdownHooks();

  if (config.get('NODE_ENV', { infer: true }) !== Environment.Production) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('The IELTS Foundation API')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    SwaggerModule.setup(
      'docs',
      app,
      SwaggerModule.createDocument(app, swaggerConfig),
    );
  }

  await app.listen(port);
  Logger.log(
    `API: http://localhost:${port}/${prefix} | Docs: http://localhost:${port}/docs`,
    'Bootstrap',
  );
}

void bootstrap();
