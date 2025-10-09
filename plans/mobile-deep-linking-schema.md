# Mobile Deep Linking URL Parameter Schema

## Overview
Defines the URL parameters used for deep linking in the mobile view-based architecture.

## Parameters

### `view`
- **Purpose**: Specifies the current view to display
- **Values**:
  - `gallery`: Model gallery view
  - `upload`: Photo upload view
  - `generator`: 3D model generator view
  - `preview`: Model preview view
- **Required**: Yes
- **Example**: `?view=gallery`

### `modelId`
- **Purpose**: Identifies the selected model for generator/preview views
- **Format**: String (UUID format)
- **Required**: Only when `view` is `generator` or `preview`
- **Example**: `?view=preview&modelId=123e4567-e89b-12d3-a456-426614174000`

## Usage Guidelines
1. **Parameter Order**: `view` should always be first
2. **Validation**:
   - Invalid `view` values should default to `gallery`
   - Missing `modelId` for generator/preview should redirect to gallery
3. **State Synchronization**:
   - URL parameters should reflect current view state
   - Browser history should be preserved
4. **Mobile Considerations**:
   - URL length should be minimized
   - Parameters should be URL-encoded

## Example URLs
- Gallery: `/mobile?view=gallery`
- Upload: `/mobile?view=upload`
- Generator: `/mobile?view=generator&modelId=model_abc123`
- Preview: `/mobile?view=preview&modelId=model_def456`
