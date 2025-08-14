import { NextRequest, NextResponse } from 'next/server';
import { Hunyuan3DClient } from '@/lib/hunyuan3d/client';
import { r2Service } from '@/lib/r2';
import { jobService, modelService } from '@/lib/supabase';

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
    const externalJobId = searchParams.get('job_id');
    
    if (!externalJobId) {
      return NextResponse.json(
        { error: 'Missing job_id', message: 'Job ID is required as query parameter' },
        { status: 400 }
      );
    }
    
    // Get job record by external job ID
    let job;
    try {
      job = await jobService.getJobByExternalId(externalJobId);
      if (!job) {
        throw new Error(`Job not found for external ID: ${externalJobId}`);
      }
    } catch (error) {
      console.error(`❌ Failed to find job for external ID ${externalJobId}:`, error);
      return NextResponse.json(
        { error: 'Job not found', message: (error as Error).message },
        { status: 404 }
      );
    }
    
    const internalJobId = job.id;
    const client = new Hunyuan3DClient();
    const status = await client.getJobStatus(externalJobId);
    
    // If model is completed and has a GLB file, download and store it permanently
    // Update job record with current status
    try {
      await jobService.updateJob(internalJobId, {
        api_status: status.status,
        api_stage: status.stage || 'queued',
        progress: status.progress || 0
      });
      console.log(`📝 Updated job record for job ${externalJobId} (internal ID: ${internalJobId}) with status ${status.status}`);
    } catch (updateError) {
      console.error(`❌ Failed to update job record for job ${externalJobId}:`, updateError);
    }

    if (status.status === 'completed' && status.model_urls?.glb) {
      console.log(`📥 Model completed for job ${externalJobId}, downloading and storing permanently...`);
      
      try {
        // Find the model record associated with this job
        const models = await modelService.getModelsByJobId(internalJobId);
        const model = models[0]; // Should only be one model per job
        
        if (model) {
          // Check if we've already downloaded this model
          if (!model.model_url || model.model_url === status.model_urls.glb) {
            // Download the model file from Hunyuan3D
            const modelResponse = await fetch(status.model_urls.glb);
            if (modelResponse.ok) {
              const modelBuffer = Buffer.from(await modelResponse.arrayBuffer());
              console.log(`📦 Downloaded model file, size: ${modelBuffer.length} bytes`);
              
              // Generate a filename for the model
              const filename = `model-${model.id}.glb`;
              
              // Upload to R2 storage
              console.log(`☁️ Uploading model to R2 storage...`);
              const uploadResult = await r2Service.uploadModel(modelBuffer, filename);
              console.log(`✅ Model uploaded to R2: ${uploadResult.url}`);
              
              // Update both job and model records with the permanent R2 URL
              await jobService.updateJob(internalJobId, {
                model_url: uploadResult.url,
                completed_at: new Date().toISOString()
              });
              
              await modelService.updateModel(model.id, {
                model_url: uploadResult.url,
                model_status: 'completed'
              });
              
              console.log(`💾 Updated job and model records with permanent model URL`);
              
              // Return the status with the permanent R2 URL instead of temporary Hunyuan3D URL
              return NextResponse.json({
                ...status,
                model_urls: {
                  ...status.model_urls,
                  glb: uploadResult.url // Return permanent R2 URL
                }
              }, { status: 200 });
            } else {
              console.error(`Failed to download model file: ${modelResponse.status} ${modelResponse.statusText}`);
            }
          } else {
            console.log(`Model already stored permanently: ${model.model_url}`);
            // Return the status with the permanent R2 URL
            return NextResponse.json({
              ...status,
              model_urls: {
                ...status.model_urls,
                glb: model.model_url // Return permanent R2 URL
              }
            }, { status: 200 });
          }
        } else {
          console.error(`No model found for job ${externalJobId}`);
        }
      } catch (error) {
        console.error('Error downloading and storing model:', error);
        
        // Update model status to model_saving_failed
        try {
          // Find the model record associated with this job again
          const failedModels = await modelService.getModelsByJobId(internalJobId);
          const failedModel = failedModels[0]; // Should only be one model per job
          
          if (failedModel) {
            await modelService.updateModel(failedModel.id, {
              model_status: 'failed'
            });
            console.log('📝 Updated model status to failed');
          }
        } catch (statusError) {
          console.error('❌ Failed to update model status:', statusError);
        }
        
        // Continue with original response if download fails
      }
    }
    
    // If status is 'failed', update the job and model records
    if (status.status === 'failed') {
      try {
        await jobService.updateJob(internalJobId, {
          error_message: status.detail || 'Job failed without error message',
          completed_at: new Date().toISOString()
        });
        
        // Find the model record associated with this job
        const models = await modelService.getModelsByJobId(internalJobId);
        const model = models[0]; // Should only be one model per job
        
        if (model) {
          await modelService.updateModel(model.id, {
            model_status: 'failed'
          });
          console.log('📝 Updated model status to failed due to failed job');
        }
      } catch (statusError) {
        console.error('❌ Failed to update job and model records for failed job:', statusError);
      }
    }
    
    return NextResponse.json(status, { status: 200 });
  } catch (error) {
    console.error(`Error checking status for job:`, error);
    return NextResponse.json(
      { error: 'Status check failed', message: (error as Error).message },
      { status: 500 }
    );
  }
}
