// Simple test script to verify the API endpoint is accessible
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

const API_URL = process.env.HUNYUAN3D_API_URL;

if (!API_URL) {
  console.error('❌ HUNYUAN3D_API_URL is not set in .env.local');
  process.exit(1);
}

console.log('🔍 Testing Hunyuan3D API connection...');
console.log(`🌐 API URL: ${API_URL}`);

// Test health check endpoint
async function testHealthCheck() {
  try {
    console.log('\n1. Testing health check endpoint...');
    const response = await fetch(`${API_URL}/health`);
    const data = await response.json();
    
    console.log('✅ Health check successful!');
    console.log('Status:', data.status);
    console.log('Version:', data.version);
    if (data.message) console.log('Message:', data.message);
    
    return true;
  } catch (error) {
    console.error('❌ Health check failed:');
    console.error(error instanceof Error ? error.message : error);
    return false;
  }
}

// Run the tests
(async () => {
  console.log('\n🚀 Starting API tests...');
  console.log('-----------------------------');
  
  const healthCheckPassed = await testHealthCheck();
  
  console.log('\n-----------------------------');
  console.log('Test Results:');
  console.log(`✅ Health Check: ${healthCheckPassed ? 'PASSED' : 'FAILED'}`);
  
  if (!healthCheckPassed) {
    console.log('\n❌ Some tests failed. Please check the error messages above.');
    process.exit(1);
  }
  
  console.log('\n🎉 All tests passed!');
})();
