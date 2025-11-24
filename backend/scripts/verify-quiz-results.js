const API_URL = 'http://127.0.0.1:3001/api';

async function testQuizResults() {
    console.log('🧪 Testing Quiz Results API...');

    // Test GET /lessons/2/quiz-results?profileId=3
    try {
        console.log('Testing GET /lessons/2/quiz-results?profileId=3...');
        const res = await fetch(`${API_URL}/lessons/2/quiz-results?profileId=3`);
        console.log(`Status: ${res.status}`);
        const data = await res.json();
        console.log('Response:', JSON.stringify(data, null, 2));

        if (res.status === 200) {
            console.log('✅ Quiz Results API working');
        } else {
            console.log('❌ Failed to get quiz results');
        }
    } catch (e) {
        console.error('❌ Error:', e.message);
    }
}

testQuizResults();
