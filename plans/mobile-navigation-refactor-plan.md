# Mobile Navigation Refactor Plan

## Objective
Transform the current desktop grid layout into a mobile-friendly single-view navigation system where users see one section at a time with navigation controls.

## Current State Analysis
The app currently uses a two-column grid layout:
- Left column: Upload section + Model Gallery
- Right column: Model Generator/Preview

## Target Mobile Flow
1. **Initial View**: Model Gallery with "+ Model" CTA
2. **Gallery Actions**:
   - Tap existing model → Show ModelPreview
   - Tap "+ Model" → Show Upload section
3. **Upload Section**: Shows with "← Model Gallery" back navigation
4. **Upload Completion**: Auto-transition to ModelGenerator
5. **Generation Success**: Auto-transition to ModelPreview
6. **ModelPreview**: Can be reached via generation success or gallery selection

## Implementation Checklist

### Phase 1: State Management & Navigation
- [ ] Add view state to track current section
  ```typescript
  type ViewState = 'gallery' | 'upload' | 'generator' | 'preview'
  const [currentView, setCurrentView] = useState<ViewState>('gallery')
  ```

- [ ] Create navigation functions
  ```typescript
  const navigateToGallery = () => setCurrentView('gallery')
  const navigateToUpload = () => setCurrentView('upload')
  const navigateToGenerator = () => setCurrentView('generator')
  const navigateToPreview = () => setCurrentView('preview')
  ```

### Phase 2: Responsive Layout
- [ ] Implement mobile breakpoint detection
- [ ] Create conditional rendering logic
  ```typescript
  const isMobile = useMediaQuery('(max-width: 768px)')
  ```

- [ ] Desktop: Maintain current grid layout
- [ ] Mobile: Render single view based on `currentView`

### Phase 3: Component Modifications

#### ModelGallery Component
- [ ] Add "+ Model" button/CTA
- [ ] Update onSelectModel handler to navigate to preview
- [ ] Style for mobile-first approach
- [ ] Add mobile header with navigation controls when in full view

#### Upload Section
- [ ] Add "← Model Gallery" back navigation
- [ ] Update upload completion to navigate to generator
- [ ] Add mobile header with title and back button

#### ModelGenerator Component
- [ ] Add navigation controls (back button, title)
- [ ] Update generation success to navigate to preview
- [ ] Add props for navigation awareness:
  ```typescript
  onNavigateBack?: () => void
  isFullView?: boolean
  ```

#### ModelPreview Component
- [ ] Ensure it can be displayed independently
- [ ] Add navigation to return to gallery
- [ ] Add props for navigation awareness:
  ```typescript
  onNavigateBack?: () => void
  isFullView?: boolean
  ```

### Phase 4: Event Handler Updates
- [ ] Modify `handleSelectModel` to set view to 'preview'
- [ ] Update `handleUpload` completion to set view to 'generator'
- [ ] Update `handleGenerateModel` success to set view to 'preview'
- [ ] Add navigation triggers for back buttons
- [ ] Preserve state (selectedModel, currentPhotoSet) during navigation

### Phase 5: Styling & UX
- [ ] Mobile-responsive header with navigation controls
- [ ] Smooth transitions between views
- [ ] Proper spacing and sizing for mobile screens
- [ ] Touch-friendly button sizes
- [ ] Consistent header implementation across views:
  ```jsx
  {isFullView && (
    <div className="sticky top-0 bg-white z-10 py-4 border-b">
      <div className="container mx-auto flex items-center">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={onNavigateBack}
          className="mr-2"
        >
          ←
        </Button>
        <h1 className="text-xl font-bold">
          {viewTitle}
        </h1>
      </div>
    </div>
  )}
  ```

### Phase 6: Testing
- [ ] Test all navigation paths on mobile devices
- [ ] Verify desktop layout remains unchanged
- [ ] Test edge cases (no models, upload failures, etc.)
- [ ] Performance testing on mobile networks
- [ ] Test state preservation during navigation

## Technical Considerations

### State Management
- Need to preserve existing state (selectedModel, currentPhotoSet, etc.)
- Ensure navigation doesn't interfere with model generation flow
- Handle authentication state changes appropriately
- Implement navigation history stack for back button functionality

### Component Enhancements
- **ModelGenerator**: Add navigation props and mobile header
- **ModelPreview**: Add navigation props and mobile header  
- **ModelGallery**: Add "+ Model" CTA and mobile styling
- **Upload Section**: Add back navigation and mobile header

### Responsive Design
- Use Tailwind's responsive utilities
- Consider using `useMediaQuery` hook for breakpoints
- Maintain desktop experience while enhancing mobile
- Use conditional rendering based on `isMobile` state

### Navigation Flow
```
Gallery → (select model) → Preview
Gallery → (+ Model) → Upload → (upload) → Generator → (success) → Preview
```

### Implementation Details
- Create NavigationContext for global view state management
- Implement ViewRouter component in app/page.tsx
- Add mobile-specific navigation controls to each view
- Handle automatic navigation transitions on completion events
- Ensure state preservation during view changes

## Component Props Updates

### ModelGenerator Props
```typescript
interface ModelGeneratorProps {
  // Existing props...
  onNavigateBack?: () => void
  isFullView?: boolean
}
```

### ModelPreview Props  
```typescript
interface ModelPreviewProps {
  // Existing props...
  onNavigateBack?: () => void
  isFullView?: boolean
}
```

## Branch Strategy
- Create feature branch: `feature/mobile-navigation`
- Test thoroughly before merging to main
- Consider A/B testing if needed

## Dependencies
- No new external dependencies needed
- Uses existing React hooks and Tailwind CSS
- May need to update component props for navigation

## Risk Assessment
- **Low risk**: Changes are mostly UI/UX focused
- **Medium risk**: Navigation state could interfere with existing flows
- **Mitigation**: Thorough testing of all user journeys

## Timeline Estimate
- Implementation: 2-3 days
- Testing: 1-2 days
- Review: 1 day

## Success Metrics
- Mobile conversion rate improvement
- User engagement on mobile devices
- Reduced bounce rate on mobile
- Positive user feedback on mobile experience
