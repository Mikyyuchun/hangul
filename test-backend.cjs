const https = require('https');

const data = JSON.stringify({
    name: "테스트",
    gender: "male",
    birthDate: "1990-01-01",
    sajuYear: 1990,
    ganji: "경오",
    analysis: {}
});

const options = {
    hostname: 'server-1g54opq4k-hanmays-projects.vercel.app',
    path: '/api/ai/analyze',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
    }
};

console.log('Sending request to', options.hostname + options.path);

const req = https.request(options, (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    console.log(`HEADERS: ${JSON.stringify(res.headers)}`);
    res.setEncoding('utf8');
    res.on('data', (chunk) => {
        console.log(`BODY: ${chunk}`);
    });
    res.on('end', () => {
        console.log('No more data in response.');
    });
});

req.on('error', (e) => {
    console.error(`problem with request: ${e.message}`);
});

req.write(data);
req.end();
