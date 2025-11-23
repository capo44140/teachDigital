const { createSession, deleteSession } = require('../lib/auth.js');
const { default: sql } = require('../lib/database.js');

const API_URL = 'http://127.0.0.1:3001/api';
const PROFILE_ID = 2; // Ayna

async function testAuthenticatedBadges() {
    console.log('🧪 Testing Authenticated Badges API...');

    // 1. Create a temporary session
    const sessionToken = `test-token-${Date.now()}`;
    const expiresAt = new Date(Date.now() + 3600000); // 1 hour

    try {
        console.log('1. Creating temporary session...');
        await createSession(PROFILE_ID, sessionToken, expiresAt);
        console.log('✅ Session created');

        // 2. Make authenticated request
        console.log(`2. Testing GET /badges/profile/${PROFILE_ID} with token...`);
        const response = await fetch(`${API_URL}/badges/profile/${PROFILE_ID}`, {
            headers: {
                'Authorization': `Bearer ${sessionToken}`
            }
        });

        console.log(`Status: ${response.status}`);

        if (response.ok) {
            const data = await response.json();
            console.log('✅ Success! Response data:', JSON.stringify(data).substring(0, 100) + '...');
        } else {
            const text = await response.text();
            console.error('❌ Failed. Response:', text);
        }

    } catch (error) {
        console.error('❌ Error during test:', error);
    } finally {
        // 3. Cleanup
        console.log('3. Cleaning up session...');
        try {
            await deleteSession(sessionToken);
            console.log('✅ Session deleted');
        } catch (e) {
            console.error('Failed to delete session:', e);
        }

        // Close DB connection if needed (sql usually handles pool)
        // process.exit(0);
    }
}

testAuthenticatedBadges();
