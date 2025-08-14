import { r2Service } from '@/lib/r2';
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Helper function for CORS headers
function getCorsHeaders() {
  return {
    'Access-Control-Allow-Origin': process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000',
    'Access-Control-Allow-Credentials': 'true',
  };
}

export async function POST(request: Request) {
  try {
    // Get JWT from Authorization header
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.split(' ')[1];
    
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized - Missing token' },
        { status: 401, headers: getCorsHeaders() }
      );
    }

    // Verify token with Supabase
    const { data: userData, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !userData.user) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid token' },
        { status: 401, headers: getCorsHeaders() }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'Missing required file' },
        { status: 400, headers: getCorsHeaders() }
      );
    }

    // Upload file to R2 storage
    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await r2Service.uploadPhoto(buffer, file.name);

    return NextResponse.json({
      url: result.url
    }, { headers: getCorsHeaders() });
  } catch (error) {
    console.error('Error uploading photo:', error);
    return NextResponse.json(
      { error: 'Failed to upload photo' },
      { status: 500, headers: getCorsHeaders() }
    );
  }
}

// Handle OPTIONS requests for CORS preflight
export async function OPTIONS() {
  return NextResponse.json({}, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }
  });
}
