import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';

import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Security headers
  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  }));

  // Trust proxy for rate limiting behind reverse proxy
  (app as any).set('trust proxy', 1);

  // Global prefix
  app.setGlobalPrefix('api/v1');

  // CORS — allow Vercel frontend (prod + previews) and localhost
  const clientUrl = configService.get<string>('app.clientUrl');
  const allowedOrigins = [
    clientUrl,
    'http://localhost:5173',
    'http://localhost:3000',
    'https://client-hub-blush.vercel.app',
  ].filter(Boolean) as string[];

  app.enableCors({
    origin: (origin, callback) => {
      // Allow non-browser (no origin) and any allowed origin, including Vercel preview deployments
      if (!origin) return callback(null, true);
      const isAllowed =
        allowedOrigins.includes(origin) ||
        /^https:\/\/client-hub-.*\.vercel\.app$/.test(origin) ||
        /^https:\/\/.*\.vercel\.app$/.test(origin);
      if (isAllowed) return callback(null, true);
      return callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Organization-Id'],
  });

  // Global pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Global filters
  app.useGlobalFilters(new HttpExceptionFilter());

  // Global interceptors
  app.useGlobalInterceptors(new ResponseInterceptor());

  // Swagger
  if (configService.get<boolean>('app.swagger.enabled')) {
    const swaggerPath = configService.get<string>('app.swagger.path') || 'api/docs';
    const config = new DocumentBuilder()
      .setTitle('ClientHub API')
      .setDescription('Multi-tenant B2B SaaS CRM Platform API — Phase 3')
      .setVersion('2.0')
      .addBearerAuth(
        { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        'access-token',
      )
      .addTag('Auth', 'Authentication endpoints')
      .addTag('Organizations', 'Organization management')
      .addTag('Users', 'User management')
      .addTag('Clients', 'Client management')
      .addTag('Leads', 'Lead management')
      .addTag('Deals', 'Deal/Sales pipeline management')
      .addTag('Tasks', 'Task management')
      .addTag('Activities', 'Activity timeline')
      .addTag('Notifications', 'In-app notifications')
      .addTag('Dashboard', 'Analytics & dashboard')
      .addTag('Reports', 'Advanced reports & analytics')
      .addTag('Billing', 'Subscription & billing management')
      .addTag('Usage', 'Plan usage tracking')
      .addTag('Audit Logs', 'Audit trail & compliance logging')
      .addTag('Super Admin', 'Platform administration (Super Admin only)')
      .addTag('Webhooks', 'Payment provider webhook handlers')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup(swaggerPath, app, document, {
      swaggerOptions: {
        persistAuthorization: true,
        tagsSorter: 'alpha',
        operationsSorter: 'method',
      },
    });
    console.log(`📚 Swagger available at: http://localhost:${configService.get('app.port')}/${swaggerPath}`);
  }

  const port = configService.get<number>('app.port') || 3000;
  await app.listen(port);
  console.log(`🚀 Server running on http://localhost:${port}`);
  console.log(`📡 API prefix: /api/v1`);
}

bootstrap();
