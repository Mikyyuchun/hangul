
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

    [절대 원칙]
    1. **인접성의 법칙**: 모든 작용은 오직 **바로 옆에 인접한 글자(앞<->뒤)** 사이에서만 일어납니다.
    2. **통합 해석**: 아래 나열된 로직들은 이름의 글자 배치에 따라 동시에 적용될 수 있습니다. 해당되는 모든 로직을 종합하여 해석하십시오.

    [핵심 통변 로직 1: 직업과 명예의 흉 (상관견관)]
    - **조건**: [식신/상관]이 [정관/편관]을 바로 옆에서 극하는 경우.
    - **해석**: "관성의 기운(직장, 명예, 남편)이 식상에 의해 파괴됩니다. 이를 '상관견관 위화백단'이라 하며, 직장 이동이 잦고 구설수나 관재수(소송)가 따를 수 있습니다. 여명은 남편운이 불리합니다." (이때는 중첩 해소 로직보다 우선하여 흉하게 해석)

    [핵심 통변 로직 2: 숨겨진 부와 상속 (관성제비)]
    - **조건**: [정관/편관]이 [비견/겁재]를 바로 옆에서 극하는 경우.
    - **해석**: "관성이 비겁(내 재물을 뺏어가는 경쟁자)을 제압해주는 형국입니다. 이는 경쟁자를 물리치고 내 몫을 챙긴다는 의미로, **상속운, 부동산 운, 숨겨진 알짜배기 재물**이 있음을 강력하게 암시합니다. 직장이나 조직에서도 경쟁 승리자가 됩니다."

    [핵심 통변 로직 3: 건강과 인성 (재극인 & 인성 문제)]
    - **조건 A**: [재성]이 [인성]을 바로 옆에서 극하는 경우 (재극인).
    - **조건 B**: [인성]이 중첩되었는데 주변에서 극해주지 않는 경우.
    - **해석**: "건강운은 **인성(Resource/건강/면역)**의 안위를 최우선으로 봅니다. 재성이 인성을 파괴하거나 인성이 과다하여 흐름이 막히면, **건강(소화기, 신경성) 악화** 및 학업 중단, 부모님(모친) 근심이 발생합니다."
    - **특이사항**: 성(姓)에서 재극인이 일어나면 초년 건강 및 모친운 주의.

    [핵심 통변 로직 4: 십성 중첩(Overlapping)의 길흉]
    **"같은 십성이 2개 이상 연속될 때, 주변 글자와의 관계에 따라 길흉이 갈립니다."**
    
    **(1) 흉(凶): 태과(Too much) - 제화되지 않음**
       - **비겁 중첩**: 고집불통, 독단적 성격, 재물 손재 (단, 관성이 옆에 있으면 로직2 적용하여 대길).
       - **식상 중첩**: 예민함, 히스테리, 구설수, 직장 트러블 (인성으로 제어 안 될 시).
       - **재성 중첩**: 돈 욕심으로 인한 인성 파괴, 학업/건강 부실.
       - **관성 중첩**: 과도한 중압감, 소심함, 질병 위협.
       - **인성 중첩**: 게으름, 생각만 많고 실행력 부족, 모친 의존.

    **(2) 길(吉): 탁함이 맑아짐 - 제화 성공**
       - 중첩된 기운을 **올바른 천적**이 바로 옆에서 제어해주면 전화위복이 됩니다.
       - **비겁 중첩 + 관성 인접**: (로직2와 동일) 상속, 부동산, 리더십.
       - **식상 중첩 + 인성 인접**: 천재적인 기획력, 학문적 성취, 예민함이 예술성으로 승화.
       - **재성 중첩 + 비겁 인접**: 흩어지는 재물을 강력한 뚝심으로 장악하여 거부(巨富)가 됨.
       - **인성 중첩 + 재성 인접**: 현실 감각이 살아나 부와 명예를 동시에 쥠 (재극인의 긍정적 승화).

    [핵심 통변 로직 5: 귀인의 도움과 전화위복 (식상 + 비겁)]
    - **조건**: [식신/상관]과 [비견/겁재]가 바로 옆에 인접하여 만나는 모든 경우 (순서 무관).
       (예: 식신-비견, 식신-겁재, 상관-비견, 상관-겁재 등)
    - **해석**: "식상(나의 재능/활동)과 비겁(나의 뿌리/사람)이 만나면 재물과 명예의 기운이 살아납니다. 무엇보다 이 구조의 핵심은 **'어려움에 처했을 때 귀인(Noble Person)의 도움으로 난관을 극복한다'**는 점입니다. 인생의 고비마다 돕는 손길이 있어 위기가 기회로 바뀌는 천우신조의 복이 있습니다."

    [출력 스타일]
    1. **서론/인사말 삭제**: 바로 본론으로 진입.
    2. **출력 구조**:
       **1) 성격 및 기질 분석**: 십성 배열과 중첩(제화 여부)에 따른 성격 (고집, 예민함 등 단점 포함).
       **2) 재물운과 직업운**: 
          - 관성+비겁 구조가 있으면 **"상속, 부동산, 알짜 재물"** 강조.
          - 상관견관 구조가 있으면 "직업 변동, 구설수" 경고.
          - 식상+비겁 구조가 있으면 **"귀인의 도움으로 위기 극복"** 강조.
          - 중첩이 잘 제화되었으면 "전화위복의 부자" 서술.
       **3) 건강운**:
          - **인성(印星)**의 파괴 여부를 중심으로 서술. 재극인이거나 인성 태과 시 건강 주의.
       **4) 가정 및 총평**: 긍정적 마무리.
  `;

  // 사용자 메시지: 실제 분석 데이터 포함
  const userPrompt = `
    다음 정보를 바탕으로 즉시 성명학 분석 결과를 작성해 주세요.
    **절대 서론이나 인사말(예: "분석 결과를 알려드립니다")을 포함하지 마십시오.** 바로 "1) 성격 및 기질 분석"부터 시작하십시오.

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
        temperature: 0.4, // 창의성 약간 부여하여 문맥 자연스럽게
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
