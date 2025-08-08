/**
 * Script to configure CORS for R2 buckets
 * Run this script to allow your Vercel app to access R2 files
 */

const { S3Client, PutBucketCorsCommand } = require("@aws-sdk/client-s3");

// Environment variables
const accountId = process.env.R2_ACCOUNT_ID;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const photosBucket = process.env.R2_PHOTOS_BUCKET;
const modelsBucket = process.env.R2_MODELS_BUCKET;

if (!accountId || !accessKeyId || !secretAccessKey || !photosBucket || !modelsBucket) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const r2Client = new S3Client({
  region: "auto",
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
});

const corsConfiguration = {
  CORSRules: [
    {
      AllowedHeaders: ["*"],
      AllowedMethods: ["GET", "PUT", "HEAD"],
      AllowedOrigins: [
        "https://trywithar.vercel.app",
        "https://*.vercel.app",
        "http://localhost:3000",
        "http://localhost:3001"
      ],
      ExposeHeaders: ["ETag"],
      MaxAgeSeconds: 3600,
    },
  ],
};

async function setupCORS() {
  try {
    console.log('Setting up CORS for photos bucket...');
    await r2Client.send(new PutBucketCorsCommand({
      Bucket: photosBucket,
      CORSConfiguration: corsConfiguration,
    }));
    console.log('✅ CORS configured for photos bucket');

    console.log('Setting up CORS for models bucket...');
    await r2Client.send(new PutBucketCorsCommand({
      Bucket: modelsBucket,
      CORSConfiguration: corsConfiguration,
    }));
    console.log('✅ CORS configured for models bucket');

    console.log('🎉 CORS setup complete!');
  } catch (error) {
    console.error('❌ Error setting up CORS:', error);
  }
}

setupCORS();
