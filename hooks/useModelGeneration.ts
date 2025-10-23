import { useState, useEffect, useCallback } from 'react';
import { ModelService } from '@/lib/supabase/model.service';
import type { PhotoSet } from '@/app/page';

// Singleton instance to ensure consistent state across hook calls
const ModelServiceSingleton = new ModelService();

/**
 * Custom hook for managing 3D model generation workflow
 * Handles the complete pipeline: photo upload → background removal → 3D generation → polling
 */
export function useModelGeneration() {

  // ==================== State Management ====================
  const [isInitialized, setIsInitialized] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // ==================== Model Retrieval ====================
  
  /**
   * Fetches all models for a specific user, sorted by updated_at timestamp (newest first)
   * @param userId - The user's unique identifier
   * @returns Sorted array of model data
   */
  const getModelsByUserId = useCallback(async (userId: string) => {
    try {
      const modelsData = await ModelServiceSingleton.getModelsByUserId(userId);
      return modelsData.sort((a: any, b: any) => 
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );
    } catch (error) {
      console.error('Failed to get models by user ID:', error);
      throw error;
    }
  }, []);

  // ==================== Photo Upload Pipeline ====================
  
  /**
   * Uploads raw photos (front, left, right, back) to R2 storage
   * Updates the model record with uploaded URLs
   * @param modelId - The model's unique identifier
   * @param photoSet - Object containing photos for different views
   * @returns Map of position to uploaded URL
   */
  const uploadRawPhotos = useCallback(async (
    modelId: string, 
    photoSet: PhotoSet
  ): Promise<Record<string, string>> => {
    try {
      const otherViews = ['left', 'right', 'back'] as const;
      const { uploadOriginalImageToR2 } = await import('@/lib/backgroundRemoval');
      const uploadPromises = [];
      
      // Upload front photo (required)
      const frontFile = photoSet.front?.file;
      if (frontFile) {
        uploadPromises.push(
          uploadOriginalImageToR2(frontFile).then(result => ({
            position: 'front',
            url: result.url
          }))
        );
      }
      
      // Upload additional views (optional)
      for (const view of otherViews) {
        const uploadItem = photoSet[view as keyof PhotoSet];
        if (uploadItem && uploadItem.file) {
          uploadPromises.push(
            uploadOriginalImageToR2(uploadItem.file).then(result => ({
              position: view,
              url: result.url
            }))
          );
        }
      }
      
      // Wait for all uploads to complete in parallel
      const uploadResults = await Promise.all(uploadPromises);
      
      // Build URL map from upload results
      const urlMap: Record<string, string> = {};
      for (const result of uploadResults) {
        urlMap[result.position] = result.url;
      }

      // Update model record with uploaded URLs
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

  // ==================== Background Removal ====================
  
  /**
   * Removes background from the front image
   * NOTE: Current implementation is a placeholder - needs proper file fetching
   * @param modelId - The model's unique identifier
   * @param frontUrl - URL of the front image
   * @returns URL of the processed image
   */
  const removeBackground = useCallback(async (
    modelId: string, 
    frontUrl: string
  ): Promise<string> => {
    try {
      // Update model status to indicate background removal stage
      await ModelServiceSingleton.updateModel(modelId, {
        model_status: 'removed_background'
      });

      // TODO: Implement actual background removal
      // Need to fetch file from URL and process it
      return frontUrl; // Placeholder
    } catch (error) {
      console.error('❌ Background removal failed:', error);
      await ModelServiceSingleton.updateModel(modelId, {
        model_status: 'failed'
      });
      throw error;
    }
  }, []);

  // ==================== 3D Model Generation ====================
  
  /**
   * Initiates 3D model generation by sending photos to the generation API
   * @param modelId - The model's unique identifier
   * @param processedUrl - URL of the background-removed front image
   * @param photoSet - Photo set containing URLs for additional views
   * @param accessToken - Optional authentication token
   * @returns Object containing the job ID for polling
   */
  const generate3DModel = useCallback(async (
    modelId: string, 
    processedUrl: string,
    photoSet: PhotoSet,
    accessToken?: string
  ): Promise<{ jobId: string }> => {
    try {
      // Prepare form data with image URLs
      const formData = new FormData();
      formData.append('frontUrl', processedUrl);
      formData.append('modelId', modelId);

      // Add optional view URLs
      if (photoSet.left?.persistentUrl) {
        formData.append('leftUrl', photoSet.left.persistentUrl);
      }
      if (photoSet.right?.persistentUrl) {
        formData.append('rightUrl', photoSet.right.persistentUrl);
      }
      if (photoSet.back?.persistentUrl) {
        formData.append('backUrl', photoSet.back.persistentUrl);
      }
      
      // Configure generation options
      formData.append('options', JSON.stringify({
        enable_pbr: true,
        should_remesh: true,
        should_texture: true
      }));
      
      // Set up authentication if token provided
      const headers: Record<string, string> = {};
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }
      
      // Call generation API
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

      // Update model status to indicate generation in progress
      await ModelServiceSingleton.updateModel(modelId, {
        model_status: 'generating_3d_model'
      });

      return { jobId };
    } catch (error) {
      console.error('❌ Error during 3D model generation:', error);
      
      // Mark model as failed on error
      try {
        await ModelServiceSingleton.updateModelStatus(modelId, 'failed');
      } catch (updateError) {
        console.error('Failed to update model status to failed:', updateError);
      }
      
      throw error;
    }
  }, []);

  // ==================== Retry Logic ====================
  
  /**
   * Retries 3D model generation using existing processed images
   * Useful when generation fails but photos are already uploaded and processed
   * @param modelId - The model's unique identifier
   * @param userId - The user's unique identifier
   * @param accessToken - Optional authentication token
   * @returns Object indicating success and new job ID
   */
  const retryModelGeneration = useCallback(async (
    modelId: string,
    userId: string,
    accessToken?: string
  ) => {
    try {
      setIsGenerating(true);
      
      // Fetch existing model data
      const model = await ModelServiceSingleton.getModel(modelId);
      
      // Prepare form data with existing URLs (prefer processed over raw)
      const formData = new FormData();
      formData.append('modelId', modelId);
      
      // Use background-removed URLs if available, fallback to raw
      const frontUrl = model.front_nobgr_image_url || model.front_image_url || '';
      formData.append('frontUrl', frontUrl);
      
      if (model.back_nobgr_image_url || model.back_image_url) {
        formData.append('backUrl', model.back_nobgr_image_url || model.back_image_url);
      }
      if (model.left_nobgr_image_url || model.left_image_url) {
        formData.append('leftUrl', model.left_nobgr_image_url || model.left_image_url);
      }
      if (model.right_nobgr_image_url || model.right_image_url) {
        formData.append('rightUrl', model.right_nobgr_image_url || model.right_image_url);
      }
      
      // Set up authentication if token provided
      const headers: Record<string, string> = {};
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }
      
      // Submit retry request
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
      
      // Update only the job ID and status (keep existing images)
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

  // ==================== Job Status Polling ====================
  
  /**
   * Polls the job status until completion or failure
   * Uses exponential backoff to reduce server load
   * @param jobId - The job's unique identifier
   * @param maxRetries - Maximum number of polling attempts (default: 10)
   * @returns Object with status, modelUrl, and optional error message
   */
  const pollJobStatus = useCallback(async (jobId: string, maxRetries = 10) => {
    try {
      // Poll with exponential backoff
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          // Check job status in database
          const job = await ModelServiceSingleton.getJob(jobId);

          if (!job) {
            console.warn(`Job ${jobId} not found`);
            // Exponential backoff: 1s, 2s, 4s, 8s, 16s, max 30s
            const delay = Math.min(1000 * Math.pow(2, attempt), 30000);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
          
          // Check if job has reached a terminal state
          if (job.api_status === 'completed' || job.api_status === 'failed') {
            // Retrieve associated model data
            const model = await ModelServiceSingleton.getModelByJobId(jobId);
            
            if (model) {
              return {
                status: model.model_status === 'completed' ? 'completed' : 'failed',
                modelUrl: model.model_url,
                errorMessage: model.error_message || (model.model_status === 'failed' ? 'Model generation failed' : null)
              };
            } else {
              // Model not yet created, continue polling
              console.warn(`Model not found for job ${jobId}`);
              return {
                status: 'pending',
                message: 'Model not created yet'
              };
            }
          }
          
          // Job still processing, wait before next attempt
          const delay = Math.min(1000 * Math.pow(2, attempt), 30000);
          await new Promise(resolve => setTimeout(resolve, delay));

        } catch (jobError) {
          console.error(`Error checking job ${jobId} status:`, jobError);

          // Handle specific error types gracefully
          if (jobError && typeof jobError === 'object') {
            // PGRST116: Model doesn't exist yet
            if ('code' in jobError && (jobError as any).code === 'PGRST116') {
              console.warn('PGRST116 error detected - model may not exist yet, continuing polling...');
            }
            // 406 Not Acceptable: Header/format issue
            else if ('status' in jobError && (jobError as any).status === 406) {
              console.warn('406 Not Acceptable error detected - retrying with proper headers...');
            }
          }

          // Use exponential backoff and continue
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

  // ==================== Model Creation ====================
  
  /**
   * Creates a new model in draft state
   * @param userId - The user's unique identifier
   * @returns The created model's ID
   */
  const createModelDraft = useCallback(async (userId: string) => {
    try {
      const model = await ModelServiceSingleton.createModelWithStatus(userId, 'draft');
      return model.id;
    } catch (error) {
      console.error('Failed to create model draft:', error);
      throw error;
    }
  }, []);

  // ==================== Initialization ====================
  
  useEffect(() => {
    setIsInitialized(true);
  }, []);

  // ==================== Public API ====================
  
  return {
    // Model retrieval
    getModelsByUserId,

    // Photo processing pipeline
    uploadRawPhotos,
    removeBackground,

    // 3D generation
    generate3DModel,
    retryModelGeneration,

    // Status tracking
    pollJobStatus,

    // Model management
    createModelDraft,

    // State
    isInitialized,
    isGenerating
  };
}
