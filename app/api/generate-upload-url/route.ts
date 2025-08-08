import { NextResponse } from 'next/server';
import { r2Service } from '@/lib/r2';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: Request) {
  try {
    const { fileName, contentType, prefix } = await request.json();
    const fileExtension = fileName.split('.').pop() || 'png';
    const uniqueFileName = `${prefix || 'nobgr'}/${uuidv4()}.${fileExtension}`;

    const presignedUrl = await r2Service.generatePresignedUrl(uniqueFileName, contentType);
    
    return NextResponse.json({
      status: 'success',
      presignedUrl,
      key: uniqueFileName
    });
  } catch (error) {
    console.error('Presigned URL generation error:', error);
    return NextResponse.json(
      { status: 'error', message: 'Failed to generate upload URL' },
      { status: 500 }
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
