import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { HistoryService } from './history.service';

@Controller('api/history')
export class HistoryController {
    constructor(private readonly historyService: HistoryService) { }

    @Post()
    async create(@Body() body: {
        userId: string;
        targetName: string;
        birthDate: string;
        gender: string;
        sajuGanji: string;
    }) {
        return this.historyService.createHistory(body);
    }

    @Get(':id')
    async findOne(@Param('id') id: string) {
        return this.historyService.getHistory(id);
    }

    @Get()
    async findAll(@Query('userId') userId: string) {
        return this.historyService.getUserHistories(userId);
    }
}
