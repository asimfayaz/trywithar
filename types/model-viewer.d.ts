import React from 'react'

export interface ModelViewerJSX {
  src?: string
  alt?: string
  poster?: string
  'seamless-poster'?: boolean
  loading?: 'auto' | 'lazy' | 'eager'
  reveal?: 'auto' | 'interaction' | 'manual'
  'with-credentials'?: boolean
  
  // Camera and controls
  'camera-controls'?: boolean
  'disable-zoom'?: boolean
  'disable-pan'?: boolean
  'disable-tap'?: boolean
  'touch-action'?: string
  'camera-orbit'?: string
  'camera-target'?: string
  'field-of-view'?: string
  'min-camera-orbit'?: string
  'max-camera-orbit'?: string
  'min-field-of-view'?: string
  'max-field-of-view'?: string
  'bounds'?: string
  'interpolation-decay'?: number
  
  // Lighting and environment
  'environment-image'?: string
  'skybox-image'?: string
  'shadow-intensity'?: string | number
  'shadow-softness'?: string | number
  'exposure'?: string | number
  
  // Animation
  'animation-name'?: string
  'animation-crossfade-duration'?: string | number
  'auto-rotate'?: boolean
  'auto-rotate-delay'?: string | number
  'rotation-per-second'?: string
  
  // AR
  ar?: boolean
  'ar-modes'?: string
  'ar-scale'?: string
  'ar-placement'?: string
  'ios-src'?: string
  
  // Interaction
  'interaction-prompt'?: 'auto' | 'when-focused' | 'none'
  'interaction-prompt-style'?: string
  'interaction-prompt-threshold'?: string | number
  
  // Variants and materials
  'variant-name'?: string
  'orientation'?: string
  'scale'?: string
  
  // Events
  onLoad?: (event: CustomEvent) => void
  onPreload?: (event: CustomEvent) => void
  onModelVisibility?: (event: CustomEvent) => void
  onProgress?: (event: CustomEvent) => void
  onError?: (event: CustomEvent) => void
  onCameraChange?: (event: CustomEvent) => void
  onEnvironmentChange?: (event: CustomEvent) => void
  onVariantChange?: (event: CustomEvent) => void
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'model-viewer': ModelViewerJSX & React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>
    }
  }
}
