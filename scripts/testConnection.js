const mongoose = require('mongoose');
require('dotenv').config();

async function testConnection() {
  try {
    console.log('🔍 Testing MongoDB connection...');
    console.log('📋 Connection options:');
    
    const options = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 30000,
      keepAlive: true,
      maxPoolSize: 1,
      family: 4
    };
    
    console.log(JSON.stringify(options, null, 2));
    
    console.log('🔌 Connecting...');
    const conn = await mongoose.connect(process.env.MONGODB_URL, options);
    
    console.log('✅ Connection successful!');
    console.log('📊 Connection details:');
    console.log(`   Database: ${conn.connection.name}`);
    console.log(`   Host: ${conn.connection.host}`);
    console.log(`   Port: ${conn.connection.port}`);
    console.log(`   Ready State: ${conn.connection.readyState}`);
    
    // Test a simple query
    console.log('🧪 Testing query...');
    const collections = await conn.connection.db.listCollections().toArray();
    console.log(`   Collections found: ${collections.length}`);
    
    await mongoose.disconnect();
    console.log('✅ Test completed successfully!');
    
  } catch (error) {
    console.error('❌ Connection test failed:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  }
}

testConnection(); 