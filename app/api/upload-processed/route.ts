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

    // Validate file type
    if (!file.type.startsWith('image/')) {
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
    
    // Determine the upload path based on whether it's processed or original
    const uploadPath = isProcessed 
      ? `processed/${uniqueFileName}` 
      : `original/${uniqueFileName}`;
    
    // Upload to the photos bucket
    const uploadResult = await r2Service.uploadFile(
      'photos', // Bucket name
      uploadPath, // Key
      fileData, // File data as Uint8Array
      file.type // Content type
    );
    
    console.log('File uploaded to R2:', uploadResult);

    // Create a response with the uploaded file info
    const response = NextResponse.json({
      status: 'success',
      message: 'File uploaded successfully',
      data: {
        originalFileName: file.name,
        uploadedFileName: uniqueFileName,
        url: uploadResult.url,
        key: uploadPath,
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
