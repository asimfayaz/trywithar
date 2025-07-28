import { NextResponse } from 'next/server';
import { Hunyuan3DClient } from '@/lib/hunyuan3d/client';

/**
 * Health check endpoint for Hunyuan3D API
 * GET /api/health
 */
export async function GET() {
  try {
    const client = new Hunyuan3DClient();
    const healthStatus = await client.checkHealth();
    
    return NextResponse.json(healthStatus, { status: 200 });
  } catch (error) {
    console.error('Health check failed:', error);
    return NextResponse.json(
      { error: 'Health check failed', message: (error as Error).message },
      { status: 500 }
    );
  }
}
