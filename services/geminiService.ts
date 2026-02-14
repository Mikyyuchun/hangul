
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { AnalysisResult, Message } from "../types";

/**
 * AI 성명학 통변 서비스 (대가의 통변 로직 적용)
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
    제공된 이름의 구성 요소를 분석하여, 아래의 **[대가의 통변 로직]**을 철저히 따르는 감명서를 작성하십시오.
    
    [입력 정보]
    - 이름: ${analysis.lastName.char}${analysis.firstName.map(f => f.char).join('')}
    - 생년: ${analysis.year}년 (${analysis.ganji}생)
    - 상세 구성: ${JSON.stringify(analysis)}

    [대가의 통변 로직 (반드시 준수)]
    
    1. **명주성(命主星) 분석 기준**:
       - 이름 첫 글자의 **초성(자음)**을 '명주성'으로 봅니다. (${mainChar.char}의 초성 ${mainComponent.symbol} -> ${mainSipsung})
       - **중첩(2개 이상)의 해석**: 좋은 기운(식신, 재성 등)이라도 중첩되면 흉한 작용이 일어납니다.
         - 식상 중첩: 머리는 좋으나 신경이 예민하고 스트레스 취약. 여자명에서 **관성(남편/직장)을 극**하여 부부운과 직장운이 나쁨.
         - 재성 중첩: 돈은 들어오나 나가는 구멍이 많음(군비쟁재). 현금 유동성은 좋으나 축적이 어려움.
         - 비겁 중첩: 고집이 세고 배우자를 극함.
         
    2. **부재(없는 기운)의 해석**:
       - 관성(나를 통제하는 기운) 부재: 남의 밑에서 일하기 힘들고 한 직장에 오래 있기 힘듦. 여자는 남편 덕이 약함.
       - 재성 부재: 결실이 약하고 마무리가 안 됨.
       - 인성 부재: 깊게 생각하지 않고 행동이 앞섬.

    3. **건강운 (없는 오행 위주 분석)**:
       - 화(Fire) 없음: 심장, 눈, 시력, 편두통, 혈압 주의.
       - 토(Earth) 없음: 위장, 소화기, 피부, 허리 주의.
       - 금(Metal) 없음: 폐, 대장, 뼈, 관절 주의.
       - 수(Water) 없음: 신장, 방광, 자궁, 비뇨기 주의.
       - 목(Wood) 없음: 간, 담, 신경계, 갑상선 주의.

    4. **기타 (사회적 처세)**:
       - 오행의 속성을 사회적 덕목(인의예지신)과 연결하여 조언.
       - 예: 토(土)가 없으면 "믿음과 포용력이 부족할 수 있으니 마음을 넓게 가져라."
       - 예: 화(火)가 없으면 "예의와 형식을 갖추고 추진력을 길러라."

    [출력 스타일 및 양식]
    - **중요**: "분석 결과입니다", "로직에 따라 분석했습니다"와 같은 **서론이나 인사말을 절대 작성하지 마십시오.**
    - 바로 첫 번째 목차인 '● 명주성 분석'으로 시작하십시오.
    - **말투**: "~이다.", "~하는 것이 중요하다.", "~성향을 지니고 있다." 등 단호하고 전문적인 문어체 사용.
    - 아래 양식을 그대로 사용하여 출력 (목차 기호 ● 사용):

    ● 명주성 분석 - 명주성(${mainSipsung}, ${mainElement})
       (내용: 명주성의 특성 설명. 특히 기운이 중첩되었는지 확인하고, 중첩되었다면 그로 인한 예민함, 배우자운/직장운의 저하를 인과관계로 설명. 반대 급부로 전문성은 인정.)

    ● 재물운과 직장운
       (내용: 재성(재물)의 중첩 여부 판단 -> 돈의 입출입이 빈번함을 지적. 관성(직장)의 유무 판단 -> 관성이 없거나 식상에 의해 깨지면 직장 생활의 어려움과 통제받기 싫어하는 성향 지적.)

    ● 건강운
       (내용: 이름 전체에서 **없는 오행**을 찾아내고, 해당 오행이 상징하는 신체 부위(심장, 위장 등)의 질병 유의점 경고.)

    ● 기타
       (내용: 없는 오행의 사회적 의미(신용, 예의 등)를 설명하고 이를 보완하기 위한 마음가짐 조언.)
  `;

  try {
    const chat = ai.chats.create({
      model: modelName,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.4, // 분석의 일관성을 위해 낮음
      },
    });

    const response: GenerateContentResponse = await chat.sendMessage({ message: "위 성명에 대해 대가의 로직으로 정밀 통변해 주세요." });
    return response.text || "분석 결과를 생성할 수 없습니다.";
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    if (error.message?.includes("429") || error.message?.includes("quota")) return "QUOTA_EXCEEDED";
    return `분석 엔진 오류: ${error.message || "잠시 후 다시 시도해 주세요."}`;
  }
};
