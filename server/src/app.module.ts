import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AiModule } from './ai/ai.module';
import { SheetsModule } from './sheets/sheets.module';
import { SyncController } from './sync/sync.controller';
import { EncryptionService } from './common/encryption.service';
import { HistoryModule } from './history/history.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    PrismaModule,
    AiModule,
    SheetsModule,
    HistoryModule,
  ],
  controllers: [AppController, SyncController],
  providers: [AppService, EncryptionService],
})
export class AppModule { }
