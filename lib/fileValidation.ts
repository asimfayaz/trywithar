/**
 * Utility functions for validating File objects before processing
 */

/**
 * Validates that a File object is valid and can be processed
 * @param file - The File object to validate
 * @returns boolean indicating if the file is valid
 */
export function isValidFile(file: File | null | undefined): boolean {
  if (!file) {
    return false;
  }
  
  if (!(file instanceof File)) {
    return false;
  }
  
  // Check if file is empty
  if (file.size === 0) {
    return false;
  }
  
  // Check if file has valid image type
  const validImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (!validImageTypes.includes(file.type)) {
    return false;
  }
  
  return true;
}

/**
 * Validates that a File object has valid properties
 * @param file - The File object to validate
 * @returns Detailed validation result
 */
export function validateFile(file: File | null | undefined): {
  isValid: boolean;
  error?: string;
} {
  if (!file) {
    return {
      isValid: false,
      error: 'File is null or undefined'
    };
  }
  
  if (!(file instanceof File)) {
    return {
      isValid: false,
      error: 'File is not a valid File object'
    };
  }
  
  if (file.size === 0) {
    return {
      isValid: false,
      error: 'File is empty'
    };
  }
  
  const validImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (!validImageTypes.includes(file.type)) {
    return {
      isValid: false,
      error: `Invalid file type: ${file.type}. Supported types: ${validImageTypes.join(', ')}`
    };
  }
  
  return {
    isValid: true
  };
}

/**
 * Creates a proper File object from a data URL
 * @param dataUrl - The data URL to convert
 * @param filename - The filename for the new File
 * @returns Promise resolving to a File object
 */
export async function dataUrlToFile(dataUrl: string, filename: string): Promise<File> {
  return new Promise((resolve, reject) => {
    const byteString = atob(dataUrl.split(',')[1]);
    const mimeString = dataUrl.split(',')[0].split(':')[1].split(';')[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    
    const blob = new Blob([ab], { type: mimeString });
    const file = new File([blob], filename, { type: mimeString });
    
    resolve(file);
  });
}
