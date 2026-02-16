import { Module } from '@nestjs/common';
import { HistoryController } from './history.controller';
import { HistoryService } from './history.service';
import { EncryptionService } from '../common/encryption.service';
import { AiModule } from '../ai/ai.module';

@Module({
    imports: [AiModule],
    controllers: [HistoryController],
    providers: [HistoryService, EncryptionService],
    exports: [HistoryService],
})
export class HistoryModule { }
