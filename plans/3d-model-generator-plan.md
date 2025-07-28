# 3D Model Generator Project Plan

## Project Overview
Build a comprehensive 3D model generator that:
1. Tracks photos using Supabase
2. Stores photos and models in Cloudflare R2
3. Removes backgrounds automatically using imgly/background-removal
4. Generates 3D models using Hunyuan3D-2.1 API
5. Displays models using model-viewer library

## Architecture Overview

```
User Upload → Background Removal → Supabase Metadata → R2 Storage → Hunyuan3D API → 3D Model Display
```

## Implementation Checklist

### Phase 1: Database & Storage Setup
- [x] **Supabase Integration** ✅
  - [x] Set up Supabase project and get credentials
  - [x] Create database schema for photos table
    - [x] id (uuid, primary key)
    - [x] user_id (uuid, for future user management)
    - [x] original_image_url (text)
    - [x] processed_image_url (text, after background removal)
    - [x] model_url (text, generated 3D model)
    - [x] generation_status (enum: pending, processing, completed, failed)
    - [x] job_id (text, Hunyuan3D job ID)
    - [x] created_at (timestamp)
    - [x] updated_at (timestamp)
  - [x] Install and configure Supabase client
  - [x] Create environment variables for Supabase credentials
  - [x] Test database connection

- [x] **Cloudflare R2 Integration** 
  - [x] Set up Cloudflare R2 buckets:
    - [x] "photos" - for storing original uploaded photos
    - [x] "models-glb" - for storing generated 3D models
  - [x] Configure R2 credentials and permissions
  - [x] Install AWS SDK (R2 is S3-compatible)
  - [x] Create utility functions for R2 operations:
    - [x] Upload original images to "photos" bucket
    - [x] Upload generated 3D models to "models-glb" bucket
    - [x] Generate signed URLs for secure access
  - [x] Create environment variables for R2 credentials
  - [x] Test R2 upload/download functionality

### Phase 2: Background Removal Integration ✅
- [x] **imgly/background-removal Setup**
  - [x] Install @imgly/background-removal package
  - [x] Create background removal utility function
  - [x] Handle different image formats (PNG, JPEG, WebP)
  - [x] Add error handling for background removal failures
  - [x] Fix background removal integration for Next.js (replace Node.js version with browser-compatible method)
  - [x] Refactor: Move background removal to model generation step (triggered by CTA, not upload)
  - [x] Test background removal with various image types
  - [ ] Optimize performance (consider web workers if needed)

### Phase 3: Hunyuan3D API Integration ✅
- [x] **API Client Setup**
  - [x] Create Hunyuan3D API client class
  - [x] Implement health check endpoint (`/api/health`)
  - [x] Add environment variable for API base URL with default value
  - [x] Create TypeScript interfaces for API requests and responses
  - [x] Make API key optional for public access
  - [x] Add comprehensive error handling and logging

- [x] **Model Generation Flow**
  - [x] Implement job creation (`POST /api/generate`)
    - [x] Handle multipart/form-data uploads with proper file handling
    - [x] Support front view (required) and optional views (back, side, top)
    - [x] Configure generation options (PBR, texturing, remeshing)
  - [x] Implement job status checking (`GET /api/status`)
    - [x] Handle different status states (queued, processing, completed, failed)
    - [x] Track progress percentage and current stage
    - [x] Map API status to internal processing stages
  - [x] Create job management utilities:
    - [x] Start generation job with background removal
    - [x] Check job status on page load
    - [x] Handle job completion and failure
    - [x] Store job results in Supabase
  - [x] Test API integration with real requests
    - [x] Verify health check endpoint
    - [x] Test model generation with sample images
    - [x] Verify job status retrieval
    - [x] Confirm error handling works as expected

### Phase 4: Frontend Integration
- [ ] **Model Viewer Setup**
  - [ ] Install @google/model-viewer package
  - [ ] Create ModelViewer component wrapper
  - [ ] Handle 3D model loading states
  - [ ] Add model interaction controls (zoom, rotate, pan)
  - [ ] Style model viewer to match app design

- [ ] **UI/UX Enhancements**
  - [ ] Update photo upload flow to include background removal
  - [ ] Add progress indicators for:
    - [ ] Background removal process
    - [ ] 3D model generation stages
    - [ ] File uploads to R2
  - [ ] Create model gallery view
  - [ ] Add download options for generated models
  - [ ] Implement error handling and user feedback

### Phase 5: End-to-End Integration
- [ ] **Complete Workflow Implementation**
  - [ ] Photo upload → R2 storage → Supabase record creation
  - [ ] Background removal → processed image storage
  - [ ] 3D generation job creation → status tracking
  - [ ] Model completion → R2 storage → Supabase update
  - [ ] Model display in frontend

- [ ] **Error Handling & Recovery**
  - [ ] Handle API failures gracefully
  - [ ] Implement retry mechanisms for failed operations
  - [ ] Add user notifications for errors
  - [ ] Create admin interface for monitoring jobs

### Phase 6: Testing & Optimization
- [ ] **Testing**
  - [ ] Unit tests for utility functions
  - [ ] Integration tests for API endpoints
  - [ ] End-to-end testing of complete workflow
  - [ ] Performance testing with large images
  - [ ] Error scenario testing

- [ ] **Performance Optimization**
  - [ ] Optimize image processing pipeline
  - [ ] Implement caching strategies
  - [ ] Add image compression before upload
  - [ ] Optimize model loading and display

### Phase 7: Production Readiness
- [ ] **Security & Configuration**
  - [ ] Secure API endpoints
  - [ ] Validate file uploads (size, type, content)
  - [ ] Rate limiting for API calls
  - [ ] Environment-specific configurations

- [ ] **Monitoring & Logging**
  - [ ] Add comprehensive logging
  - [ ] Monitor job success/failure rates
  - [ ] Track API usage and costs
  - [ ] Set up alerts for system issues

## Technical Requirements

### Dependencies to Install
```json
{
  "@supabase/supabase-js": "^2.x",
  "@aws-sdk/client-s3": "^3.x",
  "@imgly/background-removal": "^1.x",
  "@google/model-viewer": "^3.x",
  "axios": "^1.x"
}
```

### Environment Variables Needed
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Cloudflare R2
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
R2_PUBLIC_URL=

# Hunyuan3D API
HUNYUAN3D_API_URL=https://asimfayaz-hunyuan3d-2-1.hf.space
```

## API Integration Details

### Hunyuan3D-2.1 Endpoints
1. **Health Check**: `GET /api/health`
2. **Generate Model**: `POST /api/generate`
3. **Check Status**: `GET /api/status?job_id=uuid`

### Generation Options
```json
{
  "enable_pbr": true,
  "should_remesh": true,
  "should_texture": true
}
```

## Success Criteria
- [ ] Users can upload photos and see background-removed versions
- [ ] 3D models are generated successfully from uploaded photos
- [ ] Models are displayed interactively using model-viewer
- [ ] All data is properly stored in Supabase and R2
- [ ] Error handling provides clear feedback to users
- [ ] Performance is acceptable for typical use cases

## Notes
- Background removal happens before 3D generation for better results
- Texture generation is enabled by default for high-quality models
- Job polling uses exponential backoff to avoid overwhelming the API
- All file storage uses Cloudflare R2 for cost-effectiveness and performance
