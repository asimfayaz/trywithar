import { r2Service } from '@/lib/r2';
import { NextResponse } from 'next/server';
import { supabase, photoService } from '@/lib/supabase';

// Helper function for CORS headers
function getCorsHeaders() {
  return {
    'Access-Control-Allow-Origin': process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000',
    'Access-Control-Allow-Credentials': 'true',
  };
}

export async function POST(request: Request) {
  let user = null;
  
  try {
    // Use existing Supabase client
    // supabase is already imported and ready to use
    
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
    user = userData.user;

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const originalName = formData.get('originalName') as string;

    if (!file || !originalName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400, headers: getCorsHeaders() }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await r2Service.uploadPhoto(buffer, originalName);

    // Create photo record with initial 'uploaded' status
    const photo = await photoService.createPhoto({
      user_id: user.id,
      front_image_url: result.url,
      generation_status: 'uploaded'
    });

    return NextResponse.json({
      ...result,
      photoId: photo.id
    }, { headers: getCorsHeaders() });
  } catch (error) {
    console.error('Error uploading photo:', error);
    
    // Create failed record if we have user context
    if (user) {
      await photoService.createPhoto({
        user_id: user.id,
        front_image_url: '', // Empty since upload failed
        generation_status: 'upload_failed' as any // Temporary workaround
      });
    }

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
