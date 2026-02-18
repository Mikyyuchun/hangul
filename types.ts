
export enum FiveElements {
  WOOD = '목(木)',
  FIRE = '화(火)',
  EARTH = '토(土)',
  METAL = '금(金)',
  WATER = '수(水)',
  UNKNOWN = '미상'
}

export interface SipsungInfo {
  code: number;
  name: string;
  groupName: string; // 추가: 비겁, 식상 등
}

export interface NameComponentMapping {
  symbol: string;
  cheongan: string;
  jiji: string;
  element: FiveElements;
  sipsung: SipsungInfo | null;
}

export interface HangulComponent {
  char: string;
  cho: NameComponentMapping;
  jung: NameComponentMapping | NameComponentMapping[];
  jong: NameComponentMapping | null;
}

export interface AnalysisResult {
  birthDate: string; // YYYY-MM-DD
  sajuYear: number;  // 입춘 기준 적용 연도
  yearGan: string;
  yearJi: string;
  ganji: string;
  lastName: HangulComponent;
  firstName: HangulComponent[];
  gender: 'male' | 'female';
}

export interface Message {
  role: 'user' | 'model';
  text: string;
}

declare global {
  interface Window {
    aistudio: any;
  }
}
