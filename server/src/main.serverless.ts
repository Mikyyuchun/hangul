import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { ExpressAdapter } from '@nestjs/platform-express';
import express from 'express';

const expressApp = express();
let app: any;

async function bootstrap() {
    if (!app) {
        app = await NestFactory.create(AppModule, new ExpressAdapter(expressApp));

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

        await app.init();
    }
    return app;
}

export default async function handler(req: any, res: any) {
    await bootstrap();
    expressApp(req, res);
}
