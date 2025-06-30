const axios = require('axios');

const WARMUP_URL = 'https://aplnatlog-backend.vercel.app/api/warmup';
const HEALTH_URL = 'https://aplnatlog-backend.vercel.app/api/health';

async function warmupServer() {
  console.log('🔥 Warming up serverless function...');
  
  try {
    // Call warmup endpoint
    console.log('📞 Calling warmup endpoint...');
    const warmupResponse = await axios.get(WARMUP_URL, {
      timeout: 30000
    });
    
    console.log('✅ Warmup response:', warmupResponse.data);
    
    // Wait a moment for connection to stabilize
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check health
    console.log('🏥 Checking health...');
    const healthResponse = await axios.get(HEALTH_URL, {
      timeout: 10000
    });
    
    console.log('✅ Health check response:', healthResponse.data);
    
    console.log('🎉 Serverless function warmed up successfully!');
    
  } catch (error) {
    console.error('❌ Warmup failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    process.exit(1);
  }
}

// Run warmup if called directly
if (require.main === module) {
  warmupServer();
}

module.exports = warmupServer; 