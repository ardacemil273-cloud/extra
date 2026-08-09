```ts
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import helmet from 'helmet';
import { IoAdapter } from '@nestjs/platform-socket.io';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    cors: {
      origin: [
        process.env.FRONTEND_URL || 'http://localhost:3000',
        'http://localhost:3000',
        'http://localhost:3001',
      ],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
    },
  });

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'", 'wss:', 'ws:', 'https:'],
        },
      },
      crossOriginEmbedderPolicy: false,
    }),
  );

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  app.setGlobalPrefix('api/v1');

  app.useWebSocketAdapter(new IoAdapter(app));

  const port = Number(process.env.PORT) || 8080;

  await app.listen(port, '0.0.0.0');

  console.log(`🚀 PartyVerse Backend running on port ${port}`);
  console.log(`🎮 WebSocket ready on port ${port}`);
}

bootstrap();
```
