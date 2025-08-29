
# Model Preview Refactoring Plan

## Objective
Split the existing `ModelPreview` component into two separate components:
- `ModelGenerator`: Handles interactive photo uploads and model generation
- `ModelPreview`: Displays generated model and static photo grid

## Implementation Checklist

### Preparation
- [ ] Ensure clean git state
- [ ] Create feature branch: `refactor/model-components`

### File Creation
- [ ] Create `components/model-generator.tsx`
- [ ] Create `components/model-preview.tsx`

### ModelGenerator Implementation
- [ ] Move interactive photo grid from original component
- [ ] Transfer state management (dragOver, isLoading, draftLoading)
- [ ] Include processing stages display
- [ ] Implement generation controls
- [ ] Add error handling and retry functionality

### ModelPreview Implementation
- [ ] Create model viewer display
- [ ] Implement static photo grid (read-only)
- [ ] Remove all interactive elements

### Parent Component Updates (app/page.tsx)
- [ ] Import new components
- [ ] Implement conditional rendering:
  ```tsx
  {selectedModel?.status === 'completed' && modelUrl ? (
    <ModelPreview modelUrl={modelUrl} photoSet={photoSet} />
  ) : (
    <ModelGenerator
      photoSet={photoSet}
      onUpload={handleUpload}
      onRemove={handleRemove}
      onGenerate={handleGenerate}
      canGenerate={canGenerate}
      isGenerating={isGenerating}
      processingStage={processingStage}
      selectedModel={selectedModel}
      errorMessage={errorMessage}
    />
  )}
  ```

### Cleanup
- [ ] Delete original `model-preview.tsx`
- [ ] Update imports if needed

### Testing
- [ ] Verify photo uploads in ModelGenerator
- [ ] Test model generation workflow
- [ ] Confirm processing status displays
- [ ] Check static photo grid in ModelPreview
- [ ] Validate all states

### Finalization
- [ ] Run test suite
- [ ] Commit changes
- [ ] Push branch

## Component Responsibilities
| **Feature**               | **ModelGenerator** | **ModelPreview** |
|---------------------------|--------------------|------------------|
| Photo Uploads             | ✓                  |                  |
| Drag/Drop                 | ✓                  |                  |
| Remove Buttons            | ✓                  |                  |
| Generate Button           | ✓                  |                  |
| Processing Status         | ✓                  |                  |
| 3D Model Display          |                    | ✓                |
| Static Photo Grid         |                    | ✓                |
| Interactive Elements      | ✓                  |                  |

## Notes
- Maintain all existing functionality during refactor
- Ensure zero regression in user experience
- ModelPreview should be purely presentational
- Test edge cases thoroughly

