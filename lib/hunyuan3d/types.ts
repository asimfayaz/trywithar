/**
 * Hunyuan3D API Types
 * These types define the structure of requests and responses for the Hunyuan3D API
 */

// Health check response
export interface HealthCheckResponse {
  status: string;
  version: string;
  message?: string; // Optional message field
}

// Generation job status
export type JobStatus = 'queued' | 'processing' | 'completed' | 'failed';

// Generation stages
export type JobStage = 
  | 'queued'
  | 'initializing'
  | 'preprocessing'
  | 'shape_generation'
  | 'face_reduction'
  | 'texture_generation'
  | 'completed'
  | 'failed';

// Generation options based on API contract
export interface GenerationOptions {
  enable_pbr?: boolean;     // Enable physically-based rendering
  should_remesh?: boolean;  // Apply remeshing to optimize the model
  should_texture?: boolean; // Generate textures for the model
}

// Default generation options
export const DEFAULT_GENERATION_OPTIONS: GenerationOptions = {
  enable_pbr: true,
  should_remesh: true,
  should_texture: true
};

// Job creation request
export interface CreateJobRequest {
  frontView: File;      // Front view image (required)
  backView?: File;      // Back view image (optional)
  sideView?: File;      // Left view image (optional)
  topView?: File;       // Right view image (optional)
  options?: GenerationOptions;
}

// Job creation response
export interface CreateJobResponse {
  job_id: string;
  status: JobStatus;
}

// Job status response
export interface JobStatusResponse {
  status: JobStatus;
  progress: number;     // Progress percentage (0-100)
  stage: JobStage;      // Current processing stage
  model_urls?: {
    glb: string;        // URL to the generated GLB model
  };
  detail?: string;      // Optional error message
}

// Error response
export interface ErrorResponse {
  detail: string;           // Primary error message field used by external API
  error?: string;           // Alternative error field
  message?: string;         // Alternative message field
  status_code?: number;     // HTTP status code
}
