
// Standalone test script to verify logic without dependency issues

// --- Mocked Types ---
enum FiveElements {
    WOOD = '목(木)',
    FIRE = '화(火)',
    EARTH = '토(土)',
    METAL = '금(金)',
    WATER = '수(水)',
    UNKNOWN = '미상'
}

interface SipsungInfo {
    code: number;
    name: string;
    groupName: string;
}

interface NameComponentMapping {
    symbol: string;
    cheongan: string;
    jiji: string;
    element: FiveElements;
    sipsung: SipsungInfo | null;
}

interface HangulComponent {
    char: string;
    cho: NameComponentMapping;
    jung: NameComponentMapping | NameComponentMapping[];
    jong: NameComponentMapping | null;
}

// --- Simplified Constants & Functions from hangulUtils.ts ---

const CHO_SYMBOLS = ['ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
const JUNG_SYMBOLS = ['ㅏ', 'ㅐ', 'ㅑ', 'ㅒ', 'ㅓ', 'ㅔ', 'ㅕ', 'ㅖ', 'ㅗ', 'ㅘ', 'ㅙ', 'ㅚ', 'ㅛ', 'ㅜ', 'ㅝ', 'ㅞ', 'ㅟ', 'ㅠ', 'ㅡ', 'ㅢ', 'ㅣ'];
const JONG_SYMBOLS = ['', 'ㄱ', 'ㄲ', 'ㄳ', 'ㄴ', 'ㄵ', 'ㄶ', 'ㄷ', 'ㄹ', 'ㄺ', 'ㄻ', 'ㄼ', 'ㄽ', 'ㄾ', 'ㄿ', 'ㅀ', 'ㅁ', 'ㅂ', 'ㅄ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];

const CHEONGAN = ['갑', '을', '병', '정', '무', '기', '경', '신', '임', '계'];

// COPY OF THE NEW LOGIC
const VOWEL_DECOMPOSITION: Record<string, string[]> = {
    'ㅘ': ['ㅗ', 'ㅏ'],
    'ㅙ': ['ㅗ', 'ㅐ'],
    'ㅚ': ['ㅗ', 'ㅣ'],
    'ㅝ': ['ㅜ', 'ㅓ'],
    'ㅞ': ['ㅜ', 'ㅔ'],
    'ㅟ': ['ㅜ', 'ㅣ'],
    // 'ㅢ'는 복모음 그대로 사용 (기토) - 분해하지 않음
};


const getGanjiMapping = (symbol: string) => {
    // Simplified mapping for test
    return { cheongan: '갑', jiji: '인', element: FiveElements.WOOD };
};

const calculateSipsung = (nameGan: string, yearGan: string) => {
    return null; // Not testing sipsung logic here
};

const decomposeAndMap = (char: string, yearGan: string): any => {
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

    const getJungComponent = (sym: string): NameComponentMapping | NameComponentMapping[] => {
        // 1. 복모음 분해 로직 (ㅢ 제외)
        // sym이 분해 대상인 경우
        if (VOWEL_DECOMPOSITION[sym]) {
            return VOWEL_DECOMPOSITION[sym].map(subSym => mapComponent(subSym));
        }
        // 2. 단모음이거나 'ㅢ'인 경우 그대로 매핑
        return mapComponent(sym);
    };

    return {
        char,
        cho: mapComponent(choSym),
        jung: getJungComponent(jungSym),
        jong: jongSym ? mapComponent(jongSym) : null
    };
};

// --- Test Logic ---
const testDecomposition = () => {
    const yearGan = '갑';

    const cases = [
        { char: '과', name: 'Gwa (ㅘ -> ㅗ, ㅏ)', expectedJungLength: 2, expectedJungSymbols: ['ㅗ', 'ㅏ'] },
        { char: '의', name: 'Ui (ㅢ -> ㅢ)', expectedJungLength: -1, expectedJungSymbol: 'ㅢ' },
        { char: '위', name: 'Wi (ㅟ -> ㅜ, ㅣ)', expectedJungLength: 2, expectedJungSymbols: ['ㅜ', 'ㅣ'] },
        { char: '김', name: 'Kim (ㅣ -> ㅣ)', expectedJungLength: -1, expectedJungSymbol: 'ㅣ' }
    ];

    console.log('Starting Hangul Decomposition Test (Standalone)...\n');
    let failures = 0;

    cases.forEach(testCase => {
        const result = decomposeAndMap(testCase.char, yearGan) as HangulComponent;
        const jung = result.jung;

        console.log(`Testing: ${testCase.char} (${testCase.name})`);

        if (Array.isArray(jung)) {
            if (testCase.expectedJungLength === -1) {
                console.error(`  FAIL: Expected single jung, got array: ${jung.map(j => j.symbol).join(', ')}`);
                failures++;
            } else if (jung.length !== testCase.expectedJungLength) {
                console.error(`  FAIL: Expected length ${testCase.expectedJungLength}, got ${jung.length}`);
                failures++;
            } else {
                const symbols = jung.map(j => j.symbol);
                const expected = testCase.expectedJungSymbols || [];
                if (JSON.stringify(symbols) === JSON.stringify(expected)) {
                    console.log(`  PASS: Decomposed into ${symbols.join(', ')}`);
                } else {
                    console.error(`  FAIL: Expected ${expected.join(', ')}, got ${symbols.join(', ')}`);
                    failures++;
                }
            }
        } else {
            if (testCase.expectedJungLength !== -1) {
                console.error(`  FAIL: Expected array of length ${testCase.expectedJungLength}, got single mapping: ${jung.symbol}`);
                failures++;
            } else {
                if (jung.symbol === testCase.expectedJungSymbol) {
                    console.log(`  PASS: Kept as single ${jung.symbol}`);
                } else {
                    console.error(`  FAIL: Expected ${testCase.expectedJungSymbol}, got ${jung.symbol}`);
                    failures++;
                }
            }
        }
        console.log('---');
    });

    if (failures === 0) {
        console.log('\nAll tests passed successfully!');
    } else {
        console.error(`\n${failures} tests failed.`);
        process.exit(1);
    }
};

testDecomposition();
