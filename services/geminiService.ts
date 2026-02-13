import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { AnalysisResult, Message, NameComponentMapping } from "../types";
import { checkSipsungGeuk, checkSipsungSaeng, checkSipsungJungcheop } from "../utils/hangulUtils";

export const getAIAnalysis = async (analysis: AnalysisResult, history: Message[]) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const model = "gemini-3-pro-preview";
  
  // 모든 구성 요소를 순서대로 나열 (성 -> 이름1 -> 이름2 ...)
  const flattened: NameComponentMapping[] = [];
  const addChar = (char: any) => {
    if (char.cho) flattened.push(char.cho);
    if (char.jung) flattened.push(char.jung);
    if (char.jong) flattened.push(char.jong);
  };

  addChar(analysis.lastName);
  analysis.firstName.forEach(addChar);

  // 전체 구성 요소에 대한 인접 관계 분석 로직
  const componentStatuses = flattened.map((comp, idx) => {
    const code = comp.sipsung?.code ?? -1;
    if (code === -1) return null;

    const prev = idx > 0 ? flattened[idx - 1] : null;
    const next = idx < flattened.length - 1 ? flattened[idx + 1] : null;
    const prevCode = prev?.sipsung?.code ?? -1;
    const nextCode = next?.sipsung?.code ?? -1;

    // 1. 중첩 여부 확인 (동일 그룹)
    const isJungcheopPrev = prevCode !== -1 && checkSipsungJungcheop(prevCode, code);
    const isJungcheopNext = nextCode !== -1 && checkSipsungJungcheop(nextCode, code);
    const hasJungcheop = isJungcheopPrev || isJungcheopNext;

    // 2. 극(Geuk) 관계 확인
    // 내가 극을 받는가? (나를 제어하는가?)
    const isGeukedByPrev = prevCode !== -1 && checkSipsungGeuk(prevCode, code);
    const isGeukedByNext = nextCode !== -1 && checkSipsungGeuk(nextCode, code);
    const isGeuked = isGeukedByPrev || isGeukedByNext;

    // 내가 극을 하는가?
    const isGeukingPrev = prevCode !== -1 && checkSipsungGeuk(code, prevCode);
    const isGeukingNext = nextCode !== -1 && checkSipsungGeuk(code, nextCode);

    // 3. 상생 관계 확인
    const isSaengReceived = (prevCode !== -1 && checkSipsungSaeng(prevCode, code)) || (nextCode !== -1 && checkSipsungSaeng(nextCode, code));
    const isSaengGiving = (prevCode !== -1 && checkSipsungSaeng(code, prevCode)) || (nextCode !== -1 && checkSipsungSaeng(code, nextCode));

    /**
     * 길흉 판정 로직 (핵심):
     * - 중첩(Jungcheop)은 기본적으로 '태과(太過)'하여 흉(凶)이나, 
     * - 만약 인접한 글자가 그 중첩된 십성을 극(Geuk)하여 제어(制)한다면 다시 '길(吉)'로 본다. (제화 로직)
     * - 중첩이 없고 상생하거나, 적절한 극으로 균형을 이루면 길(吉).
     */
    let status = "평이";
    let detail = "";

    if (hasJungcheop) {
      if (isGeuked) {
        status = "길(吉) - 제화(制化)";
        detail = "십성이 중첩되어 기운이 강하나, 인접한 글자가 이를 적절히 제어하여 복록으로 변했습니다.";
      } else {
        status = "흉(凶) - 중첩/태과";
        detail = "동일한 기운이 겹쳐 인접해 있어 기운이 막히고 편중되었습니다.";
      }
    } else if (isGeuked) {
      status = "약함/흉(凶) - 상극";
      detail = "인접한 글자로부터 극(Attack)을 받아 기운이 억눌려 있습니다.";
    } else if (isSaengReceived || isSaengGiving) {
      status = "길(吉) - 상생";
      detail = "인접한 글자와 서로 생(Produce)하는 관계로 기운이 원활히 흐릅니다.";
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

  const formatComp = (comp: any) => {
    if (!comp) return "없음";
    return `${comp.symbol} (${comp.cheongan}${comp.jiji}, ${comp.element}, 십성:${comp.sipsung?.name || 'N/A'}(${comp.sipsung?.code || ''}))`;
  };

  const nameDetails = [analysis.lastName, ...analysis.firstName].map(char => {
    return `- ${char.char}: 
      초성: ${formatComp(char.cho)}
      중성: ${formatComp(char.jung)}
      종성: ${formatComp(char.jong)}`;
  }).join('\n');

  const systemInstruction = `
    당신은 한글 성명학 최고 전문가입니다. 제공된 정밀 인접 로직과 제화(制化) 분석 데이터를 바탕으로 운명을 풀이하세요.
    
    [통변의 핵심 원칙]
    1. 인접성 원칙: 십성의 길흉은 전체 개수가 아니라 **바로 옆에 붙어 있는 글자**와의 관계가 100% 결정합니다.
       - 예: [7, 6, 7] 구조에서 7과 7은 직접 인접하지 않으므로 '중첩'이 아니며, 각각 6과의 관계만 봅니다.
    2. 제화(制化) 로직: 
       - 중첩(Jungcheop)은 본래 흉(凶)한 태과 현상이나, **인접한 글자가 그 중첩된 글자를 극(Geuk)**하고 있다면, 이는 '넘치는 기운을 적절히 다스리는 것'이 되어 다시 **길(吉)**한 조건이 됩니다.
       - 반대로 중첩이 있는데 제어하는 극이 없다면 그 십성의 부정적인 면이 강하게 나타납니다.
    3. 명주성 우선: 이름 첫 글자의 초성(명주성)이 가장 중요하며, 나머지 글자들의 인접 관계도 명주성과 동일한 로직으로 풀이합니다.

    분석 데이터:
    - 생년: ${analysis.year}년 (${analysis.ganji}년생)
    - 성명 구조 분석:
    ${JSON.stringify(componentStatuses, null, 2)}
    
    상세 매핑 정보:
    ${nameDetails}
    
    [작성 가이드라인]
    - 먼저 명주성(Core)의 길흉을 인접 관계와 제화 로직으로 설명하세요.
    - 그 다음 이름 전체에 포진된 십성들의 인접 관계를 하나씩 짚으며, 중첩이 극에 의해 길로 변했는지 혹은 단순히 극을 받아 약해졌는지 상세히 통변하세요.
    - 품격 있고 신뢰감 있는 성명학자의 문체(마크다운 형식)를 사용하세요.
  `;

  try {
    const chat = ai.chats.create({
      model: model,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.75,
      },
    });

    const lastMessage = history.length > 0 ? history[history.length - 1].text : "내 이름의 명주성과 이름 전체 십성들의 제화(制化) 관계를 중심으로 상세히 통변해줘.";
    const response: GenerateContentResponse = await chat.sendMessage({ message: lastMessage });
    return response.text || "분석 결과를 생성할 수 없습니다.";
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return "죄송합니다. 성명학 분석 엔진에 일시적인 장애가 발생했습니다.";
  }
};