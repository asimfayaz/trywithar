# Firtoz-Trellis Integration Plan

## Objective
Replace the existing Hunyuan3D API integration with Firtoz-Trellis while preserving the Hunyuan3D code for potential future use.

## Implementation Phases

### Phase 1: Setup and Configuration
- [x] Add REPLICATE_API_TOKEN to .env.local (already exists)
- [x] Install Replicate SDK: `npm install replicate`
- [x] Create new service file: `lib/firtoz-trellis/service.ts`
- [x] Define Firtoz-Trellis input/output types
- [x] Create webhook endpoint: `app/api/webhooks/replicate/route.ts`
- [x] Implement webhook security (HMAC validation)

### Phase 2: Backend Implementation
- [x] Comment out Hunyuan3D code in `app/api/generate/route.ts`
- [x] Implement Firtoz-Trellis call in generate endpoint
- [x] Update job creation to store prediction ID in `external_job_id`
- [x] Modify status endpoint to return job status from database
- [x] Implement webhook handler to update job status
- [x] Preserve Hunyuan3D code in commented blocks with `// HUNYUAN3D: ` prefix

### Phase 3: Frontend Adaptation
- [x] Support multiple image uploads (via existing UI for different views)
- [x] Use default Firtoz-Trellis parameters (texture_size=2048, mesh_simplify=0.9)
- [x] Maintain status polling logic in ProcessingStatus component
- [x] Preserve existing UI logic in commented blocks

### Phase 4: Testing and Validation
- [ ] Create unit tests for Firtoz-Trellis service
- [ ] Test API with various image inputs
- [ ] Verify webhook handling and database updates
- [ ] Test error handling scenarios
- [ ] Update Postman collection with new API format
- [ ] Perform security testing of webhook endpoint

### Phase 5: Deployment Preparation
- [ ] Update documentation with new workflow
- [ ] Add feature flag for model selection
- [ ] Create rollback plan
- [ ] Prepare database migration script (if needed)

## Code Preservation Strategy
All Hunyuan3D code will be commented out with clear markers:
```typescript
// HUNYUAN3D_START: Preserved for potential future use
/*
  ... existing Hunyuan3D code ...
*/
// HUNYUAN3D_END
```

## Implementation Notes
1. Using webhook-based processing instead of immediate completion
2. Prediction ID stored in `external_job_id` field
3. Frontend continues polling our status endpoint
4. Webhook security includes:
   - HMAC signature verification
   - Rate limiting
   - Payload validation
5. Database schema requires no changes
