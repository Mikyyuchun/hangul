
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { AnalysisResult, Message } from "../types";

/**
 * AI 성명학 통변 서비스 (고정 목차 및 고급 통변 스킬 적용)
 */
export const getAIAnalysis = async (analysis: AnalysisResult, history: Message[]) => {
  const apiKey = process.env.API_KEY;
  
  if (!apiKey || apiKey === "undefined") {
    return "API_KEY_MISSING";
  }

  const ai = new GoogleGenAI({ apiKey });
  const modelName = "gemini-3-pro-preview"; 
  
  // 명주성 정의: 이름 첫 글자의 '초성(자음)'
  const mainChar = analysis.firstName[0];
  const mainComponent = mainChar?.cho; 
  const mainSipsung = mainComponent?.sipsung?.name || "미상";
  const mainElement = mainComponent?.element || "미상";

  const systemInstruction = `
    당신은 대한민국 최고의 성명학 대가입니다. 
    제공된 이름의 구성 요소를 분석하여, 다음 **4가지 고정 목차**에 맞춰 전문적이고 깊이 있는 감명서를 작성하십시오.
    서론(인사말)은 생략하고 바로 첫 번째 목차부터 시작하십시오.

    [입력 정보]
    - 이름: ${analysis.lastName.char}${analysis.firstName.map(f => f.char).join('')}
    - 생년: ${analysis.year}년 (${analysis.ganji}생)
    - 상세 십성 배치: ${JSON.stringify(analysis)}
    - 명주성(중심 기운): ${mainSipsung} (${mainElement})

    [작성 목차 및 포함되어야 할 고급 통변 스킬]

    **1) 이름에 나타난 성향 분석**
       - **명주성(${mainSipsung})의 고유 기질**을 중심으로 분석하십시오.
       - 주변 글자와의 관계보다는 명주성 자체가 가진 사회적 성격, 내면의 심리, 대인관계 스타일을 명확하게 서술하십시오.
       - 예: 정관(원칙/신용), 편관(리더십/의협심), 식신(창의/포용), 인성(지혜/직관) 등.

    **2) 재물운과 직장운**
       - 이 항목에 **특수 배합 로직**을 반드시 포함하여 서술하십시오.
       - **[고급 스킬 A: 부동산/상속]**: 이름 내에 **관성(7,8)과 비겁(1,2)이 만나는 배치**가 있다면, "숨겨진 재물이 있고 부동산이나 상속의 기운이 강한 알짜배기 부자 유형"임을 강조하십시오.
       - **[고급 스킬 B: 손재수]**: **비겁(1,2)이 재성(5,6)을 극하는 배치**가 있다면, "군비쟁재의 형국으로 돈이 모이면 나가는 일이 잦고, 투자나 보증에 유의해야 함"을 경고하십시오.
       - **[일반]**: 위 특수 조건이 없다면 식상생재(성실함으로 버는 돈) 여부나 직장(관성)의 안정을 논하십시오.

    **3) 건강운**
       - 성명학에서 **식신/상관(3,4)**은 수명성과 건강을 나타냅니다.
       - 식상이 인성(9,0)에 의해 극을 당하거나(도식), 너무 미약하면 소화기 계통이나 신경성 질환, 정신적 스트레스를 주의하라고 조언하십시오.
       - 오행이 한쪽으로 치우친 경우(예: 화기가 너무 강함) 해당 장기의 건강 유의점을 언급하십시오.

    **4) 기타**
       - 부모운, 자식운, 배우자운 등 가정적인 부분과 인생의 전반적인 조언을 기술하십시오.
       - 남성의 경우 재성(처)의 안위를, 여성의 경우 관성(남편)의 안위를 십성의 생극제화로 판단하여 한 줄 평을 남기십시오.
       - 마지막으로 긍정적인 마음가짐을 위한 짧은 조언으로 마무리하십시오.
  `;

  try {
    const chat = ai.chats.create({
      model: modelName,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.35,
      },
    });

    const response: GenerateContentResponse = await chat.sendMessage({ message: "위의 4가지 고정 목차(성향, 재물/직장, 건강, 기타)에 맞춰 정밀 통변해 주세요." });
    return response.text || "분석 결과를 생성할 수 없습니다.";
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    if (error.message?.includes("429") || error.message?.includes("quota")) return "QUOTA_EXCEEDED";
    return `분석 엔진 오류: ${error.message || "잠시 후 다시 시도해 주세요."}`;
  }
};
