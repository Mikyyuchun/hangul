import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google } from 'googleapis';

@Injectable()
export class SheetsService {
    private readonly logger = new Logger(SheetsService.name);
    private sheets;

    constructor(private configService: ConfigService) {
        const auth = new google.auth.GoogleAuth({
            credentials: {
                client_email: this.configService.get<string>('GOOGLE_SERVICE_ACCOUNT_EMAIL'),
                private_key: this.configService.get<string>('GOOGLE_PRIVATE_KEY')?.replace(/\\n/g, '\n'),
            },
            scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
        });

        this.sheets = google.sheets({ version: 'v4', auth });
    }

    /**
     * 구글 시트에서 데이터를 읽어옵니다.
     * @param sheetName 시트 이름 (예: 'theory_basic', 'interpretation_rules')
     * @returns 2차원 배열 형태의 데이터
     */
    async fetchSheetData(sheetName: string): Promise<any[][]> {
        try {
            const spreadsheetId = this.configService.get<string>('GOOGLE_SHEETS_ID');

            const response = await this.sheets.spreadsheets.values.get({
                spreadsheetId,
                range: `${sheetName}!A:Z`, // A부터 Z열까지 모든 행 읽기
            });

            const rows = response.data.values || [];
            this.logger.log(`Fetched ${rows.length} rows from sheet: ${sheetName}`);
            return rows;
        } catch (error) {
            this.logger.error(`Failed to fetch data from sheet: ${sheetName}`, error.message);
            throw error;
        }
    }

    /**
     * 시트 데이터를 객체 배열로 변환합니다.
     * @param sheetName 시트 이름
     * @returns 헤더를 키로 하는 객체 배열
     */
    async fetchSheetDataAsObjects(sheetName: string): Promise<Record<string, any>[]> {
        const rows = await this.fetchSheetData(sheetName);

        if (rows.length === 0) {
            return [];
        }

        const [headers, ...dataRows] = rows;

        return dataRows.map(row => {
            const obj: Record<string, any> = {};
            headers.forEach((header, index) => {
                obj[header] = row[index] || '';
            });
            return obj;
        });
    }
}
