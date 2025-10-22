import { removeBackground } from '@imgly/background-removal';
import { Config } from '@imgly/background-removal';
import { validateFile } from './fileValidation';

type BackgroundRemovalResult = {
  blob: Blob;
  imageUrl: string;
  fileName: string;
  processedImageUrl: string;
};

export async function removeBackgroundFromImage(
  file: File,
  options: {
    debug?: boolean;
    progress?: (key: string, current: number, total: number) => void;
  } = {}
): Promise<BackgroundRemovalResult> {
  try {
    console.log('Starting client-side background removal for:', file.name);
    
    // Validate file before processing using our utility
    const validation = validateFile(file);
    if (!validation.isValid) {
      throw new Error(`Invalid file for background removal: ${validation.error || 'Unknown error'}`);
    }
    
    // Original upload removed - already handled by batch upload
    
    // Configure background removal
    const config: Config = {
      debug: options.debug || false,
      progress: options.progress,
      model: 'isnet',
      output: {
        format: 'image/png',
        quality: 0.8
      }
    };

    // Process image
    const blob = await removeBackground(file, config);
    const imageUrl = URL.createObjectURL(blob);
    const fileName = `no-bg-${Date.now()}.png`;
    
    // Upload processed image to R2
    const processedUploadResult = await uploadProcessedImageToR2(blob, fileName);

    console.log('Background removal completed successfully');
    
    return {
      blob,
      imageUrl,
      fileName,
      processedImageUrl: processedUploadResult.url,
    };
  } catch (error) {
    console.error('Background removal failed:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to remove background from image';
    throw new Error(`Background removal failed: ${errorMessage}`);
  }
}

export async function uploadOriginalImageToR2(
  file: File
): Promise<{ url: string }> {
  // Add validation to prevent remote URL uploads
  if (!(file instanceof File)) {
    throw new Error("Cannot upload remote URLs - only File objects accepted");
  }
  
  const formData = new FormData();
  formData.append('file', file);
  formData.append('processed', 'false');

  const response = await fetch('/api/upload-processed', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(`Upload original image failed: ${errorData.message || response.statusText}`);
  }

  const result = await response.json();
  return { url: result.data.url };
}

export async function uploadProcessedImageToR2(
  blob: Blob,
  fileName: string
): Promise<{ url: string }> {
  const formData = new FormData();
  formData.append('file', blob, fileName);
  formData.append('processed', 'true');

  const response = await fetch('/api/upload-processed', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(`Upload processed image failed: ${errorData.message || response.statusText}`);
  }

  const result = await response.json();
  return { url: result.data.url };
}

export function revokeObjectUrl(url: string): void {
  if (url.startsWith('blob:')) {
    URL.revokeObjectURL(url);
  }
}
