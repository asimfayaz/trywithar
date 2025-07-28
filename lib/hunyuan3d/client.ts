/**
 * Hunyuan3D API Client
 * Handles communication with the Hunyuan3D API for 3D model generation
 */

import { 
  HealthCheckResponse, 
  CreateJobRequest, 
  CreateJobResponse, 
  JobStatusResponse, 
  ErrorResponse 
} from './types';

export class Hunyuan3DClient {
  private baseUrl: string;
  private apiKey: string | undefined;

  constructor() {
    // Get API configuration from environment variables
    const baseUrl = process.env.HUNYUAN3D_API_URL || 'https://asimfayaz-hunyuan3d-2-1.hf.space';
    const apiKey = process.env.HUNYUAN3D_API_KEY;

    this.baseUrl = baseUrl.replace(/\/+$/, ''); // Remove trailing slashes
    this.apiKey = apiKey; // API key is optional
  }

  /**
   * Check the health status of the Hunyuan3D API
   * @returns Health check response
   */
  async checkHealth(): Promise<HealthCheckResponse> {
    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      
      // Only add Authorization header if API key is provided
      if (this.apiKey) {
        headers['Authorization'] = `Bearer ${this.apiKey}`;
      }
      
      const response = await fetch(`${this.baseUrl}/api/health`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        const errorData: any = await response.json();
        throw new Error(errorData.detail || errorData.message || 'Health check failed');
      }

      return await response.json() as HealthCheckResponse;
    } catch (error) {
      console.error('Health check error:', error);
      throw error;
    }
  }

  /**
   * Create a new 3D model generation job
   * @param data Job creation data including images and options
   * @returns Job creation response
   */
  async createJob(data: CreateJobRequest): Promise<CreateJobResponse> {
    try {
      // Create form data for multipart upload
      const formData = new FormData();
      
      // Add front view image (required)
      formData.append('front', data.frontView);
      
      // Add optional views if provided
      if (data.backView) formData.append('back', data.backView);
      if (data.sideView) formData.append('left', data.sideView);
      if (data.topView) formData.append('right', data.topView);
      
      // Add generation options if provided
      if (data.options) {
        formData.append('options', JSON.stringify(data.options));
      }

      // Prepare headers
      const headers: HeadersInit = {};
      
      // Only add Authorization header if API key is provided
      if (this.apiKey) {
        headers['Authorization'] = `Bearer ${this.apiKey}`;
      }
      
      // Note: Don't set Content-Type manually when using FormData
      // The browser will set it with the correct boundary
      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers,
        body: formData,
      });

      if (!response.ok) {
        const errorData: any = await response.json();
        throw new Error(errorData.detail || errorData.message || 'Job creation failed');
      }

      return await response.json() as CreateJobResponse;
    } catch (error) {
      console.error('Job creation error:', error);
      throw error;
    }
  }

  /**
   * Check the status of a 3D model generation job
   * @param jobId The ID of the job to check
   * @returns Job status response
   */
  async getJobStatus(jobId: string): Promise<JobStatusResponse> {
    try {
      // Prepare headers
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      
      // Only add Authorization header if API key is provided
      if (this.apiKey) {
        headers['Authorization'] = `Bearer ${this.apiKey}`;
      }
      
      const response = await fetch(`${this.baseUrl}/api/status?job_id=${encodeURIComponent(jobId)}`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        const errorData: any = await response.json();
        throw new Error(errorData.detail || errorData.message || 'Failed to get job status');
      }

      return await response.json() as JobStatusResponse;
    } catch (error) {
      console.error('Job status error:', error);
      throw error;
    }
  }
}
