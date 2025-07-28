import { NextRequest, NextResponse } from 'next/server';
import { Hunyuan3DClient } from '@/lib/hunyuan3d/client';

/**
 * Job Status endpoint
 * GET /api/status?job_id=xxx
 * 
 * Retrieves the status of a 3D model generation job using query parameters
 * to match the external Hunyuan3D API format
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('job_id');
    
    if (!jobId) {
      return NextResponse.json(
        { error: 'Missing job_id', message: 'Job ID is required as query parameter' },
        { status: 400 }
      );
    }
    
    const client = new Hunyuan3DClient();
    const status = await client.getJobStatus(jobId);
    
    return NextResponse.json(status, { status: 200 });
  } catch (error) {
    console.error(`Error checking status for job:`, error);
    return NextResponse.json(
      { error: 'Status check failed', message: (error as Error).message },
      { status: 500 }
    );
  }
}
