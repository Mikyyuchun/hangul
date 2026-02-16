import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';
import { Pinecone } from '@pinecone-database/pinecone';
import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';

@Injectable()
export class AiService {
    private readonly logger = new Logger(AiService.name);
    private embeddings: GoogleGenerativeAIEmbeddings;
    private pinecone: Pinecone;
    private indexName: string;
    private genAI: GoogleGenerativeAI;
    private model: GenerativeModel;

    constructor(private configService: ConfigService) {
        // Gemini Embeddings 초기화
        this.embeddings = new GoogleGenerativeAIEmbeddings({
            apiKey: this.configService.get<string>('GEMINI_API_KEY') || '',
            model: 'models/gemini-embedding-001',
        });

        // Pinecone 초기화
        this.pinecone = new Pinecone({
            apiKey: this.configService.get<string>('PINECONE_API_KEY') || '',
        });
        this.indexName = this.configService.get<string>('PINECONE_INDEX') || 'namelogy-index';

        // Gemini GenAI 초기화 (답변 생성용)
        this.genAI = new GoogleGenerativeAI(this.configService.get<string>('GEMINI_API_KEY') || '');
        this.model = this.genAI.getGenerativeModel({
            model: 'gemini-pro',
            generationConfig: {
                temperature: 0.1, // Hallucination 방지를 위해 창의성 낮춤
                topP: 0.8,
                topK: 40,
            }
        });
    }

    /**
     * 텍스트를 벡터로 변환합니다.
     */
    async generateEmbedding(text: string): Promise<number[]> {
        try {
            const vector = await this.embeddings.embedQuery(text);
            return vector;
        } catch (error) {
            this.logger.error('Failed to generate embedding', error.message);
            throw error;
        }
    }

    /**
     * Pinecone에 벡터를 저장합니다.
     */
    async upsertToPinecone(vectors: any[]) {
        try {
            const index = this.pinecone.index(this.indexName);
            // Debug logging
            this.logger.log(`Upserting ${vectors.length} vectors.`);
            await index.upsert({ records: vectors } as any);
            this.logger.log(`Upserted ${vectors.length} vectors to Pinecone`);
        } catch (error) {
            console.error('Full Pinecone Error:', error);
            this.logger.error('Failed to upsert to Pinecone', JSON.stringify(error));
            throw error;
        }
    }

    /**
     * Pinecone에서 유사한 벡터를 검색합니다.
     */
    async searchSimilar(queryText: string, topK: number = 5) {
        try {
            const queryVector = await this.generateEmbedding(queryText);
            const index = this.pinecone.index(this.indexName);

            const results = await index.query({
                vector: queryVector,
                topK,
                includeMetadata: true,
            });

            return results.matches || [];
        } catch (error) {
            this.logger.error('Failed to search in Pinecone', error.message);
            throw error;
        }
    }

    /**
     * 구글 시트 데이터를 Pinecone에 동기화합니다.
     */
    async syncSheetDataToPinecone(sheetData: Array<Record<string, any>>, sheetName: string) {
        const vectors: any[] = [];

        for (let i = 0; i < sheetData.length; i++) {
            const row = sheetData[i];

            // 텍스트 필드를 결합하여 임베딩 생성
            const textToEmbed = Object.values(row).join(' ');

            if (!textToEmbed.trim()) continue;

            const embedding = await this.generateEmbedding(textToEmbed);

            vectors.push({
                id: `${sheetName}-${i}`,
                values: embedding,
                metadata: {
                    source: sheetName,
                    ...Object.fromEntries(
                        Object.entries(row).map(([k, v]) => [k, String(v)])
                    ),
                },
            });
        }

        if (vectors.length > 0) {
            await this.upsertToPinecone(vectors);
            this.logger.log(`Synced ${vectors.length} records from ${sheetName} to Pinecone`);
        }

        return vectors.length;
    }
}
