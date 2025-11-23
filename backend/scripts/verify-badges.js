// const fetch = require('node-fetch');

const API_URL = 'http://127.0.0.1:3001/api';

async function testBadges() {
    console.log('🧪 Testing Badges API...');

    // 1. Test Get Profile Badges (GET /badges/profile/2)
    // Should return 200 or 400/404 but NOT 500
    try {
        console.log('Testing GET /badges/profile/2...');
        const res = await fetch(`${API_URL}/badges/profile/2`, {
            headers: {
                // Mock auth header if needed, but the controller might check it
                // 'Authorization': 'Bearer ...' 
            }
        });
        console.log(`Status: ${res.status}`);
        const data = await res.json();
        console.log('Response:', JSON.stringify(data, null, 2));

        if (res.status === 200) console.log('✅ Badges API working');
        else if (res.status === 401) console.log('✅ Auth check working (401 expected without token)');
        else if (res.status === 500) console.log('❌ Internal Server Error');
        else console.log(`ℹ️ Status ${res.status}`);
    } catch (e) {
        console.error('❌ Error:', e.message);
    }
}

testBadges();
