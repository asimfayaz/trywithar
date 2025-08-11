import { NextRequest, NextResponse } from 'next/server';
import { Hunyuan3DClient } from '@/lib/hunyuan3d/client';
import { r2Service } from '@/lib/r2';
import { photoService } from '@/lib/supabase';

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
    
    // If model is completed and has a GLB file, download and store it permanently
    if (status.status === 'completed' && status.model_urls?.glb) {
      console.log(`📥 Model completed for job ${jobId}, downloading and storing permanently...`);
      
      try {
        // Find the photo record associated with this job
        const photos = await photoService.getPhotosByJobId(jobId);
        const photo = photos[0]; // Should only be one photo per job
        
        if (photo) {
          // Check if we've already downloaded this model
          if (!photo.model_url || photo.model_url === status.model_urls.glb) {
            // Download the model file from Hunyuan3D
            const modelResponse = await fetch(status.model_urls.glb);
            if (modelResponse.ok) {
              const modelBuffer = Buffer.from(await modelResponse.arrayBuffer());
              console.log(`📦 Downloaded model file, size: ${modelBuffer.length} bytes`);
              
              // Generate a filename for the model
              const filename = `model-${photo.id}.glb`;
              
              // Upload to R2 storage
              console.log(`☁️ Uploading model to R2 storage...`);
              const uploadResult = await r2Service.uploadModel(modelBuffer, filename);
              console.log(`✅ Model uploaded to R2: ${uploadResult.url}`);
              
              // Update the photo record with the permanent R2 URL
              await photoService.updatePhoto(photo.id, {
                model_url: uploadResult.url,
                generation_status: 'model_saved'
              });
              
              console.log(`💾 Updated photo record with permanent model URL`);
              
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
            console.log(`Model already stored permanently: ${photo.model_url}`);
            // Return the status with the permanent R2 URL
            return NextResponse.json({
              ...status,
              model_urls: {
                ...status.model_urls,
                glb: photo.model_url // Return permanent R2 URL
              }
            }, { status: 200 });
          }
        } else {
          console.error(`No photo found for job ${jobId}`);
        }
      } catch (error) {
        console.error('Error downloading and storing model:', error);
        
        // Update photo status to model_saving_failed
        try {
          // Find the photo record associated with this job again
          const failedPhotos = await photoService.getPhotosByJobId(jobId);
          const failedPhoto = failedPhotos[0]; // Should only be one photo per job
          
          if (failedPhoto) {
            await photoService.updatePhoto(failedPhoto.id, {
              generation_status: 'model_saving_failed'
            });
            console.log('📝 Updated photo status to model_saving_failed');
          }
        } catch (statusError) {
          console.error('❌ Failed to update photo status:', statusError);
        }
        
        // Continue with original response if download fails
      }
    }
    
    // If status is 'failed', update the photo record
    if (status.status === 'failed') {
      try {
        // Find the photo record associated with this job
        const photos = await photoService.getPhotosByJobId(jobId);
        const photo = photos[0]; // Should only be one photo per job
        
        if (photo) {
          await photoService.updatePhoto(photo.id, {
            generation_status: 'model_generation_failed'
          });
          console.log('📝 Updated photo status to model_generation_failed due to failed job');
        }
      } catch (statusError) {
        console.error('❌ Failed to update photo status for failed job:', statusError);
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
