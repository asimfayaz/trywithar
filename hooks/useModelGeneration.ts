import { useState, useEffect, useCallback } from 'react';
import { ModelService } from '@/lib/supabase/model.service';
import { supabase } from '@/lib/supabase';
import type { ModelStatus } from '@/lib/supabase/types';
import type { UploadItem, PhotoSet, ModelData } from '@/app/page';

const ModelServiceSingleton = new ModelService();

export function useModelGeneration() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

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

  const generateModel = useCallback(async (modelId: string, photoSet: PhotoSet, userId: string) => {
    try {
      // Since the ModelService doesn't have a generateModel method, we'll use createModel instead
      const result = await ModelServiceSingleton.createModel({
        user_id: userId,
        model_id: modelId,
        photo_set: photoSet,
        status: 'draft'
      });
      return result;
    } catch (error) {
      console.error('Failed to generate model:', error);
      throw error;
    }
  }, []);

  const retryModelGeneration = useCallback(async (modelId: string, userId: string) => {
    try {
      setIsRetrying(true);
      
      // Get the model to get photo URLs
      const model = await ModelServiceSingleton.getModel(modelId);
      
      // Get current session and token for authorization
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      
      if (!token) {
        throw new Error('User not authenticated');
      }
      
      // Prepare form data for the generation API
      const formData = new FormData();
      formData.append('modelId', modelId);
      formData.append('frontUrl', model.front_image_url || '');
      
      if (model.back_image_url) {
        formData.append('backUrl', model.back_image_url);
      }
      if (model.left_image_url) {
        formData.append('leftUrl', model.left_image_url);
      }
      if (model.right_image_url) {
        formData.append('rightUrl', model.right_image_url);
      }
      
      // Call the generation API endpoint with proper authorization
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to start model generation');
      }
      
      const result = await response.json();
      
      // Update the model status to generating
      await ModelServiceSingleton.updateModelStatus(modelId, 'generating_3d_model' as ModelStatus);
      
      return { 
        success: true, 
        jobId: result.job_id 
      };
    } catch (error) {
      console.error('Failed to retry model generation:', error);
      throw error;
    } finally {
      setIsRetrying(false);
    }
  }, []);

  const pollJobStatus = useCallback(async (jobId: string, maxRetries = 10) => {
    try {
      // Poll the job status using the internal UUID job ID
      for (let i = 0; i < maxRetries; i++) {
        const status = await ModelServiceSingleton.getModel(jobId);
        if (status && status.model_status === 'completed') {
          return {
            status: 'completed',
            modelUrl: status.model_url,
            errorMessage: null
          };
        } else if (status && status.model_status === 'failed') {
          return {
            status: 'failed',
            modelUrl: null,
            errorMessage: status.error_message || 'Model generation failed'
          };
        }
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
      throw new Error('Job status could not be determined after maximum retries');
    } catch (error) {
      console.error('Failed to poll job status:', error);
      throw error;
    }
  }, []);

  // Initialize the hook
  useEffect(() => {
    setIsInitialized(true);
  }, []);

  return {
    getModelsByUserId,
    generateModel,
    retryModelGeneration,
    pollJobStatus,
    isInitialized,
    isRetrying
  };
}
