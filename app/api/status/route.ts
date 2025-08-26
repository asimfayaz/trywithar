import { NextRequest, NextResponse } from 'next/server';
import { jobService } from '@/lib/supabase';
import { ModelService } from '@/lib/supabase/model.service';
import { supabaseServer } from '@/lib/supabase-server';
import { FirtozTrellisService } from '@/lib/firtoz-trellis/service';

const modelService = new ModelService();

/**
 * Job Status endpoint
 * GET /api/status?job_id=xxx
 * 
 * Retrieves the status of a 3D model generation job from our database
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const externalJobId = searchParams.get('job_id');
    
    if (!externalJobId) {
      return NextResponse.json(
        { error: 'Missing job_id', message: 'Job ID is required as query parameter' },
        { status: 400 }
      );
    }
    
    // Check if job ID is a UUID
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(externalJobId);
    let job = null;

    if (isUuid) {
      // Fetch by internal job ID
      const { data, error } = await supabaseServer
        .from('jobs')
        .select('*')
        .eq('id', externalJobId)
        .maybeSingle();
      
      if (error) throw error;
      job = data;
    } else {
      // Fetch by external job ID
      const { data, error } = await supabaseServer
        .from('jobs')
        .select('*')
        .eq('external_job_id', externalJobId)
        .maybeSingle();
      
      if (error) throw error;
      job = data;
    }
    
    if (!job) {
      console.error(`❌ Job not found for ID ${externalJobId}`);
      return NextResponse.json(
        { error: 'Job not found', message: `Job with ID ${externalJobId} not found` },
        { status: 404 }
      );
    }
    
    // Construct response in the expected format
    // If job is not terminal and stale, poll Replicate for updated status
    const STALE_JOB_THRESHOLD = 5 * 60 * 1000; // 5 minutes
    const terminalStatuses = ['succeeded', 'failed', 'canceled'];
    
    if (!terminalStatuses.includes(job.api_status)) {
      const now = new Date();
      const lastUpdated = new Date(job.updated_at);
      const timeDiff = now.getTime() - lastUpdated.getTime();
      
      if (timeDiff > STALE_JOB_THRESHOLD) {
        try {
          const service = new FirtozTrellisService();
          console.log(`Polling Replicate API for job: ${job.external_job_id}`);
          const currentStatus = await service.getPredictionStatus(job.external_job_id);
          console.log(`Replicate API response for ${job.external_job_id}:`, currentStatus);
          
          // Update job record with current status
          const { error: updateError } = await supabaseServer
            .from('jobs')
            .update({
              api_status: currentStatus.status,
              ...(currentStatus.output?.model_file && { model_url: currentStatus.output.model_file }),
              ...(currentStatus.error && { error_message: currentStatus.error }),
              updated_at: new Date().toISOString()
            })
            .eq('id', job.id);
          
          if (!updateError) {
            // Refetch updated job
            const { data: updatedJob } = await supabaseServer
              .from('jobs')
              .select('*')
              .eq('id', job.id)
              .single();
            
            if (updatedJob) job = updatedJob;
          }
        } catch (error) {
          console.error('Replicate polling failed:', error);
        }
      }
    }
    
    // Map Replicate status to UI-friendly status
    const mapStatus = (status: string): string => {
      switch (status) {
        case 'starting': return 'queued';
        case 'processing': return 'processing';
        case 'succeeded': return 'completed';
        case 'failed': return 'failed';
        case 'canceled': return 'failed';
        default: return status;
      }
    };

    const response = {
      job_id: job.external_job_id,
      status: mapStatus(job.api_status),
      progress: job.progress || 0,
      ...(job.model_url ? { model_urls: { glb: job.model_url } } : {}),
      ...(job.error_message ? { detail: job.error_message } : {})
    };
    
    // Log the response for debugging
    console.log(`Status response for job ${job.external_job_id}:`, response);
    
    return NextResponse.json(response, { status: 200 });
    
  } catch (error) {
    console.error(`Error checking status for job:`, error);
    return NextResponse.json(
      { error: 'Status check failed', message: (error as Error).message },
      { status: 500 }
    );
  }
}
