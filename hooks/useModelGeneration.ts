import { useCallback, useState } from "react";
import { useCredits } from "@/hooks/useCredits";
import { ModelService } from "@/lib/supabase/model.service";
import { StorageService } from "@/lib/storage.service";
import { v4 as uuidv4 } from 'uuid';
import type { ModelStatus } from "@/lib/supabase/types";
import type { PhotoSet } from "@/app/page";

// TypeScript interfaces for API responses
interface GenerationResponse {
  jobId: string;
  status: 'success' | 'insufficient_credits' | 'api_error';
}

interface JobStatusResponse {
  status: 'processing' | 'completed' | 'failed';
  modelUrl?: string;
  errorMessage?: string;
}

/**
 * Hook for handling 3D model generation workflow
 */
export function useModelGeneration() {
  const { deductCredits, addCredits, hasSufficientCredits } = useCredits();
  const modelService = new ModelService();
  
  // State for tracking retry operations
  const [isRetrying, setIsRetrying] = useState(false);

  /**
   * Generate a 3D model with automatic credit deduction
   * @param modelId The ID of the model to generate
   * @param photoSet The set of photos to use for generation
   * @param userId The user ID for credit management
   * @returns Job ID for polling
   */
  const generateModel = useCallback(async (
    modelId: string,
    photoSet: PhotoSet,
    userId: string
  ) => {
    // Check if user has sufficient credits
    if (!hasSufficientCredits(1)) {
      throw new Error("Insufficient credits for model generation");
    }

    let jobId: string | null = null;
    let createdModelId = modelId;
    let shouldRollbackCredits = false;

    try {
      // Deduct credits first
      await deductCredits(1);
      shouldRollbackCredits = true;

      const frontFile = photoSet.front?.file;
      if (!frontFile) throw new Error('Front photo file not found');

      // Upload original photos for all views
      const { uploadOriginalImageToR2 } = await import('@/lib/backgroundRemoval');
      const uploadPromises = [];

      // Upload front photo
      uploadPromises.push(uploadOriginalImageToR2(frontFile).then(result => {
        return { position: 'front', url: result.url };
      }));

      // Upload other views
      const otherViews = ['left', 'right', 'back'] as const;
      for (const view of otherViews) {
        const uploadItem = photoSet[view as keyof PhotoSet];
        if (uploadItem) {
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

      // Create model record if it's a temporary model
      let createdModel: any;
      if (modelId.startsWith('temp-')) {
        const modelRecord = {
          user_id: userId,
          model_status: 'draft' as const,
        };
        createdModel = await modelService.createModel(modelRecord);
        createdModelId = createdModel.id;
      } else {
        createdModel = await modelService.getModel(modelId);
      }

      // Update model with uploaded photo URLs
      await modelService.updateModel(createdModelId, {
        model_status: 'removing_background',
        front_image_url: urlMap.front,
        ...(urlMap.left && { left_image_url: urlMap.left }),
        ...(urlMap.right && { right_image_url: urlMap.right }),
        ...(urlMap.back && { back_image_url: urlMap.back })
      });

      // Remove background from front image
      let bgResult;
      try {
        const { removeBackgroundFromImage } = await import('@/lib/backgroundRemoval');
        bgResult = await removeBackgroundFromImage(frontFile, {
          debug: process.env.NODE_ENV === 'development'
        });
      } catch (bgError) {
        console.error('❌ Background removal failed:', bgError);
        await modelService.updateModel(createdModelId, {
          model_status: 'failed'
        });
        throw new Error(bgError instanceof Error ? 
          `Background removal failed: ${bgError.message}` : 
          'Background removal failed');
      }

      // Upload background-removed image
      const presignedRes = await fetch('/api/generate-upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          fileName: 'processed.png',
          contentType: 'image/png',
          prefix: 'nobgr'
        })
      });

      if (!presignedRes.ok) {
        const errorData = await presignedRes.json();
        throw new Error(`Failed to get upload URL: ${errorData.message}`);
      }

      const { presignedUrl, key } = await presignedRes.json();
      const uploadRes = await fetch(presignedUrl, {
        method: 'PUT',
        body: bgResult.blob,
        headers: { 'Content-Type': 'image/png' }
      });

      if (!uploadRes.ok) {
        throw new Error('Direct upload to R2 failed');
      }

      const r2 = await import('@/lib/r2');
      const publicUrl = r2.r2Service.getPublicUrl('photos', key);

      await modelService.updateModel(createdModelId, {
        model_status: 'removing_background',
        front_nobgr_image_url: publicUrl
      });

      // Send to generation API
      const formData = new FormData();
      formData.append('frontUrl', publicUrl); // Use the background-removed URL for front

      // Add URLs for other views if they exist
      if (photoSet.left) {
        formData.append('leftUrl', urlMap.left);
      }
      if (photoSet.right) {
        formData.append('rightUrl', urlMap.right);
      }
      if (photoSet.back) {
        formData.append('backUrl', urlMap.back);
      }

      formData.append('options', JSON.stringify({
        enable_pbr: true,
        should_remesh: true,
        should_texture: true
      }));

      formData.append('modelId', createdModelId);

      const response = await fetch('/api/generate', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Job creation failed');
      }

      const jobResponse = await response.json();
      jobId = jobResponse.job_id;

      if (!jobId) {
        throw new Error('Job ID is missing after creating job');
      }

      // Create job record in jobs table
      const jobRecord = await modelService.createJob({
        external_job_id: jobId,
        user_id: userId,
        api_status: 'queued'
      });

      // Update model with job ID (UUID foreign key)
      await modelService.updateModel(createdModelId, {
        model_status: 'generating_3d_model',
        job_id: jobRecord.id
      });

      // Clean up expired drafts
      const storageService = new StorageService();
      await storageService.deleteExpiredDrafts();

      shouldRollbackCredits = false;
      return { jobId, modelId: createdModelId };

    } catch (error) {
      // If generation fails, rollback the credit deduction
      if (shouldRollbackCredits) {
        try {
          await addCredits(1);
        } catch (rollbackError) {
          console.error("Failed to rollback credits:", rollbackError);
        }
      }
      
      console.error("Model generation failed:", error);
      throw error;
    }
  }, [deductCredits, hasSufficientCredits]);

  /**
   * Poll for job status
   * @param jobId The job ID to poll
   * @param maxRetries Maximum number of retries
   * @returns Job status response
   */
  const pollJobStatus = useCallback(async (
    jobId: string,
    maxRetries: number = 20
  ): Promise<JobStatusResponse> => {
    let retries = 0;
    const intervals = [5000, 10000, 30000]; // 5s, 10s, 30s
    let currentIntervalIndex = 0;

    while (retries < maxRetries) {
      try {
        const response = await fetch(`/api/status?job_id=${encodeURIComponent(jobId)}`);
        
        if (response.status === 404) {
          throw new Error('Job not found');
        }
        
        if (!response.ok) {
          throw new Error(`API returned ${response.status}`);
        }
        
        const statusData = await response.json();
        
        const jobStatus: JobStatusResponse = {
          status: statusData.status === 'completed' ? 'completed' : 
                 statusData.status === 'failed' ? 'failed' : 'processing',
          modelUrl: statusData.model_urls?.glb,
          errorMessage: statusData.error
        };
        
        if (jobStatus.status === 'completed' && jobStatus.modelUrl) {
          return jobStatus;
        } else if (jobStatus.status === 'failed') {
          return jobStatus;
        }
        
        // Move to next interval (max out at the last interval)
        if (currentIntervalIndex < intervals.length - 1) {
          currentIntervalIndex++;
        }
        
        await new Promise(resolve => setTimeout(resolve, intervals[currentIntervalIndex]));
        retries++;
        
      } catch (error) {
        console.error("Error polling job status:", error);
        retries++;
        
        if (retries >= maxRetries) {
          throw new Error("Maximum retries reached while polling job status");
        }
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, intervals[currentIntervalIndex]));
      }
    }
    
    throw new Error("Job polling timeout exceeded");
  }, []);

  /**
   * Update model status in the database
   */
  const updateModelStatus = useCallback(async (
    modelId: string,
    status: ModelStatus,
    modelUrl?: string
  ) => {
    try {
      const updates: any = { model_status: status };
      if (modelUrl) {
        updates.model_url = modelUrl;
      }
      await modelService.updateModel(modelId, updates);
    } catch (error) {
      console.error("Failed to update model status:", error);
      throw error;
    }
  }, []);

  /**
   * Retry model generation for a failed model
   * @param modelId The ID of the model to retry
   * @param userId The user ID for credit management
   * @returns Job ID for polling
   */
  const retryModelGeneration = useCallback(async (
    modelId: string,
    userId: string
  ) => {
    // Check if user has sufficient credits
    if (!hasSufficientCredits(1)) {
      throw new Error("Insufficient credits for model generation");
    }

    let jobId: string | null = null;
    let shouldRollbackCredits = false;

    try {
      // Set retry state to true
      setIsRetrying(true);
      
      // Deduct credits first
      await deductCredits(1);
      shouldRollbackCredits = true;

      // Get the existing model data
      const model = await modelService.getModel(modelId);
      if (!model) {
        throw new Error('Model not found');
      }

      // Send to generation API using existing processed images
      const formData = new FormData();
      
      // Use the background-removed image if available, otherwise use original
      const frontUrl = model.front_nobgr_image_url || model.front_image_url;
      if (frontUrl) {
        formData.append('frontUrl', frontUrl);
      }
      
      // Add URLs for other views if they exist
      if (model.left_image_url) {
        formData.append('leftUrl', model.left_image_url);
      }
      if (model.right_image_url) {
        formData.append('rightUrl', model.right_image_url);
      }
      if (model.back_image_url) {
        formData.append('backUrl', model.back_image_url);
      }

      formData.append('options', JSON.stringify({
        enable_pbr: true,
        should_remesh: true,
        should_texture: true
      }));

      formData.append('modelId', modelId);

      const response = await fetch('/api/generate', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Job creation failed');
      }

      const jobResponse = await response.json();
      jobId = jobResponse.job_id;

      if (!jobId) {
        throw new Error('Job ID is missing after creating job');
      }

      // Server already creates job record - just update model status
      await modelService.updateModel(modelId, {
        model_status: 'generating_3d_model'
      });

      shouldRollbackCredits = false;
      return { jobId, modelId };

    } catch (error) {
      // If generation fails, rollback the credit deduction
      if (shouldRollbackCredits) {
        try {
          await addCredits(1);
        } catch (rollbackError) {
          console.error("Failed to rollback credits:", rollbackError);
        }
      }
      
      console.error("Model retry failed:", error);
      throw error;
    } finally {
      // Always set retry state to false when done
      setIsRetrying(false);
    }
  }, [deductCredits, hasSufficientCredits]);

  return {
    generateModel,
    retryModelGeneration,
    pollJobStatus,
    updateModelStatus,
    isRetrying
  };
}
