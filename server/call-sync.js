const http = require('http');

const options = {
    hostname: 'localhost',
    port: 8000,
    path: '/api/sync/sheet',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    }
};

console.log('Calling sync endpoint...');

const req = http.request(options, (res) => {
    let data = '';

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        console.log('Response status:', res.statusCode);
        console.log('Response body:', data);
    });
});

req.on('error', (error) => {
    console.error('Error:', error.message);
});

req.end();
