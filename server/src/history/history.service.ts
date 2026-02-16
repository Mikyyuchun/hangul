import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EncryptionService } from '../common/encryption.service';
import { AiService } from '../ai/ai.service';

@Injectable()
export class HistoryService {
    private readonly logger = new Logger(HistoryService.name);

    constructor(
        private prisma: PrismaService,
        private encryptionService: EncryptionService,
        private aiService: AiService,
    ) { }

    async createHistory(data: {
        userId: string;
        targetName: string;
        birthDate: string;
        gender: string;
        sajuGanji: string;
    }) {
        try {
            // 암호화 적용
            const encryptedName = this.encryptionService.encrypt(data.targetName);
            const encryptedBirthDate = this.encryptionService.encrypt(data.birthDate);

            // AI 해석 요청 (여기서는 간단히 시뮬레이션 또는 실제 호출)
            // 실제 구현에서는 RAG를 통해 심층 해석을 수행해야 함
            // const interpretation = await this.aiService.generateInterpretation(...) 

            const history = await this.prisma.history.create({
                data: {
                    userId: data.userId,
                    targetName: encryptedName,
                    birthDate: encryptedBirthDate,
                    gender: data.gender,
                    sajuGanji: data.sajuGanji,
                    aiResponse: 'AI interpretation pending...', // Placeholder
                },
            });

            return {
                ...history,
                targetName: data.targetName, // 반환 시에는 복호화된(원본) 데이터 반환
                birthDate: data.birthDate,
            };
        } catch (error) {
            this.logger.error('Failed to create history', error.message);
            throw error;
        }
    }

    async getHistory(id: string) {
        const history = await this.prisma.history.findUnique({
            where: { id },
        });

        if (!history) return null;

        // 조회 시 복호화
        return {
            ...history,
            targetName: this.encryptionService.decrypt(history.targetName),
            birthDate: this.encryptionService.decrypt(history.birthDate),
        };
    }

    async getUserHistories(userId: string) {
        const histories = await this.prisma.history.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
        });

        // 리스트 조회 시 복호화
        return histories.map(history => ({
            ...history,
            targetName: this.encryptionService.decrypt(history.targetName),
            birthDate: this.encryptionService.decrypt(history.birthDate),
        }));
    }
}
