
import { FiveElements, NameComponentMapping, SipsungInfo } from '../types';

const CHO_SYMBOLS = ['ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
const JUNG_SYMBOLS = ['ㅏ', 'ㅐ', 'ㅑ', 'ㅒ', 'ㅓ', 'ㅔ', 'ㅕ', 'ㅖ', 'ㅗ', 'ㅘ', 'ㅙ', 'ㅚ', 'ㅛ', 'ㅜ', 'ㅝ', 'ㅞ', 'ㅟ', 'ㅠ', 'ㅡ', 'ㅢ', 'ㅣ'];
const JONG_SYMBOLS = ['', 'ㄱ', 'ㄲ', 'ㄳ', 'ㄴ', 'ㄵ', 'ㄶ', 'ㄷ', 'ㄹ', 'ㄺ', 'ㄻ', 'ㄼ', 'ㄽ', 'ㄾ', 'ㄿ', 'ㅀ', 'ㅁ', 'ㅂ', 'ㅄ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];

const CHEONGAN = ['갑', '을', '병', '정', '무', '기', '경', '신', '임', '계'];
const JIJI = ['자', '축', '인', '묘', '진', '사', '오', '미', '신', '유', '술', '해'];

const SIPSUNG_NAMES: Record<number, string> = {
  1: '비견', 2: '겁재', 3: '식신', 4: '상관', 5: '편재', 6: '정재', 7: '편관', 8: '정관', 9: '편인', 0: '정인'
};

const getGroupName = (code: number): string => {
  if (code === 1 || code === 2) return '비겁';
  if (code === 3 || code === 4) return '식상';
  if (code === 5 || code === 6) return '재성';
  if (code === 7 || code === 8) return '관성';
  if (code === 9 || code === 0) return '인성';
  return '';
};

const getGanjiMapping = (symbol: string): { cheongan: string; jiji: string; element: FiveElements } => {
  if (['ㄱ'].includes(symbol)) return { cheongan: '갑', jiji: '인', element: FiveElements.WOOD };
  if (['ㅋ', 'ㄲ'].includes(symbol)) return { cheongan: '을', jiji: '묘', element: FiveElements.WOOD };
  if (['ㄴ'].includes(symbol)) return { cheongan: '병', jiji: '오', element: FiveElements.FIRE };
  if (['ㄷ', 'ㄹ', 'ㅌ', 'ㄸ'].includes(symbol)) return { cheongan: '정', jiji: '사', element: FiveElements.FIRE };
  if (['ㅁ'].includes(symbol)) return { cheongan: '무', jiji: '진', element: FiveElements.EARTH };
  if (['ㅂ', 'ㅍ', 'ㅃ'].includes(symbol)) return { cheongan: '기', jiji: '축', element: FiveElements.EARTH };
  if (['ㅅ'].includes(symbol)) return { cheongan: '경', jiji: '신', element: FiveElements.METAL };
  if (['ㅈ', 'ㅊ', 'ㅆ', 'ㅉ'].includes(symbol)) return { cheongan: '신', jiji: '유', element: FiveElements.METAL };
  if (['ㅇ'].includes(symbol)) return { cheongan: '임', jiji: '자', element: FiveElements.WATER };
  if (['ㅎ'].includes(symbol)) return { cheongan: '계', jiji: '해', element: FiveElements.WATER };

  if (['ㅏ', 'ㅐ'].includes(symbol)) return { cheongan: '갑', jiji: '인', element: FiveElements.WOOD };
  if (['ㅕ', 'ㅖ'].includes(symbol)) return { cheongan: '을', jiji: '묘', element: FiveElements.WOOD };
  if (['ㅛ'].includes(symbol)) return { cheongan: '병', jiji: '오', element: FiveElements.FIRE };
  if (['ㅜ'].includes(symbol)) return { cheongan: '정', jiji: '사', element: FiveElements.FIRE };
  if (['ㅣ'].includes(symbol)) return { cheongan: '무', jiji: '진', element: FiveElements.EARTH };
  if (['ㅡ', 'ㅢ'].includes(symbol)) return { cheongan: '기', jiji: '축', element: FiveElements.EARTH };
  if (['ㅑ', 'ㅒ'].includes(symbol)) return { cheongan: '경', jiji: '신', element: FiveElements.METAL };
  if (['ㅓ', 'ㅔ'].includes(symbol)) return { cheongan: '신', jiji: '유', element: FiveElements.METAL };
  if (['ㅗ'].includes(symbol)) return { cheongan: '임', jiji: '자', element: FiveElements.WATER };
  if (['ㅠ'].includes(symbol)) return { cheongan: '계', jiji: '해', element: FiveElements.WATER };

  return { cheongan: '', jiji: '', element: FiveElements.UNKNOWN };
};

const SIPSUNG_MATRIX = [
  [1, 2, 3, 4, 5, 6, 7, 8, 9, 0], 
  [2, 1, 4, 3, 6, 5, 8, 7, 0, 9], 
  [9, 0, 1, 2, 3, 4, 5, 6, 7, 8], 
  [0, 9, 2, 1, 4, 3, 6, 5, 8, 7], 
  [7, 8, 9, 0, 1, 2, 3, 4, 5, 6], 
  [8, 7, 0, 9, 2, 1, 4, 3, 6, 5], 
  [5, 6, 7, 8, 9, 0, 1, 2, 3, 4], 
  [6, 5, 8, 7, 0, 9, 2, 1, 4, 3], 
  [3, 4, 5, 6, 7, 8, 9, 0, 1, 2], 
  [4, 3, 6, 5, 8, 7, 0, 9, 2, 1], 
];

const calculateSipsung = (nameGan: string, yearGan: string): SipsungInfo | null => {
  const nameIdx = CHEONGAN.indexOf(nameGan);
  const yearIdx = CHEONGAN.indexOf(yearGan);
  if (nameIdx === -1 || yearIdx === -1) return null;
  
  const code = SIPSUNG_MATRIX[nameIdx][yearIdx];
  return { code, name: SIPSUNG_NAMES[code], groupName: getGroupName(code) };
};

export const getSipsungGroupCode = (code: number): number => {
  if (code === 1 || code === 2) return 1;
  if (code === 3 || code === 4) return 3;
  if (code === 5 || code === 6) return 5;
  if (code === 7 || code === 8) return 7;
  if (code === 9 || code === 0) return 9;
  return -1;
};

export const checkSipsungSaeng = (a: number, b: number): boolean => {
  const gA = getSipsungGroupCode(a);
  const gB = getSipsungGroupCode(b);
  if (gA === 1 && gB === 3) return true;
  if (gA === 3 && gB === 5) return true;
  if (gA === 5 && gB === 7) return true;
  if (gA === 7 && gB === 9) return true;
  if (gA === 9 && gB === 1) return true;
  return false;
};

export const checkSipsungGeuk = (a: number, b: number): boolean => {
  const gA = getSipsungGroupCode(a);
  const gB = getSipsungGroupCode(b);
  if (gA === 1 && gB === 5) return true;
  if (gA === 3 && gB === 7) return true;
  if (gA === 5 && gB === 9) return true;
  if (gA === 7 && gB === 1) return true;
  if (gA === 9 && gB === 3) return true;
  return false;
};

export const checkSipsungJungcheop = (a: number, b: number): boolean => {
  const gA = getSipsungGroupCode(a);
  const gB = getSipsungGroupCode(b);
  return gA === gB && gA !== -1;
};

export const decomposeAndMap = (char: string, yearGan: string): any => {
  const code = char.charCodeAt(0) - 44032;
  let choSym = char, jungSym = '', jongSym = '';

  if (code >= 0 && code <= 11171) {
    const choIdx = Math.floor(code / 588);
    const jungIdx = Math.floor((code - choIdx * 588) / 28);
    const jongIdx = code % 28;
    choSym = CHO_SYMBOLS[choIdx];
    jungSym = JUNG_SYMBOLS[jungIdx];
    jongSym = JONG_SYMBOLS[jongIdx];
  } else {
    choSym = char;
    jungSym = '';
    jongSym = '';
  }

  const mapComponent = (sym: string): NameComponentMapping => {
    const { cheongan, jiji, element } = getGanjiMapping(sym);
    const sipsung = calculateSipsung(cheongan, yearGan);
    return { symbol: sym, cheongan, jiji, element, sipsung };
  };

  return {
    char,
    cho: mapComponent(choSym),
    jung: mapComponent(jungSym),
    jong: jongSym ? mapComponent(jongSym) : null
  };
};

export const getYearGanjiParts = (year: number) => {
  const ganIdx = (year - 4) % 10;
  const jiIdx = (year - 4) % 12;
  const finalGanIdx = ganIdx < 0 ? ganIdx + 10 : ganIdx;
  const finalJiIdx = jiIdx < 0 ? jiIdx + 12 : jiIdx;
  return { gan: CHEONGAN[finalGanIdx], ji: JIJI[finalJiIdx] };
};

export const calculateGanji = (year: number): string => {
  const { gan, ji } = getYearGanjiParts(year);
  return gan + ji;
};

export const formatCheongan = (cheongan: string): string => {
  const map: Record<string, string> = {
    '갑': '갑목', '을': '을목',
    '병': '병화', '정': '정화',
    '무': '무토', '기': '기토',
    '경': '경금', '신': '신금',
    '임': '임수', '계': '계수'
  };
  return map[cheongan] || cheongan;
};
