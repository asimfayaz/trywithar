import { NextResponse } from 'next/server';
import { r2Service } from '@/lib/r2';

export async function POST(request: Request) {
  try {
    console.log('Received file upload request');
    
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    
    if (!file) {
      console.error('No file provided in form data');
      return NextResponse.json(
        { status: 'error', message: 'No file provided in form data' },
        { status: 400 }
      );
    }

    console.log(`Processing file: ${file.name} (${file.type}, ${file.size} bytes)`);
    
    const buffer = Buffer.from(await file.arrayBuffer());
    const key = `test-uploads/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_')}`;
    
    console.log('Uploading file to R2...');
    
    // Upload the file to R2
    const uploadResult = await r2Service.uploadFile(
      'photos',
      key,
      buffer,
      file.type || 'application/octet-stream'
    );

    console.log('File uploaded successfully, generating signed URL...');
    
    // Generate a signed URL for the uploaded file
    const signedUrl = await r2Service.getSignedUrl('photos', uploadResult.key);

    console.log('Signed URL generated successfully');

    return NextResponse.json({
      status: 'success',
      message: 'File uploaded successfully',
      data: {
        ...uploadResult,
        signedUrl,
      },
    });
  } catch (error) {
    console.error('R2 Upload Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error details:', { error: error instanceof Error ? error.stack : 'No stack trace' });
    
    return NextResponse.json(
      { 
        status: 'error', 
        message: 'Failed to upload file',
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? 
          (error instanceof Error ? error.stack : undefined) : 
          undefined
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // Just return a success message to verify the endpoint is working
    return NextResponse.json({
      status: 'success',
      message: 'R2 test endpoint is working',
      environment: {
        accountId: process.env.R2_ACCOUNT_ID ? 'Set' : 'Not set',
        photosBucket: process.env.R2_PHOTOS_BUCKET || 'Not set',
        modelsBucket: process.env.R2_MODELS_BUCKET || 'Not set',
      },
    });
  } catch (error) {
    console.error('R2 Test Error:', error);
    return NextResponse.json(
      { 
        status: 'error', 
        message: 'R2 test failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
