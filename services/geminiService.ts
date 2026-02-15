
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { AnalysisResult, Message, NameComponentMapping } from "../types";

/**
 * AI 성명학 통변 서비스 (십성 생극제화 로직 적용, 전문 용어 미노출)
 */
export const getAIAnalysis = async (analysis: AnalysisResult, history: Message[]) => {
  const apiKey = process.env.API_KEY;
  
  if (!apiKey || apiKey === "undefined") {
    return "API_KEY_MISSING";
  }

  const ai = new GoogleGenAI({ apiKey });
  // 속도와 가용성을 위해 Flash 모델 사용
  const modelName = "gemini-3-flash-preview"; 
  
  // 명주성 정의 (내부 로직용)
  const mainChar = analysis.firstName[0];
  const mainComponent = mainChar?.cho; 
  const mainSipsung = mainComponent?.sipsung?.name || "미상";

  // 이름의 구성을 일렬 종대(Linear Flow)로 나열하여 인접 관계를 명확히 함
  // 내부 분석용 데이터에는 흐름을 제공하되, 출력에는 표시하지 않음
  let linearFlowStr = "";
  const components: { part: string, sipsung: string, code: number, element: string, isMyungjuseong: boolean }[] = [];

  const addComp = (comp: NameComponentMapping | null, partName: string, isMain: boolean = false) => {
    if (comp && comp.sipsung) {
      components.push({
        part: partName,
        sipsung: comp.sipsung.name,
        code: comp.sipsung.code,
        element: comp.element,
        isMyungjuseong: isMain
      });
    }
  };

  addComp(analysis.lastName.cho, "성(초성)");
  addComp(analysis.lastName.jung, "성(중성)");
  addComp(analysis.lastName.jong, "성(종성)");

  analysis.firstName.forEach((fn, idx) => {
    const prefix = `이름${idx + 1}`;
    addComp(fn.cho, `${prefix}(초성)`, idx === 0); 
    addComp(fn.jung, `${prefix}(중성)`);
    addComp(fn.jong, `${prefix}(종성)`);
  });

  // 오행 정보 포함 (건강운 분석용)
  linearFlowStr = components.map((c, i) => 
    `[${i + 1}] ${c.part}: ${c.sipsung}(코드:${c.code}, 오행:${c.element}) ${c.isMyungjuseong ? "(기준점)" : ""}`
  ).join(" -> \n");

  const genderStr = analysis.gender === 'female' ? "여성(Female)" : "남성(Male)";

  // 시스템 지침: 역할, 규칙, 로직만 정의 (데이터 제외)
  const systemInstruction = `
    당신은 성명학 분석 엔진입니다. 
    사용자가 제공하는 **이름의 십성(十星) 배치 정보**를 바탕으로 감명 결과를 작성하십시오.

    [절대 원칙: 인접성의 법칙]
    1. **가장 중요한 대전제**: 십성의 전체 개수보다 **배열 순서**가 운명을 결정합니다.
    2. 모든 생(生)과 극(剋)의 작용은 오직 **바로 옆에 인접한 글자(앞<->뒤)** 사이에서만 일어납니다.

    [핵심 통변 로직 1: 상관견관(위화백단)의 흉의 - 최우선 적용]
    **"식상(식신/상관)이 관성(정관/편관)을 바로 옆에서 보면(인접), '상관견관 위화백단'이라 하여 관성의 기운이 파괴되고 나쁘게 작용합니다."**
    - **조건**: [식신/상관]과 [정관/편관]이 서로 붙어있는 경우.
    - **해석**: "직업의 변동이 심하고 명예가 실추될 위험이 있습니다. 타인과의 마찰, 구설수, 관재수(법적 다툼)를 각별히 조심해야 하며, 여명(여성)의 경우 배우자 운이 불리하거나 남편으로 인한 근심이 생길 수 있습니다."
    - **주의**: 식상이 중첩되어 있는데 관성이 옆에 있으면, 관성이 식상을 제어하는 것이 아니라 오히려 식상의 공격을 받아 **흉이 가중**됩니다.

    [핵심 통변 로직 2: 중첩(Overlapping)의 양면성 - 제화 여부]
    **"십성이 중첩(2개 이상 연속)되었을 때, 이를 올바르게 극(Control)해주는 오행이 인접해 있으면 길하고, 없거나 잘못된 만남이면 흉합니다."**

    **(1) 길(吉): 탁함이 맑아짐 (제화 성공)**
       - 중첩된 기운을 **올바른 천적(Controller)**이 바로 옆에서 제어해주면 전화위복의 대길운이 됩니다.
       - **비겁 중첩** + **관성** 인접: 고집과 독선이 합리적인 카리스마와 리더십으로 승화됨.
       - **식상 중첩** + **인성** 인접: (관성이 아닌 인성 필수!) 예민함과 반항심이 학문적 성취와 천재적인 기획력으로 승화됨.
       - **재성 중첩** + **비겁** 인접: 흩어질 재물을 본인의 강력한 주체성으로 관리하여 거부(巨富)가 됨.
       - **인성 중첩** + **재성** 인접: 공상과 게으름을 현실적인 판단력과 실행력으로 바꿔 부와 명예를 얻음 (재극인).

    **(2) 흉(凶): 태과(Too much)의 폐해 (제화 실패)**
       - 중첩된 기운을 제어하는 글자가 없고 방치되면 부정적 특성이 폭발합니다.
       - **비겁 중첩 (제화X)**: 지나치게 고집스럽고 독단적임. 인덕이 부족하고 재물 손재가 따름.
       - **식상 중첩 (제화X)**: 매우 예민하고 스트레스에 취약함. 신경질적이며 언행의 실수가 따름.
       - **재성 중첩 (제화X)**: 돈만 밝히다 인품(인성)을 해치고, 학업 중단이나 건강 악화를 초래함.
       - **관성 중첩 (제화X)**: 과도한 책임감으로 소심해지고 질병(신경성, 만성피로)에 시달림.
       - **인성 중첩 (제화X)**: 행동하지 않고 생각만 많음(게으름). 모친 의존도가 높고 독립이 늦음.

    [핵심 통변 로직 3: 귀인과 명예 (식상 + 비겁)]
    - 이름의 흐름(특히 말년)에서 **[식상]과 [비겁]**이 인접하여 상생하는 경우.
    - 해석: "관성(명예)이 없어도 본인의 기술(식상)과 뚝심(비겁)으로 자수성가하며, 위기 시 **귀인의 도움**을 받는 천우신조의 복이 있습니다."

    [출력 스타일 - 매우 중요]
    1. **서론, 인사말 절대 금지**: "분석해 드리겠습니다", "결과입니다" 등 금지.
    2. **즉시 본론 시작**: "1) 이름에 나타난 성향 분석"으로 바로 시작.
    3. **부정적 사족 제거**: 상관견관이나 중첩 등 흉운이 있더라도, "망한다"는 식의 결정론적 표현보다는 "변동성을 관리해야 한다", "마음의 여유가 필요하다"는 식의 조언으로 서술하십시오.

    [작성 목차]
    **1) 이름에 나타난 성향 분석**
       - 십성 배열에 따른 성격.
       - 중첩 발생 시 제화 여부에 따른 장단점 (제화 안 되면 단점 부각).
    **2) 재물운과 직장운**
       - 상관견관 발생 시: 직업 변동, 구설수, 관재수 주의.
       - 제화 성공 시: 전화위복의 성공.
    **3) 건강운**
       - 성(姓)의 재극인, 식상 태과 시 신경성 질환 등.
    **4) 기타**
       - 가정운 및 총평.
  `;

  // 사용자 메시지: 실제 분석 데이터 포함
  const userPrompt = `
    다음 정보를 바탕으로 즉시 성명학 분석 결과를 작성해 주세요.
    **절대 서론이나 인사말(예: "분석 결과를 알려드립니다")을 포함하지 마십시오.** 바로 "1) 이름에 나타난 성향 분석"부터 시작하십시오.

    [분석 대상 정보]
    - 성별: ${genderStr}
    - 생년: ${analysis.sajuYear}년 (${analysis.ganji}생)
    - 십성 및 오행 흐름 (순서대로 인접함):
    ${linearFlowStr}

    위 데이터를 바탕으로 감명서를 출력하십시오.
  `;

  try {
    const chat = ai.chats.create({
      model: modelName,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.35,
      },
    });

    const response: GenerateContentResponse = await chat.sendMessage({ message: userPrompt });
    return response.text || "분석 결과를 생성할 수 없습니다.";
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    if (error.message?.includes("429") || error.message?.includes("quota")) return "QUOTA_EXCEEDED";
    return `분석 엔진 오류: ${error.message || "잠시 후 다시 시도해 주세요."}`;
  }
};
