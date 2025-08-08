# Environment Variable Refactoring Plan

## Objective
Centralize all environment variable access through `lib/env.ts` to ensure consistent validation, improve maintainability, and prevent runtime errors.

## Checklist

### Phase 1: R2-Related Files
- [ ] `lib/storage.service.ts`
  - Import required variables from `env.ts`
  - Replace `process.env.*` with imported constants
  - Remove any existing validation logic
- [ ] R2 API Routes
  - `app/api/upload-photo/route.ts`
  - `app/api/upload-processed/route.ts`
  - `app/api/generate-upload-url/route.ts`
  - Import required variables from `env.ts`
  - Replace `process.env.*` with imported constants

### Phase 2: Supabase Integration
- [ ] `lib/supabase.ts`
  - Import required variables from `env.ts`
  - Replace `process.env.*` with imported constants
  - Remove any existing validation logic
- [ ] `lib/auth.ts`
  - Import required variables from `env.ts`
  - Replace `process.env.*` with imported constants

### Phase 3: Other Services
- [ ] `lib/backgroundRemoval.ts`
  - Import required variables from `env.ts`
  - Replace `process.env.*` with imported constants
- [ ] `lib/hunyuan3d/client.ts`
  - Import required variables from `env.ts`
  - Replace `process.env.*` with imported constants

### Phase 4: Documentation
- [ ] Add JSDoc comments to `lib/env.ts` explaining usage
- [ ] Update README.md with:
  - Description of the centralized environment pattern
  - Instructions for adding new variables
  - Troubleshooting steps for missing variables

## Guidelines
1. **Server-side only**: Use this pattern only in server-side code and shared modules
2. **Client-side**: Continue using `process.env.NEXT_PUBLIC_*` directly in components
3. **Validation**: All new environment variables must be added to `env.ts`
4. **Testing**: After each file refactor, verify functionality
