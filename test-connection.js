// Simple test script to verify frontend can connect to backend
const apiUrl = 'https://social-os-backend-6.onrender.com/api/v1';

async function testConnection() {
    console.log('🔍 Testing connection to:', apiUrl);
    
    try {
        // Test basic connectivity
        const healthResponse = await fetch(`${apiUrl.replace('/api/v1', '')}/health`);
        const healthData = await healthResponse.json();
        console.log('✅ Health check:', healthData);
        
        // Test CORS with a simple GET request
        const corsResponse = await fetch(`${apiUrl.replace('/api/v1', '')}/cors-test`);
        const corsData = await corsResponse.json();
        console.log('✅ CORS test:', corsData);
        
        // Test the auth endpoint structure (should get method not allowed, but not 404)
        try {
            const authResponse = await fetch(`${apiUrl}/auth/login`, {
                method: 'GET'
            });
            console.log('📍 Auth endpoint status:', authResponse.status, authResponse.statusText);
        } catch (error) {
            console.log('❌ Auth endpoint error:', error.message);
        }
        
        // Test actual login attempt (should fail with validation error, not CORS error)
        try {
            const loginResponse = await fetch(`${apiUrl}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Origin': 'https://social-os-frontend.vercel.app'
                },
                body: JSON.stringify({
                    email: 'test@example.com',
                    password: 'testpassword'
                })
            });
            const loginData = await loginResponse.json();
            console.log('📍 Login test status:', loginResponse.status);
            console.log('📍 Login test response:', loginData);
        } catch (error) {
            console.log('❌ Login test error:', error.message);
        }
        
    } catch (error) {
        console.error('❌ Connection test failed:', error);
    }
}

// Run the test
testConnection();
