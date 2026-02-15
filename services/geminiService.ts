
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
  const modelName = "gemini-3-pro-preview"; 
  
  // 명주성 정의 (내부 로직용)
  const mainChar = analysis.firstName[0];
  const mainComponent = mainChar?.cho; 
  const mainSipsung = mainComponent?.sipsung?.name || "미상";

  // 이름의 구성을 일렬 종대(Linear Flow)로 나열하여 인접 관계를 명확히 함
  // 내부 분석용 데이터에는 흐름을 제공하되, 출력에는 표시하지 않음
  let linearFlowStr = "";
  const components: { part: string, sipsung: string, element: string, isMyungjuseong: boolean }[] = [];

  const addComp = (comp: NameComponentMapping | null, partName: string, isMain: boolean = false) => {
    if (comp && comp.sipsung) {
      components.push({
        part: partName,
        sipsung: comp.sipsung.name,
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
    `[${i + 1}] ${c.part}: ${c.sipsung}(${c.element}) ${c.isMyungjuseong ? "(기준점)" : ""}`
  ).join(" -> \n");

  const genderStr = analysis.gender === 'female' ? "여성(Female)" : "남성(Male)";

  const systemInstruction = `
    당신은 성명학 분석 엔진입니다. 
    제공된 이름의 십성(十星) 배치를 분석하여 감명 결과를 작성하십시오.

    [금지 사항 - 절대 어기지 말 것]
    1. **서론, 인사말, 자기소개 금지**: "안녕하세요", "분석 결과입니다" 등의 멘트를 작성하지 마십시오. 바로 첫 번째 목차부터 시작하십시오.
    2. **전문 용어 노출 금지**: '도미노 법칙', '극제', '명주성', '도식', '재극인', '인성태과' 등의 전문 용어를 본문에 절대 쓰지 마십시오.
    3. **오행 분석 언급 제한**: 오행의 상생상극(목생화 등) 논리는 서술하지 마십시오. 단, **건강운**에서 신체 부위를 설명할 때만 오행 정보를 활용하십시오.

    [입력 정보]
    - 대상 성별: ${genderStr}
    - 생년: ${analysis.year}년 (${analysis.ganji}생)
    - 십성 및 오행 흐름:
    ${linearFlowStr}

    [작성 목차 및 로직]
    아래 4가지 항목으로만 구성하고, 각 항목의 내용은 아래 로직을 철저히 준수하여 서술하십시오.

    **1) 이름에 나타난 성향 분석**
       - 기준점(${mainSipsung})을 중심으로 성격을 풀이하되, 인접한 글자가 생(Support)하는지 극(Attack)하는지, 극을 당할 때 다른 글자가 도와주는지를 보고 성격의 긍정/부정적 측면을 서술하십시오.

    **2) 재물운과 직장운**
       - 재성(재물)과 관성(직장)이 파극(깨짐)되는지, 아니면 보호받는지 살피십시오.
       - 공격받는 기운이 있어도 주변에서 막아주면 전화위복으로 해석하고, 막아주지 못하면 손실이나 어려움으로 해석하십시오.

    **3) 건강운 (필수 로직 적용)**
       - **판단 기준**: 건강은 전적으로 **'인성(편인, 정인)'**의 상태로 판단합니다.
       - **문제 조건 (인성이 건강을 해치는 경우)**:
         1. **인성이 중첩/혼잡**된 경우 (인성이 2개 이상)
         2. 인성 태과 (너무 많음)
         3. 인성이 식상을 극함 (도식)
         4. 인성이 재성에 의해 극을 당함 (재극인)
         5. 무인성
       - **서술 방식**: 
         - 위 조건에 해당하면 건강상 취약점이 있다고 서술하십시오.
         - **취약 부위**: 문제가 되는 인성의 **오행(목/화/토/금/수)**을 확인하여 해당 신체 부위를 나열하십시오.
           (목: 간/담/신경/관절, 화: 심장/소장/혈관, 토: 위장/피부/소화기, 금: 폐/대장/뼈/호흡기, 수: 신장/방광/혈액)
         - **여성 특화 필수 문구**: 만약 대상이 **'여성'**이고 **인성에 문제(특히 중첩/태과)**가 있는 경우, 인성이 식상(자녀/자궁)을 극하는 원리이므로, 오행과 무관하게 **"자궁, 유방, 부인과 계통"**의 건강 유의를 **반드시 추가**하여 서술하십시오.

    **4) 기타**
       - 가정운(부모, 배우자, 자녀)을 십성의 조화로움으로 판단하여 한 줄로 요약하고, 긍정적인 조언으로 마무리하십시오.
  `;

  try {
    const chat = ai.chats.create({
      model: modelName,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.35,
      },
    });

    const response: GenerateContentResponse = await chat.sendMessage({ message: "위의 [건강운 필수 로직]을 반드시 준수하여 4가지 목차로 결과를 작성해 주세요." });
    return response.text || "분석 결과를 생성할 수 없습니다.";
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    if (error.message?.includes("429") || error.message?.includes("quota")) return "QUOTA_EXCEEDED";
    return `분석 엔진 오류: ${error.message || "잠시 후 다시 시도해 주세요."}`;
  }
};
