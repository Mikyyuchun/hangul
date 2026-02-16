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
            apiKey: process.env.PINECONE_API_KEY?.trim() || '',
        });
        this.indexName = process.env.PINECONE_INDEX?.trim() || 'namelogy-index';

        // Gemini GenAI 초기화 (답변 생성용)
        this.genAI = new GoogleGenerativeAI(this.configService.get<string>('GEMINI_API_KEY') || '');
        this.model = this.genAI.getGenerativeModel({
            model: 'gemini-2.5-flash',
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

    /**
     * 지식 베이스를 활용한 성명학 분석
     * 프론트엔드에서 계산한 십성 데이터를 받아 Pinecone 검색 후 AI 분석 수행
     */
    async analyzeWithKnowledgeBase(dto: any): Promise<string> {
        try {
            // 1. 십성 분석 데이터를 텍스트로 변환
            const analysisText = this.convertAnalysisToText(dto.analysis);

            // 2. Pinecone에서 관련 지식 검색
            const searchQuery = `${dto.gender === 'female' ? '여성' : '남성'} ${dto.ganji}생 ${analysisText}`;
            const relevantKnowledge = await this.searchSimilar(searchQuery, 10);

            // 3. 검색된 지식을 컨텍스트로 구성
            const context = relevantKnowledge
                .map((match: any, idx: number) => {
                    const metadata = match.metadata || {};
                    return `[참고자료 ${idx + 1}]\n${Object.entries(metadata)
                        .filter(([key]) => key !== 'source')
                        .map(([key, value]) => `${key}: ${value}`)
                        .join('\n')}`;
                })
                .join('\n\n');

            // 명주성(이름 첫 글자 자음) 추출
            let myeongjuseong = '정보 없음';
            if (dto.analysis && dto.analysis.firstName && Array.isArray(dto.analysis.firstName) && dto.analysis.firstName.length > 0) {
                const firstChar = dto.analysis.firstName[0];
                if (firstChar.cho && firstChar.cho.sipsung) {
                    myeongjuseong = `${firstChar.cho.sipsung.name}(${firstChar.cho.sipsung.id})`;
                }
            }

            // 4. AI 프롬프트 구성
            const model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
            const prompt = `당신은 대한민국 최고의 성명학 전문가입니다.
아래 제공된 [분석 대상 정보]와 [성명학 지식 베이스]를 바탕으로 정밀한 성명학 분석 보고서를 작성하세요.

[분석 대상 정보]
- 이름: ${dto.name}
- 생년월일: ${dto.birthDate}
- 성별: ${dto.gender === 'female' ? '여성' : '남성'}
- 사주년도: ${dto.sajuYear}년 (${dto.ganji}생)
- 명주성(이름의 핵심 기준): ${myeongjuseong}
- 전체 십성 분석: ${analysisText}

[성명학 지식 베이스 (참고 자료)]
${context}

[성명학 분석 원칙 (반드시 준수)]
1. **명주성(이름 첫 자음) 중심 분석**:
   - 성격과 기질 분석 시, **'명주성'**이 길한 십성(식신, 정재, 편재, 정관, 정인 등)인지 흉한 십성(상관, 편관, 겁재 등)인지에 따라 기본 성향을 판단해야 합니다.
   - 명주성이 길성이라면 긍정적인 기질이, 흉성이라면 다소 강하거나 주의가 필요한 기질이 기본이 됩니다. (단, 흉성이라도 제화되면 긍정적임)

2. **중첩과 극제(剋制)의 원리**:
   - 같은 십성이 2개 이상 **중첩**되면 그 기운이 탁해지거나 과도해져 부정적으로 발현될 수 있습니다.
   - **핵심 예외**: 그러나 다른 십성이 이 중첩된 기운을 **극(剋)**하여 제어해준다면, 그 기운은 맑아지고(淸) 오히려 긍정적이고 강력한 장점으로 승화됩니다.
   - 예시: '겁재'가 중첩되어 독단적일 수 있으나, '관성'이 이를 극해주면 강력한 리더십과 추진력이 됩니다. '상관'이 중첩되면 반항적일 수 있으나, '인성'이 극해주면 천재적인 창의성과 표현력이 됩니다.
   - **분석 시 이 '극제를 통한 정화' 로직을 반드시 적용하여, 단점을 장점으로 승화시키는 통변을 하세요.**

3. **분석 어조**: 명확하고 전문적이며, 내담자에게 신뢰를 주는 정중한 어조를 사용하세요. 결론은 희망적이고 건설적인 조언으로 마무리하세요.

[작성 요청 항목]
서론 없이 바로 다음 항목을 분석하세요:
1. **성격 및 기질 분석** (명주성 위주 + 중첩/극제 로직 적용)
2. **재물운과 직업운**
3. **건강운**
4. **가정 및 총평**`;

            // 5. Gemini로 최종 분석 생성
            const result = await model.generateContent(prompt);
            const response = await result.response;
            return response.text();

        } catch (error) {
            this.logger.error('Failed to analyze with knowledge base', error);
            throw new Error(`분석 중 오류가 발생했습니다: ${error.message}`);
        }
    }

    /**
     * 프론트엔드 분석 데이터를 텍스트로 변환
     */
    private convertAnalysisToText(analysis: any): string {
        const parts: string[] = [];

        // 성(lastName) 분석
        if (analysis.lastName) {
            const ln = analysis.lastName;
            if (ln.cho?.sipsung) parts.push(`성 초성: ${ln.cho.sipsung.name}`);
            if (ln.jung?.sipsung) parts.push(`성 중성: ${ln.jung.sipsung.name}`);
            if (ln.jong?.sipsung) parts.push(`성 종성: ${ln.jong.sipsung.name}`);
        }

        // 이름(firstName) 분석
        if (analysis.firstName && Array.isArray(analysis.firstName)) {
            analysis.firstName.forEach((fn: any, idx: number) => {
                if (fn.cho?.sipsung) parts.push(`이름${idx + 1} 초성: ${fn.cho.sipsung.name}`);
                if (fn.jung?.sipsung) parts.push(`이름${idx + 1} 중성: ${fn.jung.sipsung.name}`);
                if (fn.jong?.sipsung) parts.push(`이름${idx + 1} 종성: ${fn.jong.sipsung.name}`);
            });
        }

        return parts.join(', ');
    }
}
