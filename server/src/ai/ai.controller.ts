import { Controller, Post, Body, Logger } from '@nestjs/common';
import { AiService } from './ai.service';

import { IsString, IsNumber, IsEnum, IsObject, IsOptional } from 'class-validator';

export class AnalyzeNameDto {
    @IsString()
    name: string;

    @IsString()
    birthDate: string;

    @IsEnum(['male', 'female'])
    gender: 'male' | 'female';

    @IsNumber()
    sajuYear: number;

    @IsString()
    ganji: string;

    @IsObject()
    @IsOptional()
    analysis: any; // 프론트엔드에서 계산한 십성 분석 데이터
}

@Controller('ai')
export class AiController {
    private readonly logger = new Logger(AiController.name);

    constructor(private readonly aiService: AiService) { }

    @Post('analyze')
    async analyzeName(@Body() dto: AnalyzeNameDto) {
        this.logger.log(`Analyzing name: ${dto.name}, Gender: ${dto.gender}, Year: ${dto.sajuYear}`);

        try {
            // 프론트엔드에서 전달받은 십성 분석 데이터를 기반으로 AI 분석 수행
            const analysis = await this.aiService.analyzeWithKnowledgeBase(dto);

            return {
                success: true,
                analysis,
            };
        } catch (error) {
            this.logger.error('Failed to analyze name', error.message);
            throw error;
        }
    }
}
