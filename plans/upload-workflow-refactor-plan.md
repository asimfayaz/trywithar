# Upload Workflow Refactor Plan

## Phase 1: Storage Service Implementation (COMPLETE)
- [x] Complete `storeDraft` method in `lib/storage.service.ts` (implemented)
- [x] Implement `getDraft` method with error handling (implemented)
- [x] Add `purgeExpiredDrafts` method for cleanup (implemented as deleteExpiredDrafts)
- [x] Test IndexedDB integration with mock files (completed)

## Phase 2: Type System Refinement (COMPLETE)
- [x] Define `UploadItem` type in `app/page.tsx`
- [x] Update `PhotoSet` interface to use `UploadItem`
- [x] Add `isTemporary` and `expiresAt` to `ModelData` interface

## Phase 3: Upload Handling (COMPLETE)
- [x] Modify `handleUpload` to use StorageService
- [x] Implement temporary model creation with expiration
- [x] Add error handling for IndexedDB operations
- [x] Update state management for temporary models

## Phase 4: Processing Pipeline (COMPLETE)
- [x] Update `handleGenerateModel` to retrieve files from IndexedDB (implemented)
- [x] Implement persistent record creation in database (implemented)
- [x] Modify background removal to use stored files (implemented)
- [x] Add expiration removal during generation (implemented)

## Phase 5: Expiration Handling (COMPLETE)
- [x] Add cleanup interval in main component (implemented)
- [x] Implement frontend model expiration filtering (implemented)
- [x] Add backend purge of expired IndexedDB entries (implemented)

## Phase 6: Component Updates (COMPLETE)
- [x] Update `PhotoPreview` to handle `UploadItem` type (implemented)
- [x] Add visual indicators for temporary vs persisted items (implemented)
- [x] Implement expiration countdown timer in UI (implemented)
- [x] Add loading states for draft retrieval (implemented)

## Testing Plan
- [ ] Verify file persistence across page refreshes
- [ ] Test expiration cleanup functionality
- [ ] Validate background removal with temporary files
- [ ] Check quota handling during model generation
- [ ] Test resume functionality for interrupted processing

## Timeline
1. StorageService (1 hour)
2. Type System (30 mins)
3. Upload Handling (1 hour)
4. Processing Pipeline (1.5 hours)
5. Expiration Handling (45 mins)
6. Component Updates (1 hour)
7. Testing (1 hour)

**Total Estimated Time**: 6.25 hours
