// Backend API 서비스
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://server-3sgm7iyx0-hanmays-projects.vercel.app/api';

export interface AIAnalysisRequest {
    name: string;
    birthDate: string;
    gender: 'male' | 'female';
    sajuYear: number;
    ganji: string;
    analysis: any; // AnalysisResult 타입
}

export interface AIAnalysisResponse {
    analysis: string;
    sources?: Array<{
        content: string;
        metadata: any;
    }>;
}

/**
 * 백엔드 AI RAG 시스템을 통한 성명학 분석
 * Google Sheets + Pinecone 지식 베이스 활용
 */
export const getBackendAIAnalysis = async (request: AIAnalysisRequest): Promise<string> => {
    try {
        const response = await fetch(`${API_BASE_URL}/ai/analyze`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(request),
        });

        if (!response.ok) {
            throw new Error(`Backend API error: ${response.status}`);
        }

        const data: AIAnalysisResponse = await response.json();
        return data.analysis;
    } catch (error: any) {
        console.error('Backend API Error:', error);
        throw new Error(`백엔드 연결 실패: ${error.message}`);
    }
};

/**
 * 사용자 히스토리 저장 (암호화됨)
 */
export const saveHistory = async (historyData: {
    userId: string;
    targetName: string;
    birthDate: string;
    gender: string;
    sajuGanji: string;
    aiResponse: string;
}) => {
    try {
        const response = await fetch(`${API_BASE_URL}/api/history`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(historyData),
        });

        if (!response.ok) {
            throw new Error(`Failed to save history: ${response.status}`);
        }

        return await response.json();
    } catch (error: any) {
        console.error('Save history error:', error);
        // 히스토리 저장 실패는 치명적이지 않으므로 조용히 처리
        return null;
    }
};

/**
 * 동기화 상태 확인
 */
export const getSyncStatus = async () => {
    try {
        const response = await fetch(`${API_BASE_URL}/sync/status`);
        if (!response.ok) {
            throw new Error(`Failed to get sync status: ${response.status}`);
        }
        return await response.json();
    } catch (error: any) {
        console.error('Sync status error:', error);
        return null;
    }
};
