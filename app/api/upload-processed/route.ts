import { NextResponse } from 'next/server';
import { r2Service } from '@/lib/r2';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: Request) {
  try {
    // Parse the form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const isProcessed = formData.get('processed') === 'true';
    
    if (!file) {
      return NextResponse.json(
        { status: 'error', message: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type - allow common image formats including HEIC
    const allowedTypes = [
      'image/',
      'image/heic',
      'image/heif'
    ];
    
    const isAllowedType = allowedTypes.some(type => 
      file.type.startsWith(type) || 
      file.type === 'application/octet-stream' // Some browsers send this for HEIC
    );
    
    if (!isAllowedType) {
      return NextResponse.json(
        { status: 'error', message: 'Only image files are allowed' },
        { status: 400 }
      );
    }

    console.log(`Uploading ${isProcessed ? 'processed' : 'original'} image: ${file.name}`);
    
    // Convert file to Uint8Array for R2 upload
    const arrayBuffer = await file.arrayBuffer();
    const fileData = new Uint8Array(arrayBuffer);
    
    // Generate a unique filename
    const fileExtension = file.name.split('.').pop() || 'png';
    const uniqueFileName = `${uuidv4()}.${fileExtension}`;
    
    // Upload using the appropriate R2 service method
    const uploadResult = isProcessed 
      ? await r2Service.uploadProcessedPhoto(Buffer.from(fileData), uniqueFileName)
      : await r2Service.uploadPhoto(Buffer.from(fileData), uniqueFileName);
    
    console.log('File uploaded to R2:', uploadResult);

    // Create a response with the uploaded file info
    const response = NextResponse.json({
      status: 'success',
      message: 'File uploaded successfully',
      data: {
        originalFileName: file.name,
        uploadedFileName: uniqueFileName,
        url: uploadResult.url,
        key: uploadResult.key,
        isProcessed,
      },
    });

    return response;
  } catch (error) {
    console.error('Upload endpoint error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    return NextResponse.json(
      { 
        status: 'error',
        message: 'Failed to upload file',
        error: errorMessage,
        ...(process.env.NODE_ENV === 'development' && { stack: errorStack })
      },
      { 
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      }
    );
  }
}

// Add OPTIONS handler for CORS preflight
export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
