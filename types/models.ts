export interface UploadItem {
  file: File;
  dataUrl: string; // Base64 data URL for preview
  persistentUrl?: string; // Persistent URL from R2 storage
}

export interface PhotoSet {
  front?: UploadItem;
  left?: UploadItem;
  right?: UploadItem;
  back?: UploadItem;
}

export type ModelStatus = "draft" | "uploading_photos" | "removing_background" | "generating_3d_model" | "completed" | "failed";

export type TransactionType = 'purchase' | 'usage' | 'award';

export interface ModelData {
  isTemporary?: boolean;
  expiresAt?: Date;
  id: string;
  thumbnail: string;
  status: "draft" | "processing" | "completed" | "failed";
  modelUrl?: string;
  uploadedAt: Date;
  updatedAt: Date;
  jobId?: string | null;
  processingStage?: ModelStatus | undefined;
  photoSet: PhotoSet;
  sourcePhotoId?: string;
  error?: string; // Add error property for failed state
}
