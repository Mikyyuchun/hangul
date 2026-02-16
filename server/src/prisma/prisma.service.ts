import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
    constructor() {
        super({});
    }

    async onModuleInit() {
        try {
            await this.$connect();
        } catch (error) {
            console.warn('Warning: Failed to connect to database. AI features will work, but history saving may fail.', error.message);
        }
    }

    async onModuleDestroy() {
        await this.$disconnect();
    }
}
