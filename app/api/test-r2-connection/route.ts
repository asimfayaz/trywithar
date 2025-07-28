import { NextResponse } from 'next/server';
import { r2Service } from '@/lib/r2';

export async function GET() {
  try {
    // Simple test to check if we can list objects (without actually listing them)
    // This will test the R2 connection and credentials
    const testKey = `connection-test-${Date.now()}.txt`;
    
    // Try to upload a small test file
    const uploadResult = await r2Service.uploadFile(
      'photos',
      testKey,
      Buffer.from('R2 Connection Test'),
      'text/plain'
    );
    
    // Try to generate a signed URL
    const signedUrl = await r2Service.getSignedUrl('photos', testKey);
    
    return NextResponse.json({
      status: 'success',
      message: 'R2 connection test successful',
      data: {
        uploadResult,
        signedUrl: signedUrl.split('?')[0], // Remove the signature part
      },
    });
  } catch (error) {
    console.error('R2 Connection Test Error:', error);
    return NextResponse.json(
      { 
        status: 'error',
        message: 'R2 connection test failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        ...(process.env.NODE_ENV === 'development' && {
          stack: error instanceof Error ? error.stack : undefined
        })
      },
      { status: 500 }
    );
  }
}
