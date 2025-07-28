import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Validate environment variables
function getEnvVar(name: string, isPublic = false): string {
  const value = isPublic 
    ? process.env[`NEXT_PUBLIC_${name}`] || process.env[name]
    : process.env[name];
  
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

// R2 Client Setup
const accountId = getEnvVar('R2_ACCOUNT_ID');
const accessKeyId = getEnvVar('R2_ACCESS_KEY_ID');
const secretAccessKey = getEnvVar('R2_SECRET_ACCESS_KEY');

// Get public URLs with fallbacks
const publicPhotosUrl = getEnvVar('R2_PUBLIC_PHOTOS_URL', true);
const publicModelsUrl = getEnvVar('R2_PUBLIC_MODELS_URL', true);

const r2Client = new S3Client({
  region: "auto",
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
});

type BucketType = 'photos' | 'models-glb';

export const r2Service = {
  /**
   * Upload a file to the specified R2 bucket
   */
  async uploadFile(
    bucket: BucketType,
    key: string,
    file: Buffer | Uint8Array | Blob | string,
    contentType: string
  ): Promise<{ url: string; key: string }> {
    const bucketName = bucket === 'photos' 
      ? getEnvVar('R2_PHOTOS_BUCKET')
      : getEnvVar('R2_MODELS_BUCKET');

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: file,
      ContentType: contentType,
    });

    await r2Client.send(command);
    
    // Generate a public URL for the uploaded file
    const publicUrlBase = process.env.R2_PUBLIC_URL || '';
    const publicUrl = publicUrlBase.startsWith('http') 
      ? `${publicUrlBase}/${key}`
      : `https://${publicUrlBase}/${key}`;
    
    return {
      url: publicUrl,
      key,
    };
  },

  /**
   * Generate a pre-signed URL for a file
   */
  async getSignedUrl(bucket: BucketType, key: string, expiresIn = 3600): Promise<string> {
    const bucketName = bucket === 'photos' 
      ? getEnvVar('R2_PHOTOS_BUCKET')
      : getEnvVar('R2_MODELS_BUCKET');

    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
    });

    return getSignedUrl(r2Client, command, { expiresIn });
  },

  /**
   * Generate a unique key for a file
   */
  generateKey(prefix: string, originalName: string): string {
    const timestamp = Date.now();
    const extension = originalName.split('.').pop();
    const randomString = Math.random().toString(36).substring(2, 8);
    
    return `${prefix}/${timestamp}-${randomString}.${extension}`;
  },

  /**
   * Upload an original photo to the photos bucket
   */
  async uploadPhoto(file: Buffer, originalName: string) {
    const key = this.generateKey('original', originalName);
    return this.uploadFile('photos', key, file, 'image/jpeg');
  },

  /**
   * Upload a no-background photo to the photos bucket
   */
  async uploadProcessedPhoto(file: Buffer, originalName: string) {
    const key = this.generateKey('nobgr', originalName);
    return this.uploadFile('photos', key, file, 'image/jpeg');
  },

  /**
   * Upload a 3D model to the models bucket
   */
  async uploadModel(file: Buffer, originalName: string) {
    const timestamp = Date.now();
    const extension = originalName.split('.').pop();
    const randomString = Math.random().toString(36).substring(2, 8);
    // Generate a simple filename without any prefix
    const key = `${timestamp}-${randomString}.${extension}`;
    
    return this.uploadFile('models-glb', key, file, 'model/gltf-binary');
  },

  /**
   * Get a public URL for a file
   * @param bucket The bucket type ('photos' or 'models-glb')
   * @param key The file key (may include prefixes for photos)
   * @returns The full public URL to access the file
   */
  getPublicUrl(bucket: BucketType, key: string): string {
    // Use the appropriate public URL based on the bucket type
    let baseUrl = bucket === 'models-glb' ? publicModelsUrl : publicPhotosUrl;
    
    // Ensure the base URL has the correct protocol
    if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
      baseUrl = `https://${baseUrl}`;
    }
    
    // For models, remove any path segments (they should be at root)
    // For photos, preserve the folder structure (e.g., 'original/' or 'nobgr/')
    const cleanKey = bucket === 'models-glb' 
      ? key.split('/').pop() || key
      : key;
    
    // Ensure the URL is properly formatted
    return baseUrl.endsWith('/') 
      ? `${baseUrl}${cleanKey}`
      : `${baseUrl}/${cleanKey}`;
  }
};
