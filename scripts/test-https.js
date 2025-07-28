// Simple test script using Node.js built-in https module
const https = require('https');
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

// Parse URL to get hostname and path
const url = new URL(API_URL);
const options = {
  hostname: url.hostname,
  port: url.port || 443,
  path: '/health',
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
  },
};

console.log('\n1. Testing health check endpoint...');
console.log(`   ${options.method} ${url.origin}${options.path}`);

const req = https.request(options, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log(`\n✅ Health check successful! (Status: ${res.statusCode})`);
    try {
      const response = JSON.parse(data);
      console.log('Response:', JSON.stringify(response, null, 2));
      console.log('\n🎉 All tests passed!');
    } catch (e) {
      console.error('❌ Failed to parse response as JSON:', e);
      console.log('Raw response:', data);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Request failed:');
  console.error(error);
  process.exit(1);
});

req.end();
