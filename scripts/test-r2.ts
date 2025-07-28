import { r2Service } from '../lib/r2';
import fs from 'fs/promises';
import path from 'path';

async function testR2() {
  try {
    console.log('Starting R2 connection test...');
    
    // Create a test file
    const testFilePath = path.join(process.cwd(), 'test-file.txt');
    await fs.writeFile(testFilePath, 'Hello, R2! This is a test file.');
    
    // Upload the test file
    console.log('Uploading test file...');
    const uploadResult = await r2Service.uploadFile(
      'photos',
      `test-${Date.now()}.txt`,
      await fs.readFile(testFilePath),
      'text/plain'
    );
    
    console.log('File uploaded successfully:', uploadResult);
    
    // Generate a signed URL
    console.log('Generating signed URL...');
    const signedUrl = await r2Service.getSignedUrl('photos', uploadResult.key);
    console.log('Signed URL:', signedUrl);
    
    // Clean up
    await fs.unlink(testFilePath);
    
    console.log('✅ R2 connection test completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ R2 connection test failed:');
    console.error(error instanceof Error ? error.message : error);
    if (error instanceof Error && error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

testR2();
