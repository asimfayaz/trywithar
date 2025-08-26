import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { FirtozTrellisService } from '@/lib/firtoz-trellis/service';
import { r2Service } from '@/lib/r2';
import { mapReplicateStatus } from '@/lib/utils/mapReplicateStatus';

export async function POST(request: NextRequest) {
  try {
    // Extract token from Authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Authorization header missing' }, { status: 401 });
    }
    
    const token = authHeader.split(' ')[1];
    if (!token) {
      return NextResponse.json({ error: 'Token missing' }, { status: 401 });
    }

    // Create authenticated client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      }
    );

    // Verify token and get user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = user.id;
    const now = new Date();
    // Get all non-terminal, non-expired jobs for this user
    const { data: initialJobs, error: jobsError } = await supabase
      .from('jobs')
      .select('*')
      .eq('user_id', userId)
      .not('api_status', 'in', '("succeeded", "failed", "canceled")')
      .gt('expires_at', now.toISOString());

    if (jobsError) throw jobsError;
    
    // Filter out jobs that have already completed (model_status completed)
    const jobsToRefresh = [];
    for (const job of initialJobs) {
      const { data: model, error: modelError } = await supabase
        .from('models')
        .select('model_status')
        .eq('job_id', job.id)
        .single();
      
      if (modelError) {
        console.error(`Error fetching model for job ${job.id}:`, modelError);
        jobsToRefresh.push(job);
      } else if (model.model_status !== 'completed') {
        jobsToRefresh.push(job);
      }
    }
    
    console.log(`Found ${jobsToRefresh.length} jobs to refresh after filtering`);
    
    const service = new FirtozTrellisService();
    const updatedJobs = [];
    const terminalStatuses = ['succeeded', 'failed', 'canceled'];
    
    // Reuse the existing 'now' variable
    const currentTime = new Date();

    for (const job of jobsToRefresh) {
      console.log(`Processing job ${job.id} (external: ${job.external_job_id})`);
      try {
        // Skip terminal status jobs
        if (terminalStatuses.includes(job.api_status)) {
          console.log(`Skipping terminal job: ${job.id}`);
          continue;
        }
        
        // Skip and mark expired jobs as failed
        if (new Date(job.expires_at) < now) {
          console.log(`Marking expired job as failed: ${job.id}`);
          await supabase
            .from('jobs')
            .update({ 
              api_status: 'failed', 
              error_message: 'Job expired' 
            })
            .eq('id', job.id);
          
          await supabase
            .from('models')
            .update({ model_status: 'failed' })
            .eq('job_id', job.id);
          
          continue;
        }
        
        // Only process non-terminal, non-expired jobs
        const currentStatus = await service.getPredictionStatus(job.external_job_id);
        
        // Map Replicate status to internal status
        const internalStatus = mapReplicateStatus(currentStatus.status);
        
        // Store model file in R2 if available
        let storedModelUrl = null;
        if (currentStatus.output?.model_file) {
          try {
            // Download model from Replicate
            const response = await fetch(currentStatus.output.model_file);
            const buffer = await response.arrayBuffer();
            
            // Upload to our R2 storage
            const fileName = currentStatus.output.model_file.split('/').pop() || 'model.glb';
            const result = await r2Service.uploadModel(
              Buffer.from(buffer),
              fileName
            );
            
            storedModelUrl = result.url;
          } catch (error) {
            console.error(`Failed to store model file for job ${job.id}:`, error);
            storedModelUrl = currentStatus.output.model_file; // Fallback to original URL
          }
        }
        
        // Update job in database
        const { error: updateError } = await supabase
          .from('jobs')
          .update({
            api_status: internalStatus,
            ...(storedModelUrl && { model_url: storedModelUrl }),
            ...(currentStatus.error && { error_message: currentStatus.error }),
            updated_at: now.toISOString()
          })
          .eq('id', job.id);

        // Always add to updatedJobs even if updateError exists
        updatedJobs.push({
          job_id: job.id,
          status: currentStatus.status,
          external_job_id: job.external_job_id
        });
        
        // Update the linked model if job succeeded or failed
        if (currentStatus.status === 'succeeded' || currentStatus.status === 'failed') {
          await supabase
            .from('models')
            .update({ 
              model_status: currentStatus.status === 'succeeded' ? 'completed' : 'failed',
              ...(storedModelUrl && { model_url: storedModelUrl })
            })
            .eq('job_id', job.id);
        }
        
        // Log update errors separately
        if (updateError) {
          console.error(`Failed to update job ${job.id}:`, updateError);
        }
      } catch (error) {
        console.error(`Error updating job ${job.id}:`, error);
      }
    }

    return NextResponse.json({ updatedJobs });
  } catch (error) {
    console.error('Job refresh error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
