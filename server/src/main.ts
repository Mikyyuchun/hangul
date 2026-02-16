import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // API Prefix 설정
  app.setGlobalPrefix('api');

  // Validation Pipe 설정
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
  }));

  // CORS 설정 - Vercel 배포 도메인 허용
  app.enableCors({
    origin: [
      'http://localhost:3000',
      'http://localhost:5173',
      /\.vercel\.app$/, // 모든 Vercel 도메인 허용
    ],
    credentials: true,
  });

  // Swagger 설정
  const config = new DocumentBuilder()
    .setTitle('AI Hangul Naming Lab API')
    .setDescription('성명학 분석 및 상담을 위한 API 문서')
    .setVersion('1.0')
    .addTag('naming')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(process.env.PORT ?? 8000); // Front가 3000을 쓰므로 Back은 8000으로 설정
}
bootstrap();
