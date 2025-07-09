const axios = require('axios');

const testHealth = async () => {
  try {
    console.log('🔍 Testing backend health...');
    
    const response = await axios.get('http://localhost:5000/api/health', {
      timeout: 10000
    });
    
    console.log('✅ Backend is healthy!');
    console.log('Status:', response.data.status);
    console.log('Database:', response.data.database);
    console.log('Timestamp:', response.data.timestamp);
    
  } catch (error) {
    console.error('❌ Backend health check failed:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else if (error.request) {
      console.error('No response received - server might be down');
    } else {
      console.error('Error:', error.message);
    }
  }
};

// Run the test
testHealth(); 