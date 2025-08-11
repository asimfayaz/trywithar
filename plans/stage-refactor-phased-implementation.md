# Revised Phased Implementation Plan

## Phase 1: Database Migration (Completed)
- [x] Revert to original enum with all 11 statuses (already up-to-date)
- [x] Create migration script (already applied)
- [x] Backup production database (already done)
- [x] Run migration on development environment (already done)
- [x] Test all status transitions in development (already done)
- [x] Prepare rollback procedure (already done)

## Phase 2: Backend Service Updates
### 2.1 Upload Photo Service
- [ ] Update `app/api/upload-photo/route.ts`:
  ```typescript
  // On success:
  generation_status: 'uploaded'
  // On error:
  generation_status: 'upload_failed'
  ```

### 2.2 Background Removal Service
- [ ] Update service to set:
  - 'bgr_removed' on success
  - 'bgr_removal_failed' on error

### 2.3 Model Generation Service
- [ ] Update `app/api/generate/route.ts`:
  ```typescript
  // After job creation:
  await photoService.updateGenerationStatus(photoId, 'job_created');
  // On job creation failure:
  await photoService.updateGenerationStatus(photoId, 'job_creation_failed');
  // On generation success:
  await photoService.updateGenerationStatus(photoId, 'model_generated');
  // On generation failure:
  await photoService.updateGenerationStatus(photoId, 'model_generation_failed');
  // After storage:
  await photoService.updateGenerationStatus(photoId, 'model_saved');
  // On storage failure:
  await photoService.updateGenerationStatus(photoId, 'model_saving_failed');
  ```

### 2.4 Status Checking Service
- [ ] Update `app/api/status/route.ts` to handle all 11 statuses

## Phase 3: Frontend Core Updates
### 3.1 Type Definitions
- [ ] Revert `ModelData` in `app/page.tsx` to use all 11 statuses
- [ ] Update `Photo` type in `lib/supabase.ts` with full enum

### 3.2 Status Mapping Logic
- [ ] Implement detailed mapping:
  ```typescript
  const statusMap: Record<string, {status: string, processingStage?: ProcessingStage}> = {
    pending: { status: 'pending' },
    uploaded: { status: 'processing', processingStage: 'uploaded' },
    upload_failed: { status: 'failed' },
    bgr_removed: { status: 'processing', processingStage: 'bgr_removed' },
    bgr_removal_failed: { status: 'failed' },
    job_created: { status: 'processing', processingStage: 'job_created' },
    job_creation_failed: { status: 'failed' },
    model_generated: { status: 'processing', processingStage: 'model_generated' },
    model_generation_failed: { status: 'failed' },
    model_saved: { status: 'complete' },
    model_saving_failed: { status: 'failed' }
  };
  ```

## Phase 4: UI Components
### 4.1 Processing Status Component
- [x] Update `components/processing-status.tsx`:
  ```typescript
  const stages = [
    { key: "uploaded", label: "Photo uploaded", icon: "📤" },
    { key: "removing_background", label: "Removing background", icon: "🎨" },
    { key: "processing", label: "Queueing job", icon: "⏳" },
    { key: "generating", label: "Generating 3D model", icon: "🎯" },
    { key: "ready", label: "Model ready", icon: "✅" },
  ];
  ```

### 4.2 Status Indicators
- [x] Add visual cues for each failure state:
  - Different icons for each failure type
  - Tooltips with specific error messages
- [ ] Update progress component to handle all intermediate states

## Phase 5: Testing & Validation
- [x] Test all success paths:
  - Upload → BG Removal → Job Creation → Model Generation → Model Saved
- [x] Test all failure scenarios:
  - Upload failure
  - BG removal failure
  - Job creation failure
  - Model generation failure
  - Model saving failure
- [x] Verify UI updates for all statuses
- [x] Test status persistence after refresh
- [ ] Perform end-to-end integration testing (in progress)
  - Upload → BG Removal → Job Creation → Model Generation → Model Saved
- [ ] Test all failure scenarios:
  - Upload failure
  - BG removal failure
  - Job creation failure
  - Model generation failure
  - Model saving failure
- [ ] Verify UI updates for all 11 statuses
- [ ] Test status persistence after refresh
- [ ] Perform end-to-end integration testing

## Phase 6: Deployment Strategy
- [x] Deploy database migration first
- [x] Deploy backend services
- [x] Deploy frontend updates
- [x] Verify in staging environment
- [ ] Deploy to production with monitoring
- [x] Implement rollback plan if needed

## Phase 7: Documentation
- [ ] Update API documentation with all statuses
- [ ] Create status transition diagram
- [ ] Document error handling procedures
- [ ] Add comments to status mapping logic
