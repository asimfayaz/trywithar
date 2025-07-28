import { Hunyuan3DClient } from '../lib/hunyuan3d/client';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables from .env.local if it exists
const envPath = path.resolve(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

// Simple function to get environment variable or throw error
function getEnvVar(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} environment variable is not set`);
  }
  return value;
}

async function testHealthCheck() {
  console.log('Testing Hunyuan3D API Health Check...');
  
  try {
    const client = new Hunyuan3DClient();
    const health = await client.checkHealth();
    
    console.log('✅ Health Check Successful!');
    console.log('Status:', health.status);
    console.log('Version:', health.version);
    if (health.message) console.log('Message:', health.message);
    
    return true;
  } catch (error) {
    console.error('❌ Health Check Failed:');
    console.error(error instanceof Error ? error.message : error);
    return false;
  }
}

// Run the test
(async () => {
  console.log('🔍 Starting Hunyuan3D API Tests...');
  console.log('----------------------------------');
  
  // Test 1: Health Check
  console.log('\n1. Testing Health Check Endpoint...');
  const healthCheckPassed = await testHealthCheck();
  
  console.log('\n----------------------------------');
  console.log('Test Results:');
  console.log(`✅ Health Check: ${healthCheckPassed ? 'PASSED' : 'FAILED'}`);
  
  if (!healthCheckPassed) {
    console.log('\n❌ Some tests failed. Please check the error messages above.');
    process.exit(1);
  }
  
  console.log('\n✅ All tests passed!');
})();
