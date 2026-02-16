const http = require('http');

const sheets = ['theory_basic', 'interpretation_rules', 'case_studies'];

async function syncSheet(sheetName) {
    return new Promise((resolve, reject) => {
        const postData = JSON.stringify({ sheetName });

        const options = {
            hostname: 'localhost',
            port: 8000,
            path: '/api/sync/sheet',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };

        console.log(`\n동기화 시작: ${sheetName}...`);

        const req = http.request(options, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                console.log(`응답 상태: ${res.statusCode}`);
                console.log(`응답 내용: ${data}`);
                if (res.statusCode === 200 || res.statusCode === 201) {
                    resolve(data);
                } else {
                    reject(new Error(`Failed with status ${res.statusCode}: ${data}`));
                }
            });
        });

        req.on('error', (error) => {
            console.error(`오류 발생:`, error.message);
            reject(error);
        });

        req.write(postData);
        req.end();
    });
}

async function syncAllSheets() {
    console.log('=== Google Sheets → Pinecone 동기화 시작 ===\n');

    for (const sheet of sheets) {
        try {
            await syncSheet(sheet);
            console.log(`✅ ${sheet} 동기화 완료`);
        } catch (error) {
            console.error(`❌ ${sheet} 동기화 실패:`, error.message);
        }
    }

    console.log('\n=== 모든 시트 동기화 완료 ===');
}

syncAllSheets();
