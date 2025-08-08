import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getServerConfig, getClientConfig } from './config';

// R2 Client Setup - Lazy initialization
let r2Client: S3Client | null = null;
let publicPhotosUrlCache: string | null = null;
let publicModelsUrlCache: string | null = null;

function getR2Client(): S3Client {
  if (!r2Client) {
    r2Client = new S3Client({
      region: "auto",
      endpoint: `https://${getServerConfig('R2_ACCOUNT_ID')}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: getServerConfig('R2_ACCESS_KEY_ID'),
        secretAccessKey: getServerConfig('R2_SECRET_ACCESS_KEY'),
      },
    });
  }
  return r2Client;
}

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
      ? getServerConfig('R2_PHOTOS_BUCKET')
      : getServerConfig('R2_MODELS_BUCKET');

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: file,
      ContentType: contentType,
    });

    await getR2Client().send(command);
    
    // Generate a public URL for the uploaded file using the centralized method
    const publicUrl = this.getPublicUrl(bucket, key);
    
    return {
      url: publicUrl,
      key,
    };
  },

  /**
   * Generate a pre-signed URL for downloading a file
   */
  async getSignedUrl(bucket: BucketType, key: string, expiresIn = 3600): Promise<string> {
    const bucketName = bucket === 'photos' 
      ? getServerConfig('R2_PHOTOS_BUCKET')
      : getServerConfig('R2_MODELS_BUCKET');

    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
    });

    return getSignedUrl(getR2Client(), command, { expiresIn });
  },

  /**
   * Generate a pre-signed URL for uploading a file
   */
  async generatePresignedUrl(key: string, contentType: string, bucket: BucketType = 'photos', expiresIn = 3600): Promise<string> {
    const bucketName = bucket === 'photos' 
      ? getServerConfig('R2_PHOTOS_BUCKET')
      : getServerConfig('R2_MODELS_BUCKET');

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      ContentType: contentType,
    });

    return getSignedUrl(getR2Client(), command, { expiresIn });
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
    // These are public URLs, so use client config
    let baseUrl = bucket === 'models-glb' 
      ? getClientConfig('NEXT_PUBLIC_R2_PUBLIC_MODELS_URL') 
      : getClientConfig('NEXT_PUBLIC_R2_PUBLIC_PHOTOS_URL');
    
    // Ensure the base URL has the correct protocol and no trailing slash
    if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
      baseUrl = `https://${baseUrl}`;
    }
    baseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    
    // For photos, preserve the folder structure (e.g., 'original/' or 'nobgr/')
    // For models, use the key as-is since it's already at the root
    const cleanKey = key.startsWith('/') ? key.substring(1) : key;
    
    // Construct the full URL
    return `${baseUrl}/${cleanKey}`;
  }
};
