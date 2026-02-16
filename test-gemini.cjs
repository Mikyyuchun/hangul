
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config({ path: 'server/.env' });

async function testGemini() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error('No GEMINI_API_KEY found in server/.env');
        return;
    }

    console.log('Testing with API Key length:', apiKey.length);
    const axios = require('axios');
    try {
        const response = await axios.get(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        console.log('Available models:');
        response.data.models.forEach(m => {
            if (m.supportedGenerationMethods.includes('generateContent')) {
                console.log(`- ${m.name}`);
            }
        });
    } catch (error) {
        console.error('Error listing models:', error.response ? error.response.data : error.message);
    }
}

testGemini();
