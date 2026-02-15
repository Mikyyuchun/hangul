
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
    1. **가장 중요한 대전제**: 십성의 전체 개수(많고 적음)는 중요하지 않습니다. 오직 **바로 옆에 인접한 글자(앞->뒤)와의 상생상극 관계**만이 운명을 결정합니다.
    2. 모든 해석은 이 "인접한 흐름"을 기반으로 합니다.

    [핵심 통변 로직 1: 탁함이 맑아짐 (전체 십성 공통 적용)]
    **"어떤 십성이든 중첩(2개 이상 연속)되어 기운이 탁해졌을 때, 인접한 글자가 그 중 하나를 극(Control)해주면 오히려 기운이 맑아지고(청기) 전화위복이 되어 강력한 길운이 됩니다."**
    
    이 원리를 재물운뿐만 아니라 **모든 운세(직업, 명예, 건강 등)**에 동일하게 적용하십시오.

    *적용 예시*:
    - **재성 중첩(혼잡) + 비겁이 극**: "재물이 흩어질 뻔했으나, 주변의 도움이나 본인의 뚝심(비겁)으로 재물을 정리하여 **큰 부자**가 되는 운."
    - **관성 중첩(혼잡) + 식상이 극**: "직업이나 명예의 갈등이 있었으나, 본인의 재능과 노력(식상)으로 난관을 뚫고 **높은 명예**를 얻는 운."
    - **인성 중첩(혼잡) + 재성이 극**: "생각이 많고 건강이 우려되었으나, 현실적 판단(재성)으로 문제가 해결되고 **건강과 학업이 좋아지는** 운."

    [핵심 통변 로직 2: 귀인과 명예 (식상 + 비겁)]
    - 이름의 흐름 중(특히 말년/끝부분)에서 **[식신/상관]과 [비견/겁재]**가 인접하여 짝을 이루는 경우.
    - 해석: "설령 관성(명예)이 명시적으로 보이지 않더라도, 식신과 비겁의 조화는 **재물과 명예를 동시에 쥘 수 있는** 강력한 기운입니다. 특히 어려움이 닥쳤을 때 **귀인의 도움**을 받아 위기가 기회로 바뀌는 천우신조의 복이 있습니다."

    [핵심 통변 로직 3: 성(姓)의 건강 이슈]
    - 성(姓) 자체에서 **재성**이 **인성**을 바로 옆에서 극하는 경우 (성 초성/중성/종성 간 관계).
    - 해석: "초년의 건강이나 부모님(모친) 관련 신경성 이슈에 유의해야 합니다." (단, 위 [탁함이 맑아짐] 원리에 의해 인성이 보호받거나 해소된다면 긍정 해석)

    [출력 스타일 - 매우 중요]
    1. **서론, 인사말, 확인 멘트 절대 금지**: "제공해주신 정보를 바탕으로 분석해 드립니다", "알겠습니다", "결과는 다음과 같습니다" 등의 말을 **절대** 쓰지 마십시오.
    2. **즉시 본론 시작**: 출력의 첫 시작은 무조건 **"1) 이름에 나타난 성향 분석"** 목차 혹은 그 내용으로 시작해야 합니다.
    3. 잡담(Chat)이나 부가적인 설명 없이 오직 **감명서의 본문 텍스트**만 출력하십시오.

    [금지 사항]
    1. **부정적 원리 설명 금지**: 결과가 부정적일 때 그 역학적 이유를 구구절절 설명하지 마십시오.
       - **특히 "정관이 비견을 극하므로 상속운이 없다"와 같은 식의 '극해서 없다'는 설명은 절대 출력하지 마십시오.** 사용자가 오해할 수 있습니다.
    2. **전문 용어 노출 금지**: 재극인, 관살혼잡, 도식 등.
    3. **질문 금지**: 사용자에게 반문하지 마십시오.

    [작성 목차]
    **1) 이름에 나타난 성향 분석**
       - 인접한 십성의 생/극 관계를 중심으로 서술.

    **2) 재물운과 직장운**
       - **[탁함이 맑아짐]** 원리가 적용된 경우(예: 관성중첩+식상극, 재성중첩+비겁극) 이를 강조하여 "전화위복의 길운"으로 서술.
       - **[식상+비겁]** 구조가 있다면 "귀인의 도움", "명예와 재물 겸비"를 서술.
       - "정관이 비견을 극해서..." 같은 부정적 사족은 모두 제거하십시오.

    **3) 건강운**
       - 성(姓)의 재극인 이슈 확인.
       - 여성의 경우 인성 문제 해결 안 되면 부인과 주의 언급.

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
