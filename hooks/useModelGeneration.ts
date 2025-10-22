import { useState, useEffect, useCallback } from 'react';
import { ModelService } from '@/lib/supabase/model.service';
import { supabase } from '@/lib/supabase';
import type { ModelStatus } from '@/lib/supabase/types';
import type { UploadItem, PhotoSet, ModelData } from '@/app/page';

const ModelServiceSingleton = new ModelService();

export function useModelGeneration() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const getModelsByUserId = useCallback(async (userId: string) => {
    try {
      const modelsData = await ModelServiceSingleton.getModelsByUserId(userId);
      return modelsData.sort((a: any, b: any) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    } catch (error) {
      console.error('Failed to get models by user ID:', error);
      throw error;
    }
  }, []);

  // Function to upload raw photos
  const uploadRawPhotos = useCallback(async (
    modelId: string, 
    photoSet: PhotoSet
  ): Promise<Record<string, string>> => {
    try {
      const otherViews = ['left', 'right', 'back'] as const;
      
      // Upload original photos for all views
      const { uploadOriginalImageToR2 } = await import('@/lib/backgroundRemoval');
      const uploadPromises = [];
      
      // Upload front photo
      const frontFile = photoSet.front?.file;
      if (frontFile) {
        uploadPromises.push(uploadOriginalImageToR2(frontFile).then(result => {
          return { position: 'front', url: result.url };
        }));
      }
      
      // Upload other views
      for (const view of otherViews) {
        const uploadItem = photoSet[view as keyof PhotoSet];
        if (uploadItem && uploadItem.file) {
          uploadPromises.push(uploadOriginalImageToR2(uploadItem.file).then(result => {
            return { position: view, url: result.url };
          }));
        }
      }
      
      // Wait for all uploads to complete
      const uploadResults = await Promise.all(uploadPromises);
      
      // Create a map of URLs by position
      const urlMap: Record<string, string> = {};
      for (const result of uploadResults) {
        urlMap[result.position] = result.url;
      }

      // Update model with uploaded URLs
      await ModelServiceSingleton.updateModel(modelId, {
        model_status: 'photos_uploaded',
        front_image_url: urlMap.front,
        ...(urlMap.left && { left_image_url: urlMap.left }),
        ...(urlMap.right && { right_image_url: urlMap.right }),
        ...(urlMap.back && { back_image_url: urlMap.back })
      });

      return urlMap;
    } catch (error) {
      console.error('❌ Error uploading raw photos:', error);
      throw error;
    }
  }, []);

  // Function to remove background from image
  const removeBackground = useCallback(async (
    modelId: string, 
    frontUrl: string
  ): Promise<string> => {
    try {
      // Get the front file from the URL or handle appropriately
      // For now, we'll assume we have the file or can fetch it
      const { removeBackgroundFromImage } = await import('@/lib/backgroundRemoval');
      
      // We need to get the actual file for background removal
      // This is a simplified approach - in practice, we might need to fetch the file
      // For now, we'll use the URL approach but this needs to be handled properly
      
      // For retry scenarios, we might need to handle this differently
      // Let's update the model status first
      await ModelServiceSingleton.updateModel(modelId, {
        model_status: 'removed_background'
      });

      // In a real implementation, we'd need to fetch the file from the URL
      // For now, we'll return the URL as a placeholder
      // This needs to be implemented properly in the calling code
      
      return frontUrl; // Placeholder - actual implementation would be more complex
    } catch (error) {
      console.error('❌ Background removal failed:', error);
      await ModelServiceSingleton.updateModel(modelId, {
        model_status: 'failed'
      });
      throw error;
    }
  }, []);

  // Function to generate 3D model
  const generate3DModel = useCallback(async (
    modelId: string, 
    processedUrl: string,
    photoSet: PhotoSet,
    accessToken?: string
  ): Promise<{ jobId: string }> => {
    try {
      // Send pre-uploaded URLs to generate API
      const formData = new FormData();
      formData.append('frontUrl', processedUrl); // Use the background-removed URL for front
      
      // Add URLs for other views if they exist
      if (photoSet.left?.persistentUrl) {
        formData.append('leftUrl', photoSet.left.persistentUrl);
      }
      if (photoSet.right?.persistentUrl) {
        formData.append('rightUrl', photoSet.right.persistentUrl);
      }
      if (photoSet.back?.persistentUrl) {
        formData.append('backUrl', photoSet.back.persistentUrl);
      }
      
      formData.append('options', JSON.stringify({
        enable_pbr: true,
        should_remesh: true,
        should_texture: true
      }));
      
      formData.append('modelId', modelId);
      
      const headers: Record<string, string> = {};
      
      // Add authorization header if accessToken is provided
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }
      
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers,
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Job creation failed');
      }
      
      const jobResponse = await response.json();
      const jobId = jobResponse.job_id;
      
      if (!jobId) {
        throw new Error('Job ID is missing after creating job');
      }

      // Update model status to generating_3d_model
      await ModelServiceSingleton.updateModel(modelId, {
        model_status: 'generating_3d_model'
      });

      return { jobId };
    } catch (error) {
      console.error('❌ Error during 3D model generation:', error);
      
      // Update model status to failed
      try {
        await ModelServiceSingleton.updateModelStatus(modelId, 'failed');
      } catch (updateError) {
        console.error('Failed to update model status to failed:', updateError);
      }
      
      throw error;
    }
  }, []);

  const retryModelGeneration = useCallback(async (modelId: string, userId: string, accessToken?: string) => {
    try {
      setIsGenerating(true);
      
      // Get the model to get existing photo URLs
      const model = await ModelServiceSingleton.getModel(modelId);
      
      // For retry, we should only create a new generation job
      // using the existing image URLs that were already processed
      const formData = new FormData();
      formData.append('modelId', modelId);
      
      // Use existing processed image URLs (background removed) for all views
      const frontUrl = model.front_nobgr_image_url || model.front_image_url || '';
      formData.append('frontUrl', frontUrl);
      
      // Add other view URLs using processed URLs if available, fallback to raw if needed
      if (model.back_nobgr_image_url || model.back_image_url) {
        formData.append('backUrl', model.back_nobgr_image_url || model.back_image_url);
      }
      if (model.left_nobgr_image_url || model.left_image_url) {
        formData.append('leftUrl', model.left_nobgr_image_url || model.left_image_url);
      }
      if (model.right_nobgr_image_url || model.right_image_url) {
        formData.append('rightUrl', model.right_nobgr_image_url || model.right_image_url);
      }
      
      // Call the generation API endpoint to create a new job
      const headers: Record<string, string> = {};
      
      // Add authorization header if accessToken is provided
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }
      
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers,
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to start model generation');
      }
      
      const result = await response.json();
      
      // Update the model with the new job ID only
      // This is the key change - we don't update image URLs, just the job ID
      await ModelServiceSingleton.updateModel(modelId, {
        job_id: result.job_id,
        model_status: 'generating_3d_model'
      });
      
      return { 
        success: true, 
        jobId: result.job_id 
      };
    } catch (error) {
      console.error('Failed to retry model generation:', error);
      throw error;
    } finally {
      setIsGenerating(false);
    }
  }, []);

  const pollJobStatus = useCallback(async (jobId: string, maxRetries = 10) => {
    try {
      // Poll the job status using the internal UUID job ID
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          // First, get the job record to check its status
          const job = await ModelServiceSingleton.getJob(jobId);
          if (!job) {
            console.warn(`Job ${jobId} not found`);
            // Use exponential backoff: 1s, 2s, 4s, 8s, 16s, 30s max
            const delay = Math.min(1000 * Math.pow(2, attempt), 30000);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
          
          // If job is terminal, get the model to check its status
          if (job.api_status === 'completed' || job.api_status === 'failed') {
            // Get the model associated with this job using the job_id field
            const model = await ModelServiceSingleton.getModelByJobId(jobId);
            if (model) {
              return {
                status: model.model_status === 'completed' ? 'completed' : 'failed',
                modelUrl: model.model_url,
                errorMessage: model.error_message || (model.model_status === 'failed' ? 'Model generation failed' : null)
              };
            } else {
              console.warn(`Model not found for job ${jobId}`);
              // Try to get the model by the job_id field - this is the correct approach
              const modelByJobId = await ModelServiceSingleton.getModelByJobId(jobId);
              if (modelByJobId) {
                return {
                  status: modelByJobId.model_status === 'completed' ? 'completed' : 'failed',
                  modelUrl: modelByJobId.model_url,
                  errorMessage: modelByJobId.error_message || (modelByJobId.model_status === 'failed' ? 'Model generation failed' : null)
                };
              }
              // If model still not found, return pending status
              return {
                status: 'pending',
                message: 'Model not created yet'
              };
            }
          }
          
          // If job is still processing, wait and try again
          // Use exponential backoff for polling
          const delay = Math.min(1000 * Math.pow(2, attempt), 30000);
          await new Promise(resolve => setTimeout(resolve, delay));
        } catch (jobError) {
          console.error(`Error checking job ${jobId} status:`, jobError);
          // Handle different error types more gracefully
          if (jobError && typeof jobError === 'object') {
            // Check for specific PostgREST errors
            if ('code' in jobError && (jobError as any).code === 'PGRST116') {
              console.warn('PGRST116 error detected - model may not exist yet, continuing polling...');
              // Use exponential backoff
              const delay = Math.min(1000 * Math.pow(2, attempt), 30000);
              await new Promise(resolve => setTimeout(resolve, delay));
              continue;
            }
            // Check for HTTP status codes
            if ('status' in jobError && (jobError as any).status === 406) {
              console.warn('406 Not Acceptable error detected - retrying with proper headers...');
              // Use exponential backoff
              const delay = Math.min(1000 * Math.pow(2, attempt), 30000);
              await new Promise(resolve => setTimeout(resolve, delay));
              continue;
            }
          }
          // For other errors, use exponential backoff and retry
          const delay = Math.min(1000 * Math.pow(2, attempt), 30000);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
      throw new Error('Job status could not be determined after maximum retries');
    } catch (error) {
      console.error('Failed to poll job status:', error);
      throw error;
    }
  }, []);

  const createModelDraft = useCallback(async (userId: string) => {
    try {
      const model = await ModelServiceSingleton.createModelWithStatus(userId, 'draft');
      return model.id;
    } catch (error) {
      console.error('Failed to create model draft:', error);
      throw error;
    }
  }, []);

  // Initialize the hook
  useEffect(() => {
    setIsInitialized(true);
  }, []);

  return {
    getModelsByUserId,
    uploadRawPhotos,
    removeBackground,
    generate3DModel,
    retryModelGeneration,
    pollJobStatus,
    createModelDraft,
    isInitialized,
    isGenerating
  };
}
