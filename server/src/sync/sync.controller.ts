import { Controller, Post, Get, Body, Logger } from '@nestjs/common';
import { AiService } from '../ai/ai.service';
import { SheetsService } from '../sheets/sheets.service';

@Controller('sync')
export class SyncController {
    private readonly logger = new Logger(SyncController.name);

    constructor(
        private aiService: AiService,
        private sheetsService: SheetsService,
    ) { }

    /**
     * 구글 시트의 모든 데이터를 Pinecone에 동기화합니다.
     * POST /api/sync/knowledge
     */
    @Post('knowledge')
    async syncKnowledgeBase(@Body() body: { sheetNames?: string[] }) {
        try {
            const sheetNames = body.sheetNames || ['theory_basic', 'interpretation_rules', 'case_studies'];
            const results: any[] = [];

            for (const sheetName of sheetNames) {
                this.logger.log(`Syncing sheet: ${sheetName}`);

                const data = await this.sheetsService.fetchSheetDataAsObjects(sheetName);
                const count = await this.aiService.syncSheetDataToPinecone(data, sheetName);

                results.push({
                    sheetName,
                    recordCount: count,
                    status: 'success',
                });
            }

            return {
                message: 'Knowledge base synchronized successfully',
                results,
            };
        } catch (error) {
            this.logger.error('Failed to sync knowledge base', error.message);
            throw error;
        }
    }

    /**
     * 특정 시트만 동기화합니다.
     * POST /api/sync/sheet
     */
    @Post('sheet')
    async syncSingleSheet(@Body() body: { sheetName: string }) {
        try {
            const { sheetName } = body;

            if (!sheetName) {
                throw new Error('sheetName is required');
            }

            const data = await this.sheetsService.fetchSheetDataAsObjects(sheetName);
            const count = await this.aiService.syncSheetDataToPinecone(data, sheetName);

            return {
                message: `Sheet ${sheetName} synchronized successfully`,
                recordCount: count,
            };
        } catch (error) {
            this.logger.error(`Failed to sync sheet: ${body.sheetName}`, error.message);
            throw error;
        }
    }

    /**
     * 동기화 상태 확인
     * GET /api/sync/status
     */
    @Get('status')
    async getStatus() {
        return {
            message: 'Sync service is running',
            timestamp: new Date().toISOString(),
        };
    }
}
