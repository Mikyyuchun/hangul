
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { AnalysisResult, Message, NameComponentMapping } from "../types";
import { checkSipsungGeuk, checkSipsungSaeng, checkSipsungJungcheop } from "../utils/hangulUtils";

/**
 * 성명학 분석을 위한 AI 엔진 서비스
 */
export const getAIAnalysis = async (analysis: AnalysisResult, history: Message[]) => {
  // 브라우저 환경에서 API_KEY를 안전하게 가져옵니다.
  const apiKey = typeof process !== 'undefined' ? process.env.API_KEY : '';
  
  if (!apiKey) {
    return "시스템 설정 오류: API 키가 누락되었습니다. Vercel 환경 변수 설정을 확인해 주세요.";
  }

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

  const componentStatuses = flattened.map((comp, idx) => {
    const code = comp.sipsung?.code ?? -1;
    if (code === -1) return null;

    const prev = idx > 0 ? flattened[idx - 1] : null;
    const next = idx < flattened.length - 1 ? flattened[idx + 1] : null;
    const prevCode = prev?.sipsung?.code ?? -1;
    const nextCode = next?.sipsung?.code ?? -1;

    const isJungcheopPrev = prevCode !== -1 && checkSipsungJungcheop(prevCode, code);
    const isJungcheopNext = nextCode !== -1 && checkSipsungJungcheop(nextCode, code);
    const hasJungcheop = isJungcheopPrev || isJungcheopNext;

    const isGeukedByPrev = prevCode !== -1 && checkSipsungGeuk(prevCode, code);
    const isGeukedByNext = nextCode !== -1 && checkSipsungGeuk(nextCode, code);
    const hasGeukControl = isGeukedByPrev || isGeukedByNext;

    let status = "평이";
    let detail = "";

    if (hasJungcheop) {
      if (hasGeukControl) {
        status = "길(吉) - 제화(制化)";
        detail = "유사한 십성 기운이 중첩되어 태과한 상태이나, 인접 글자가 이를 적절히 극(제어)하여 흉이 복으로 승화되었습니다.";
      } else {
        status = "흉(凶) - 중첩";
        detail = "유사한 기운이 인접하여 기세가 한쪽으로 치우쳤으며, 이를 다스릴 제어 기운이 부족하여 편중되었습니다.";
      }
    } else if (hasGeukControl) {
      status = "주의/억제";
      detail = "인접한 글자로부터 직접적인 극을 받아 기운이 다소 위축되었습니다.";
    } else {
      const isSaeng = (prevCode !== -1 && (checkSipsungSaeng(prevCode, code) || checkSipsungSaeng(code, prevCode))) ||
                      (nextCode !== -1 && (checkSipsungSaeng(nextCode, code) || checkSipsungSaeng(code, nextCode)));
      if (isSaeng) {
        status = "길(吉) - 상생";
        detail = "인접 요소와 상생의 흐름을 이루어 기운이 원활하게 순환합니다.";
      }
    }

    return {
      symbol: comp.symbol,
      name: comp.sipsung?.name,
      code,
      status,
      detail,
      isMyung: comp === analysis.firstName[0].cho
    };
  }).filter(Boolean);

  const systemInstruction = `
    당신은 한글 성명학의 대가입니다. 제공된 데이터와 '인접 기운 중심 통변법'을 바탕으로 정밀 분석을 수행하세요.
    
    [핵심 통변 원칙]
    1. 명주성(Core) 우선 분석: 이름 첫 글자의 초성을 삶의 중심 기운으로 보고 가장 먼저 해석하세요.
    2. 유사 기운 중첩: 십성 코드가 달라도 같은 그룹(1-2:비겁, 3-4:식상, 5-6:재성, 7-8:관성, 9-0:인성)이 인접하면 중첩으로 판정합니다.
    3. 제화(制化) 판정: 중첩(흉)이 발생했더라도, 인접한 다른 글자가 그 중첩된 기운을 극(Geuk)하고 있다면 넘치는 기운이 다스려지는 '제화'가 일어나 오히려 길한 명조가 됩니다.
    4. 분석 대상: 오직 바로 인접한 글자 사이의 관계만 고려하세요.

    분석 대상 이름: ${analysis.lastName.char}${analysis.firstName.map(f => f.char).join('')} (${analysis.year}년 ${analysis.ganji}년생)
    데이터 분석 결과: ${JSON.stringify(componentStatuses)}
    
    위 데이터를 기반으로 명주성의 상태와 이름 전체의 기운 흐름을 전문적이고 품격 있게 설명하세요.
  `;

  try {
    const chat = ai.chats.create({
      model: modelName,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.8,
      },
    });

    const userPrompt = history.length > 0 ? history[history.length - 1].text : "성명학적 관점에서 제 이름의 명주성과 제화 관계를 포함한 정밀 통변을 부탁드립니다.";
    
    const response: GenerateContentResponse = await chat.sendMessage({ message: userPrompt });
    return response.text || "운세를 읽어내는 중 오류가 발생했습니다.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "현재 서비스 이용자가 많아 분석이 지연되고 있습니다. 잠시 후 다시 시도해 주세요.";
  }
};
