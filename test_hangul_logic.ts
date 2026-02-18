
import { decomposeAndMap } from './server/src/utils/hangulUtils';
import { NameComponentMapping, HangulComponent } from './types';

// Mock types if needed, but we're importing directly from source so should be fine if ts-node works.
// We need to make sure we can run this. simpler to just copy-paste relevant logic or use existing test mechanisms.
// Since environment is complex, let's create a self-contained test file that imports the modified file.

// We need to deal with imports in hangulUtils.ts.
// It imports types.ts. We can rely on ts-node to handle it if installed.
// Or we can compile it.

// Let's try to run a simple script that mimics the logic if we can't easily run the actual code due to dependencies.
// But we should try to import the actual code to test it.

const testDecomposition = () => {
    const yearGan = '갑'; // just a dummy value

    const cases = [
        { char: '과', name: 'Gwa (ㅘ -> ㅗ, ㅏ)', expectedJungLength: 2, expectedJungSymbols: ['ㅗ', 'ㅏ'] },
        { char: '의', name: 'Ui (ㅢ -> ㅢ)', expectedJungLength: -1, expectedJungSymbol: 'ㅢ' },
        { char: '위', name: 'Wi (ㅟ -> ㅜ, ㅣ)', expectedJungLength: 2, expectedJungSymbols: ['ㅜ', 'ㅣ'] },
        { char: '김', name: 'Kim (ㅣ -> ㅣ)', expectedJungLength: -1, expectedJungSymbol: 'ㅣ' } // Monophthong
    ];

    console.log('Starting Hangul Decomposition Test...\n');
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

try {
    testDecomposition();
} catch (e) {
    console.error(e);
}
