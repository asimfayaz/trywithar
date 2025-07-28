# R2 CORS Configuration

## Problem
Your app is getting CORS errors when trying to access GLB model files from R2 storage.

## Solution
Configure CORS on your R2 buckets to allow requests from your Vercel domain.

## Manual Setup via Cloudflare Dashboard

1. Go to Cloudflare Dashboard → R2 Object Storage
2. Click on your models bucket (`models-glb`)
3. Go to Settings → CORS policy
4. Add this CORS configuration:

```json
[
  {
    "AllowedOrigins": [
      "https://v0-simple-3-d-model-generator.vercel.app",
      "https://*.vercel.app",
      "http://localhost:3000"
    ],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

5. Repeat for your photos bucket if needed

## Alternative: Using Cloudflare API

```bash
curl -X PUT "https://api.cloudflare.com/client/v4/accounts/{account_id}/r2/buckets/{bucket_name}/cors" \
  -H "Authorization: Bearer {api_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "cors_rules": [
      {
        "allowed_origins": [
          "https://v0-simple-3-d-model-generator.vercel.app",
          "https://*.vercel.app",
          "http://localhost:3000"
        ],
        "allowed_methods": ["GET", "HEAD"],
        "allowed_headers": ["*"],
        "expose_headers": ["ETag"],
        "max_age_seconds": 3600
      }
    ]
  }'
```

## Test CORS
After setting up CORS, test by accessing a model URL directly in your browser:
`https://pub-041c94a0a5bb43dda05f44f5c76eda29.r2.dev/models/1753680102811-7ax5vm.glb`
