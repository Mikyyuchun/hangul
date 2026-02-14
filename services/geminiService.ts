
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { AnalysisResult, Message, NameComponentMapping } from "../types";

/**
 * 성명학 분석을 위한 AI 엔진 서비스
 */
export const getAIAnalysis = async (analysis: AnalysisResult, history: Message[]) => {
  // 환경 변수 또는 window.aistudio에서 제공하는 최신 키를 사용합니다.
  const apiKey = process.env.API_KEY;
  
  if (!apiKey || apiKey === "undefined") {
    return "API_KEY_MISSING";
  }

  // 할당량 문제를 해결하기 위해 더 가벼운 gemini-3-flash-preview 모델을 사용합니다.
  const ai = new GoogleGenAI({ apiKey });
  const modelName = "gemini-3-flash-preview"; 
  
  const flattened: NameComponentMapping[] = [];
  const addChar = (char: any) => {
    if (char.cho) flattened.push(char.cho);
    if (char.jung) flattened.push(char.jung);
    if (char.jong) flattened.push(char.jong);
  };

  addChar(analysis.lastName);
  analysis.firstName.forEach(addChar);

  const systemInstruction = `
    당신은 한글 성명학의 대가입니다. 제공된 데이터와 '인접 기운 중심 통변법'을 바탕으로 정밀 분석을 수행하세요.
    [가이드라인]
    1. 명주성(이름 첫 글자 초성)을 중심으로 삶의 근간을 해석하세요.
    2. 인접한 기운 간의 상생/상극/중첩을 분석하여 '제화(制化)' 여부를 판정하세요.
    3. 품격 있고 신뢰감 있는 문체로 답변하세요.
  `;

  try {
    const chat = ai.chats.create({
      model: modelName,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.7,
      },
    });

    const userPrompt = history.length > 1 
      ? history[history.length - 1].text 
      : `이름 '${analysis.lastName.char}${analysis.firstName.map(c => c.char).join('')}'(${analysis.year}년생)의 성명학적 분석을 시작해 주세요.`;

    const response: GenerateContentResponse = await chat.sendMessage({ message: userPrompt });
    return response.text || "분석 결과를 생성할 수 없습니다.";
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    
    // 할당량 초과 에러(429) 처리
    if (error.message?.includes("429") || error.message?.includes("quota") || error.message?.includes("RESOURCE_EXHAUSTED")) {
      return "QUOTA_EXCEEDED";
    }
    
    if (error.message?.includes("API_KEY_INVALID")) {
      return "API_KEY_INVALID";
    }
    
    return `분석 엔진 오류: ${error.message || "잠시 후 다시 시도해 주세요."}`;
  }
};
