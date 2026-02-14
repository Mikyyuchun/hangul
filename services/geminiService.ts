
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { AnalysisResult, Message, NameComponentMapping } from "../types";
import { checkSipsungGeuk, checkSipsungSaeng, checkSipsungJungcheop } from "../utils/hangulUtils";

/**
 * 성명학 분석을 위한 AI 엔진 서비스
 */
export const getAIAnalysis = async (analysis: AnalysisResult, history: Message[]) => {
  // 최신 키를 가져오기 위해 호출 시점에 process.env.API_KEY 참조
  const apiKey = process.env.API_KEY;
  
  if (!apiKey || apiKey === "undefined") {
    return "시스템 안내: API 키가 등록되지 않았습니다. 상단 메뉴의 'API 설정' 버튼을 눌러 본인의 Gemini 키를 선택해 주시거나, 결제 문서(Billing Guide)를 확인해 주세요.";
  }

  // 매 호출마다 새로운 인스턴스를 생성하여 주입된 키가 반영되도록 함
  const ai = new GoogleGenAI({ apiKey });
  const modelName = "gemini-3-pro-preview"; 
  
  const flattened: NameComponentMapping[] = [];
  const addChar = (char: any) => {
    if (char.cho) flattened.push(char.cho);
    if (char.jung) flattened.push(char.jung);
    if (char.jong) flattened.push(char.jong);
  };

  addChar(analysis.lastName);
  analysis.firstName.forEach(addChar);

  // 성명 구성 데이터 기반 통변 시스템 프롬프트 구성
  const systemInstruction = `
    당신은 한글 성명학의 대가입니다. 제공된 데이터와 '인접 기운 중심 통변법'을 바탕으로 정밀 분석을 수행하세요.
    
    [핵심 가이드라인]
    1. 명주성(Core) 우선 분석: 이름 첫 글자의 초성을 삶의 중심 기운으로 보고 가장 먼저 해석하세요.
    2. 제화(制化) 판정: 중첩(흉)이 발생했더라도, 인접한 글자가 그 기운을 극(Geuk)하고 있다면 '제화'가 일어나 길한 명조가 됩니다.
    3. 품격 있는 문체: 고전의 깊이와 현대적 해석을 조화시킨 전문적인 통변 문체를 사용하세요.
    4. 반드시 현재의 이름 구성표 데이터를 기반으로 논리적으로 설명하세요.
  `;

  try {
    const chat = ai.chats.create({
      model: modelName,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.8,
      },
    });

    const userPrompt = history.length > 1 ? history[history.length - 1].text : `이름 '${analysis.lastName.char}${analysis.firstName.map(c => c.char).join('')}'(${analysis.year}년생)에 대한 종합 통변을 요청합니다.`;
    const response: GenerateContentResponse = await chat.sendMessage({ message: userPrompt });
    return response.text || "결과를 읽어오는 데 실패했습니다.";
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    if (error.message?.includes("entity was not found") || error.message?.includes("API_KEY_INVALID")) {
      return "오류: 유효한 API 키가 아니거나 프로젝트 설정에 문제가 있습니다. 상단 'API 설정' 메뉴를 통해 키를 다시 선택해 주세요.";
    }
    return `분석 엔진 오류: ${error.message || "잠시 후 다시 시도해 주세요."}`;
  }
};
