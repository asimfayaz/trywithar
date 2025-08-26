export type ModelStatus = 
  | 'draft'
  | 'uploading_photos'
  | 'removing_background'
  | 'generating_3d_model'
  | 'completed'
  | 'failed';

export type PredictionStatus = "starting" | "processing" | "succeeded" | "failed" | "canceled";

export type Job = {
  id: string;
  user_id: string;
  external_job_id: string;
  api_status: PredictionStatus;
  api_stage?: string;
  progress?: number;
  model_url?: string;
  error_message?: string;
  created_at: string;
  updated_at: string;
  expires_at: string; // new field
};

export type Model = {
  id: string;
  user_id: string;
  model_status: ModelStatus;
  front_image_url?: string;
  left_image_url?: string;
  right_image_url?: string;
  back_image_url?: string;
  front_nobgr_image_url?: string;
  left_nobgr_image_url?: string;
  right_nobgr_image_url?: string;
  back_nobgr_image_url?: string;
  model_url?: string;
  job_id?: string;
  created_at: string;
  updated_at: string;
};
