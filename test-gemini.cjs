
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config({ path: 'server/.env' });

async function testGemini() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error('No GEMINI_API_KEY found in server/.env');
        return;
    }

    console.log('Testing with API Key length:', apiKey.length);
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    try {
        const prompt = 'Hello';
        const result = await model.generateContent(prompt);
        const response = await result.response;
        console.log('SUCCESS with gemini-2.5-flash:', response.text());
    } catch (error) {
        console.error('FAILED with gemini-2.5-flash:', error.message);
    }
}

testGemini();
