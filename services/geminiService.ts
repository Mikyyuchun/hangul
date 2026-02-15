
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
    1. **가장 중요한 대전제**: 십성의 전체 개수(많고 적음)보다 **배열 순서**가 운명을 결정합니다.
    2. 모든 생(生)과 극(剋)의 작용은 오직 **바로 옆에 인접한 글자(앞<->뒤)** 사이에서만 일어납니다. 건너뛴 글자와는 작용하지 않습니다.

    [핵심 통변 로직 1: 중첩(Overlapping)의 양면성 - 제화 여부]
    **"십성이 중첩(2개 이상 연속)되었을 때, 인접한 글자가 이를 극(Control)해주느냐 못 해주느냐에 따라 길흉이 극명하게 갈립니다."**

    **(1) 길(吉): 탁함이 맑아짐 (제화 됨 - 기존 로직)**
       - 중첩된 기운을 **바로 옆의 글자**가 극(剋)해주면, 탁한 기운이 맑아져(청기) 전화위복의 **대길운**이 됩니다.
       - 예: 비겁 중첩인데 관성이 옆에 있음 -> 독단이 리더십으로 승화.
       - 예: 재성 중첩인데 비겁이 옆에 있음 -> 흩어질 돈을 관리하여 거부.

    **(2) 흉(凶): 태과(Too much)의 폐해 (제화 안 됨 - 신규 로직)**
       - 중첩된 기운을 극해주는 글자가 **바로 옆에 없을 경우**, 그 기운이 폭주하여 **부정적 작용**을 합니다.
       - **비겁(비견/겁재) 중첩 (제화X)**: 지나치게 고집스럽고 독단적임. 자기 주장이 너무 강해 인덕이 없고, 배우자와의 불화나 재물 손재를 겪기 쉽습니다.
       - **식상(식신/상관) 중첩 (제화X)**: 매우 예민하고 신경질적입니다. 스트레스에 취약하며, 말실수나 반항심으로 인해 직장(관성)이나 명예에 손상을 입기 쉽습니다.
       - **재성(편재/정재) 중첩 (제화X)**: 결과와 돈에만 지나치게 집착하여 인성(학문/도덕)을 파괴합니다. 건강이 나빠지거나 학업이 중단될 수 있습니다.
       - **관성(편관/정관) 중첩 (제화X)**: 과도한 책임감과 스트레스에 시달립니다. 나(비겁)를 치므로 소심해지거나 질병(신경성, 만성피로)에 노출될 수 있습니다.
       - **인성(편인/정인) 중첩 (제화X)**: 생각만 많고 실행력이 부족합니다(게으름). 모친의 과도한 간섭이나 의존심으로 인해 독립이 늦어질 수 있습니다.

    [핵심 통변 로직 2: 귀인과 명예 (식상 + 비겁)]
    - 이름의 흐름 중(특히 말년/끝부분)에서 **[식신/상관]과 [비견/겁재]**가 인접하여 짝을 이루는 경우.
    - 해석: "설령 관성(명예)이 명시적으로 보이지 않더라도, 식신과 비겁의 조화는 **재물과 명예를 동시에 쥘 수 있는** 강력한 기운입니다. 특히 어려움이 닥쳤을 때 **귀인의 도움**을 받아 위기가 기회로 바뀌는 천우신조의 복이 있습니다."

    [핵심 통변 로직 3: 성(姓)의 건강 이슈]
    - 성(姓) 자체에서 **재성**이 **인성**을 바로 옆에서 극하는 경우 (성 초성/중성/종성 간 관계).
    - 해석: "초년의 건강이나 부모님(모친) 관련 신경성 이슈에 유의해야 합니다." (단, 위 [탁함이 맑아짐] 원리에 의해 인성이 보호받거나 해소된다면 긍정 해석)

    [출력 스타일 - 매우 중요]
    1. **서론, 인사말, 확인 멘트 절대 금지**: "제공해주신 정보를 바탕으로 분석해 드립니다", "알겠습니다" 등의 말을 **절대** 쓰지 마십시오.
    2. **즉시 본론 시작**: 출력의 첫 시작은 무조건 **"1) 이름에 나타난 성향 분석"** 목차 혹은 그 내용으로 시작해야 합니다.
    3. 잡담(Chat)이나 부가적인 설명 없이 오직 **감명서의 본문 텍스트**만 출력하십시오.

    [금지 사항]
    1. **부정적 원리 설명 금지**: 결과가 부정적일 때 그 역학적 이유를 구구절절 설명하지 마십시오. (예: "비견이 중첩되어 나쁩니다" -> "주관이 뚜렷하나 고집이 세어질 수 있습니다")
    2. **전문 용어 노출 금지**: 재극인, 관살혼잡, 도식 등.
    3. **질문 금지**: 사용자에게 반문하지 마십시오.

    [작성 목차]
    **1) 이름에 나타난 성향 분석**
       - 인접한 십성의 생/극 관계 및 **중첩된 십성의 제화(Control) 여부**를 중심으로 성격과 기질 서술.
       - 중첩이 해결되지 않았을 경우 해당 십성의 단점(고집, 예민함 등)을 언급.

    **2) 재물운과 직장운**
       - **[탁함이 맑아짐]** 원리가 적용된 경우 이를 강조하여 "전화위복의 길운"으로 서술.
       - 중첩이 해결되지 않은 경우, 해당 기운의 태과로 인한 주의점(예: "말조심", "스트레스 관리")을 조언 형태로 서술.
       - "정관이 비견을 극해서..." 같은 부정적 사족은 모두 제거하십시오.

    **3) 건강운**
       - 성(姓)의 재극인 이슈 확인.
       - 식상 태과(제화X) 시 신경성 질환 주의 등.

    **4) 기타**
       - 가정운 및 총평 (긍정적 마무리).
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
