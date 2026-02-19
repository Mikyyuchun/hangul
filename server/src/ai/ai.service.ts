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

            // 명주성(이름 첫 글자 자음) 추출
            let myeongjuseong = '정보 없음';
            let myeongjuseongId = '';
            if (dto.analysis && dto.analysis.firstName && Array.isArray(dto.analysis.firstName) && dto.analysis.firstName.length > 0) {
                const firstChar = dto.analysis.firstName[0];
                if (firstChar.cho && firstChar.cho.sipsung) {
                    myeongjuseong = `${firstChar.cho.sipsung.name}(${firstChar.cho.sipsung.id})`;
                    myeongjuseongId = firstChar.cho.sipsung.id;
                }
            }

            // 2. Pinecone에서 관련 지식 검색 (카테고리별)
            // 2-1. 명주성 조건 검색
            const myeongjuseongQuery = `명주성 ${myeongjuseong} 조건`;
            const myeongjuseongMatches = await this.searchSimilar(myeongjuseongQuery, 8);

            // 2-2. 통변 규칙 검색
            const theoryQuery = `성명학 통변규칙 ${dto.gender === 'female' ? '여성' : '남성'} ${dto.ganji}생 ${analysisText}`;
            const theoryMatches = await this.searchSimilar(theoryQuery, 8);

            // 2-3. [NEW] 실제 상담 사례(Case Study) 검색 - 통변 로직 학습용
            // 명주성과 주요 십성 패턴을 기반으로 검색
            const caseStudyQuery = `Case Study 명주성 ${myeongjuseong} ${analysisText} 통변 방법`;
            const caseStudyMatches = await this.searchSimilar(caseStudyQuery, 5);

            // 3. 검색 결과를 소스별로 분류
            const allMatches = [...myeongjuseongMatches, ...theoryMatches, ...caseStudyMatches];

            // theory_basic 규칙 추출
            const theoryRules = allMatches
                .filter((match: any) => match.metadata?.source === 'theory_basic')
                .map((match: any) => {
                    const m = match.metadata || {};
                    return `${m.Subcategory || ''}
${m.Content || ''}`;
                })
                .join('\n\n');

            // interpretation_rules 규칙 추출 (명주성 관련)
            const interpretationRules = allMatches
                .filter((match: any) =>
                    match.metadata?.source === 'interpretation_rules' &&
                    match.metadata?.Condition_Code?.includes('명주성')
                )
                .map((match: any) => {
                    const m = match.metadata || {};
                    return `${m.Title || ''}
설명: ${m.Description || ''}
해석: ${m.Interpretation || ''}
조언: ${m.Advice || ''}`;
                })
                .join('\n\n');

            // [NEW] case_studies 통변 로직 추출
            // 가장 유사도가 높은 상위 2개 케이스의 통변 방법(Interpretation_method)만 참조
            const caseStudyLogic = caseStudyMatches
                .filter((match: any) => match.metadata?.source === 'case_studies')
                .slice(0, 2)
                .map((match: any, index: number) => {
                    const m = match.metadata || {};
                    return `[참고 사례 ${index + 1}: ${m.Title || '제목 없음'}]
- 명주성/십성패턴: ${m.Sipsung_Pattern || ''}
- 통변 로직(분석 방법):
${m.Interpretation_method || ''}`;
                })
                .join('\n\n');

            // 기타 참고 자료
            const otherReferences = allMatches
                .filter((match: any) =>
                    match.metadata?.source !== 'theory_basic' &&
                    match.metadata?.source !== 'interpretation_rules' &&
                    match.metadata?.source !== 'case_studies'
                )
                .map((match: any) => {
                    const metadata = match.metadata || {};
                    return Object.entries(metadata)
                        .filter(([key]) => key !== 'source')
                        .map(([key, value]) => `${key}: ${value}`)
                        .join('\n');
                })
                .join('\n\n');

            // 4. AI 프롬프트 구성
            const model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
            const prompt = `당신은 대한민국 최고의 성명학 전문가입니다.
아래 제공된 [분석 대상 정보]와 [전문가 통변 로직(Case Study)]을 철저히 학습하여 정밀한 성명학 분석 보고서를 작성하세요.

[분석 대상 정보]
- 이름: ${dto.name}
- 생년월일: ${dto.birthDate}
- 성별: ${dto.gender === 'female' ? '여성' : '남성'}
- 사주년도: ${dto.sajuYear}년 (${dto.ganji}생)
- 명주성(이름의 핵심 기준): ${myeongjuseong}
- 전체 십성 분석: ${analysisText}

[필수 준수 규칙 1: 성명학 통변규칙]
${theoryRules || '(검색된 통변규칙 없음)'}

[필수 준수 규칙 2: 명주성 분석 규칙]
${interpretationRules || '(검색된 명주성 규칙 없음)'}

[전문가 통변 로직 참고 (Case Study 습득)]
**매우 중요**: 아래 사례들은 실제 전문가가 분석한 "모범 답안"의 논리 구조입니다. 이 논리 흐름(Flow)을 그대로 모방하여 이번 분석에 적용하세요.
${caseStudyLogic || '(유사한 Case Study가 없어 일반 로직을 따릅니다)'}

${otherReferences ? `[추가 참고 자료]\n${otherReferences}\n` : ''}

[성명학 분석 프로세스 (Case Study 기반)]
1. **명주성 파악**: 이름의 첫 자음(명주성)이 십성 중 무엇인지 확인하고, 그 기본적인 성향(지혜, 관록, 재물 등)을 먼저 정의하세요.
2. **명주성의 상태 분석 (중첩/혼잡)**:
   - 명주성과 위/아래 글자(성 초성, 이름 중/종성 등)와의 관계를 살피세요.
   - 같은 십성이 과도하게 중첩되었는지 확인하세요.
3. **극제(剋制) 여부 확인**:
   - 중첩된 흉한 기운을 제어해주는 십성(예: 식신을 극하는 인성, 관성을 생하는 재성 등)이 주변에 있는지 확인하세요.
   - 극제하는 기운이 있다면 "탁함이 맑아져 전화위복이 됨"으로 해석하고, 없다면 "해당 십성의 단점이 발현됨"으로 해석하세요.
4. **재성/관성 분석**:
   - 재물운(재성)과 직업/명예운(관성)이 살아있는지, 파괴되었는지(극을 받는지) 분석하세요.
5. **건강운(인성) 및 총평**:
   - 인성의 유무와 상태를 통해 건강과 문서운을 판단하고 종합적인 조언을 하세요.

[작성 요청 항목]
서론 없이 바로 다음 항목을 분석하세요:
1. **성격 및 기질 분석** (명주성 중심)
2. **재물운과 직업운** (재성/관성 중심)
3. **건강운** (인성 중심)
4. **가정 및 총평**

**주의사항**:
- "Case Study에 따르면" 같은 말은 절대 쓰지 마세요. 당신의 직관적인 통찰인 것처럼 자연스럽게 서술하세요.
- 전문 용어(십성, 극제)를 괄호 안에 병기하여 독자의 이해를 돕되, 설명조보다는 해석 위주로 작성하세요.`;

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
