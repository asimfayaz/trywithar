# Model Creation Workflow Overhaul Plan (Checklist Version)

## Objective
Implement a streamlined model creation workflow with:
- [ ] Server-side background removal
- [ ] Specific statuses for each processing stage
- [ ] Multi-angle photo support (front, left, right, back)
- [ ] Reuse of existing UI components
- [ ] Simplified implementation for pre-production environment

## Database Implementation
- [ ] Create new status enum
- [ ] Create models table with columns for:
  - [ ] Original images (4 angles)
  - [ ] Background-removed images (4 angles)
  - [ ] Model assets
  - [ ] Timestamps
- [ ] Create indexes
- [ ] Update trigger function

```sql
CREATE TYPE model_status AS ENUM (
  'draft',
  'uploading_photos',
  'photos_uploaded',
  'removing_background',
  'generating_3d_model',
  'completed',
  'failed'
);

-- Table structure and indexes would follow here
```

## API Implementation
### POST /api/upload-photo
- [ ] Upload original photos with view parameter
- [ ] Update status: `uploading_photos` → `photos_uploaded`

### POST /api/remove-background
- [ ] Process all uploaded images
- [ ] Update status to `removing_background`
- [ ] Upload processed images to R2

### POST /api/generate-model
- [ ] Start model generation
- [ ] Update status to `generating_3d_model`
- [ ] Save model and update status to `completed`

## Frontend Implementation
- [ ] Reuse PhotoPreview component
- [ ] Update status mapping:
  ```ts
  const statusToStageMap = {
    removing_background: 'removing_background',
    generating_3d_model: 'generating'
  };
  ```
- [ ] Implement workflow integration:
  ```tsx
  function ModelCreationPage() {
    const [status, setStatus] = useState('draft');
    const processModel = async () => {
      setStatus('uploading_photos');
      await uploadPhotos();
      setStatus('removing_background');
      await removeBackgrounds();
      setStatus('generating_3d_model');
      await generateModel();
    };
    // ...
  }
  ```

## Phased Implementation Checklist

### Phase 1: Database Migration (Day 1)
- [ ] Create new models table
- [ ] Migrate existing data (if any)
- [ ] Remove old photos table

### Phase 2: Backend Implementation (Day 2-3)
- [ ] Implement new API endpoints
- [ ] Add server-side background removal
- [ ] Integrate with Hunyuan 3D API

### Phase 3: Frontend Integration (Day 4)
- [ ] Update status mapping in PhotoPreview
- [ ] Connect to new API endpoints
- [ ] Test workflow

## Testing Plan
- [ ] Smoke Test: Full workflow
- [ ] Error Cases:
  - [ ] Failed uploads
  - [ ] Background removal failures
  - [ ] Model generation timeouts
- [ ] Validation:
  - [ ] File type/size validation
  - [ ] Authentication checks
  - [ ] Status transition validation

## Deployment
- [ ] Single-step deployment to staging
- [ ] Database reset during deployment
- [ ] Basic error logging

## Rollback Plan
- [ ] Revert to database backup
- [ ] Redeploy previous API version
- [ ] Disable new UI components
