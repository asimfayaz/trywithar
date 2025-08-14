import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { ModelService } from "@/lib/supabase/model.service";

function getCorsHeaders() {
  return {
    'Access-Control-Allow-Origin': process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000',
    'Access-Control-Allow-Credentials': 'true',
  };
}

export async function POST(request: NextRequest) {
  let user = null;
  let modelId: string | null = null;
  
  try {
    const body = await request.json();
    modelId = body.modelId;
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.split(' ')[1];
    
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized - Missing token' },
        { status: 401, headers: getCorsHeaders() }
      );
    }

    const { data: userData, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !userData.user) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid token' },
        { status: 401, headers: getCorsHeaders() }
      );
    }
    user = userData.user;

    if (!modelId) {
      return NextResponse.json(
        { error: 'Missing required field: modelId' },
        { status: 400, headers: getCorsHeaders() }
      );
    }

    const modelService = new ModelService();
    const model = await modelService.getModel(modelId);
    
    if (model.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized - Model ownership mismatch' },
        { status: 403, headers: getCorsHeaders() }
      );
    }

    // Client handles background removal - just update status
    await modelService.updateModelStatus(model.id, 'removing_background');

    return NextResponse.json(
      { success: true },
      { headers: getCorsHeaders() }
    );
  } catch (error) {
    console.error('Error in remove-background:', error);
    
    if (user && modelId) {
      const modelService = new ModelService();
      try {
        await modelService.updateModelStatus(modelId, 'failed');
      } catch (updateError) {
        console.error('Failed to update model status:', updateError);
      }
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: getCorsHeaders() }
    );
  }
}

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
