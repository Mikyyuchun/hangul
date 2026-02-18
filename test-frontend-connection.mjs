const testBackend = async () => {
    const backendUrl = 'https://server-three-phi-27.vercel.app/api';

    console.log('Testing backend API...');
    console.log('URL:', backendUrl);

    const testData = {
        name: '김철수',
        birthDate: '1990-01-01',
        gender: 'male',
        sajuYear: 1990,
        ganji: '경오',
        analysis: {
            firstName: [
                {
                    cho: {
                        sipsung: {
                            id: '1',
                            name: '비견'
                        }
                    }
                }
            ]
        }
    };

    try {
        const response = await fetch(`${backendUrl}/ai/analyze`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(testData)
        });

        console.log('Response status:', response.status);
        console.log('Response headers:', Object.fromEntries(response.headers.entries()));

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Error response:', errorText);
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        const result = await response.json();
        console.log('Success! Response:', result);

    } catch (error) {
        console.error('Failed to fetch:', error.message);
        console.error('Full error:', error);
    }
};

testBackend();
