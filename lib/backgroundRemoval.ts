import { removeBackground } from '@imgly/background-removal';
import { Config } from '@imgly/background-removal';

type BackgroundRemovalResult = {
  blob: Blob;
  imageUrl: string;
  fileName: string;
  originalImageUrl: string; // URL of original image stored in R2
  processedImageUrl: string; // URL of processed image stored in R2
};

// Client-side background removal function
export async function removeBackgroundFromImage(
  file: File,
  options: {
    debug?: boolean;
    progress?: (key: string, current: number, total: number) => void;
  } = {}
): Promise<BackgroundRemovalResult> {
  try {
    console.log('Starting client-side background removal for:', file.name);
    
    // First, upload the original image to R2
    console.log('Uploading original image to R2...');
    const originalUploadResult = await uploadOriginalImageToR2(file);
    
    // Configure the background removal
    const config: Config = {
      debug: options.debug || false,
      progress: options.progress,
      model: 'isnet', // Use isnet model (valid option)
      output: {
        format: 'image/png',
        quality: 0.8
      }
    };

    // Process the image using the browser-compatible version
    const blob = await removeBackground(file, config);
    
    // Create a data URL for the processed image (for immediate use)
    const imageUrl = URL.createObjectURL(blob);
    
    // Generate a filename for the processed image
    const fileName = `no-bg-${Date.now()}.png`;
    
    // Upload the processed image to R2 for debugging and storage
    console.log('Uploading processed image to R2...');
    const processedUploadResult = await uploadProcessedImageToR2(blob, fileName);

    console.log('Background removal completed successfully');
    
    return {
      blob,
      imageUrl,
      fileName,
      originalImageUrl: originalUploadResult.url,
      processedImageUrl: processedUploadResult.url,
    };
  } catch (error) {
    console.error('Background removal failed:', error);
    throw new Error(
      error instanceof Error 
        ? error.message 
        : 'Failed to remove background from image'
    );
  }
}

// Helper function to convert Blob to File (for browser compatibility)
export function blobToFile(blob: Blob, fileName: string, type = 'image/png'): File {
  return new File([blob], fileName, { type });
}

// Helper function to revoke object URLs when they're no longer needed
export function revokeObjectUrl(url: string): void {
  if (url.startsWith('blob:')) {
    URL.revokeObjectURL(url);
  }
}

// Helper function to upload original image to R2
export async function uploadOriginalImageToR2(
  file: File
): Promise<{ url: string }> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('processed', 'false'); // Mark as original, not processed

  const response = await fetch('/api/upload-processed', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Upload original image failed:', errorText);
    throw new Error(`Failed to upload original image: ${response.statusText}`);
  }

  const result = await response.json();
  console.log('Upload original image result:', result);
  
  if (result.status !== 'success' || !result.data?.url) {
    throw new Error(`Upload failed: ${result.message || 'No URL returned'}`);
  }
  
  return { url: result.data.url };
}

// Helper function to upload processed image to R2
export async function uploadProcessedImageToR2(
  blob: Blob,
  fileName: string
): Promise<{ url: string }> {
  const formData = new FormData();
  formData.append('file', blob, fileName);
  formData.append('processed', 'true'); // Mark as processed

  const response = await fetch('/api/upload-processed', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Upload processed image failed:', errorText);
    throw new Error(`Failed to upload processed image: ${response.statusText}`);
  }

  const result = await response.json();
  console.log('Upload processed image result:', result);
  
  if (result.status !== 'success' || !result.data?.url) {
    throw new Error(`Upload failed: ${result.message || 'No URL returned'}`);
  }
  
  return { url: result.data.url };
}
