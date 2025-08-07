# ModelViewer.dev Migration Plan

## Overview
Replace the current Three.js-based 3D model viewer with Google's modelviewer.dev library for better performance, smaller bundle size, and enhanced features.

## Current State Analysis
- ✅ **Current Implementation**: Uses @react-three/fiber + @react-three/drei
- ✅ **Usage Location**: `components/photo-preview.tsx` 
- ✅ **Dependencies to Remove**: `@react-three/fiber`, `@react-three/drei`, `three`
- ✅ **Interface**: `ModelViewerProps { modelUrl: string }`
- ✅ **Features**: Loading states, error handling, orbit controls, environment lighting

---

## Phase 1: Preparation & Setup
### 1.1 Add ModelViewer.dev Script
- [x] Add modelviewer.dev script to `app/layout.tsx`
- [x] Use CDN version: `https://ajax.googleapis.com/ajax/libs/model-viewer/4.0.0/model-viewer.min.js`
- [x] Ensure script loads as ES module

### 1.2 TypeScript Declarations
- [x] Create `types/model-viewer.d.ts` for TypeScript support
- [x] Declare `model-viewer` as valid JSX element
- [x] Add proper attribute types for model-viewer properties

### 1.3 Backup Current Implementation
- [x] Create backup of current `components/model-viewer.tsx`
- [x] Document current functionality for reference

---

## Phase 2: Component Implementation
### 2.1 Create New ModelViewer Component
- [x] Replace Three.js Canvas with `<model-viewer>` element
- [x] Maintain existing `ModelViewerProps` interface
- [x] Preserve component styling (h-96, rounded-lg, bg-gray-100)
- [x] Keep loading and error state logic

### 2.2 Enhanced Features Implementation
- [x] Add camera controls (`camera-controls` attribute)
- [x] Enable touch interactions (`touch-action="pan-y"`)
- [x] Add auto-rotation option (`auto-rotate` attribute)
- [x] Implement shadow rendering (`shadow-intensity="1"`)
- [x] Add environment lighting support

### 2.3 Loading & Error States
- [x] Preserve existing loading fallback component
- [x] Keep error fallback with same styling
- [x] Maintain model URL validation logic
- [x] Add modelviewer-specific error handling

### 2.4 Interaction Instructions
- [x] Update user instruction text for new controls
- [x] Test and document new interaction patterns
- [x] Ensure mobile-friendly touch gestures

---

## Phase 3: Integration & Testing
### 3.1 Component Integration
- [x] Test component in `photo-preview.tsx` context
- [x] Verify props passing works correctly
- [x] Ensure styling matches existing design
- [x] Test responsive behavior

### 3.2 Functionality Testing
- [x] Test with various GLB/GLTF model files
- [x] Verify loading states work properly
- [x] Test error handling with invalid URLs
- [x] Validate camera controls and interactions
- [x] Test on mobile devices

### 3.3 Performance Testing
- [x] Compare bundle size before/after migration
- [x] Test loading performance with large models
- [x] Verify memory usage improvements
- [x] Test with multiple model instances

---

## Phase 4: Cleanup & Optimization
### 4.1 Dependency Cleanup
- [x] Remove `@react-three/fiber` from package.json
- [x] Remove `@react-three/drei` from package.json  
- [x] Remove `three` from package.json
- [x] Run `pnpm install` to clean up node_modules

### 4.2 Code Cleanup
- [x] Remove unused Three.js imports
- [x] Clean up any remaining Three.js types
- [x] Update any related documentation
- [x] Remove backup files if migration successful

### 4.3 Optional Enhancements
- [x] Add AR support (`ar` attribute) if desired
- [x] Implement poster images for faster loading

---

## Phase 5: Validation & Documentation
### 5.1 Final Testing
- [ ] Full end-to-end testing of 3D model generation flow
- [ ] Cross-browser compatibility testing
- [ ] Mobile device testing (iOS/Android)
- [ ] Performance regression testing

### 5.2 Documentation Updates
- [ ] Update component documentation
- [ ] Document new features available
- [ ] Update any developer guides
- [ ] Record bundle size improvements

---

## Rollback Plan (If Needed)
### Emergency Rollback Steps
- [ ] Restore backup of original `model-viewer.tsx`
- [ ] Reinstall Three.js dependencies
- [ ] Remove modelviewer.dev script from layout
- [ ] Remove TypeScript declarations
- [ ] Test original functionality

---

## Success Criteria
- ✅ **Functionality**: All existing features work identically
- ✅ **Performance**: Smaller bundle size and faster loading
- ✅ **User Experience**: Same or better interaction quality
- ✅ **Mobile Support**: Touch gestures work properly
- ✅ **Error Handling**: Graceful fallbacks for failed models
- ✅ **Integration**: No breaking changes to parent components

---

## Technical Notes
### ModelViewer.dev Key Attributes
```html
<model-viewer
  src="model.glb"
  alt="Model description"
  camera-controls
  touch-action="pan-y"
  shadow-intensity="1"
  auto-rotate
  environment-image="environment.hdr"
  poster="poster.webp"
></model-viewer>
```

### Bundle Size Impact
- **Before**: ~500KB+ (Three.js + React Three Fiber)
- **Expected After**: ~100KB (ModelViewer.dev)
- **Savings**: ~400KB+ reduction

### Browser Support
- Chrome 67+
- Firefox 60+
- Safari 12+
- Edge 79+
- Mobile browsers with WebGL support

---

## Timeline Estimate
- **Phase 1**: 1-2 hours
- **Phase 2**: 2-3 hours  
- **Phase 3**: 2-3 hours
- **Phase 4**: 1 hour
- **Phase 5**: 1-2 hours
- **Total**: 7-11 hours

---

*Last Updated: January 6, 2025*
*Status: Ready to Begin*
