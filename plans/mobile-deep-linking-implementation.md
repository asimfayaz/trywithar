# Mobile Deep Linking Implementation Checklist

## Phase 1: Foundation Setup
- [x] Add Next.js router dependency to package.json
- [x] Define URL parameter schema:
  - `view`: gallery/upload/generator/preview
  - `modelId`: ID of selected model

## Phase 2: Navigation Context Refactor
- [x] Remove localStorage view persistence
- [x] Add router integration to NavigationContext
- [x] Create navigation functions that update URL parameters
- [x] Update navigation calls to pass model IDs

## Phase 3: URL Synchronization
- [x] Implement URL parameter initialization in app/page.tsx
- [x] Implement URL parameter initialization in mobile-home-content.tsx
- [x] Add useEffect hooks to sync view state with URL

## Phase 4: Navigation Updates
- [x] Update all navigation calls to pass required parameters
- [x] Refactor model selection handler to use new navigation methods
- [x] Add model ID parameter to generator/preview navigation

## Phase 5: Edge Case Handling
- [x] Implement invalid model ID handling
- [x] Add error state for unmatched model IDs
- [x] Create redirect mechanism for invalid URLs
- [x] Add toast notifications for error cases

## Phase 6: Testing Plan
- [x] Create Cypress tests for:
  - Direct link to gallery view
  - Direct link to upload view
  - Direct link to generator view with model ID
  - Direct link to preview view with model ID
  - Browser back/forward navigation
- [ ] Manual testing on iOS/Android devices
- [ ] Unit tests for navigation functions

## Phase 7: Documentation
- [x] Update README.md with deep linking capabilities
- [x] Add comments to explain URL synchronization logic
- [x] Document URL schema for developers

## Timeline Estimate
- **Development**: 2-3 days
- **Testing**: 1-2 days
- **Deployment**: Can be shipped incrementally

> Note: Implementation should begin after user approval of this plan
