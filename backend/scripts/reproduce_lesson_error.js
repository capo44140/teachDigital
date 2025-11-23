// const fetch = require('node-fetch');

const API_URL = 'http://127.0.0.1:3001/api';

async function reproduce() {
    console.log('🧪 Reproducing Lesson API Error...');

    // Params from the user screenshot: profileId=2, published=true
    const url = `${API_URL}/lessons?profileId=2&published=true`;
    console.log(`Requesting: ${url}`);

    try {
        const res = await fetch(url);
        console.log(`Status: ${res.status}`);
        const data = await res.json();
        console.log('Response:', JSON.stringify(data, null, 2));
    } catch (e) {
        console.error('❌ Error:', e.message);
    }
}

reproduce();
