"use client"

import React, { useState, useEffect } from "react"
import type { ModelViewerJSX } from "@/types/model-viewer"
import { useIsMobile } from "@/components/ui/use-mobile"

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Extend JSX to support the custom model-viewer web component
 */
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'model-viewer': ModelViewerJSX & React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>
    }
  }
}

/**
 * Props for the ModelViewer component
 */
interface ModelViewerProps {
  /** URL of the 3D model file (GLB/GLTF format) */
  modelUrl: string
  /** URL for placeholder image shown while model loads */
  poster?: string
}

// ============================================================================
// FALLBACK COMPONENTS
// ============================================================================

/**
 * Loading state shown while model-viewer library loads or model is being verified
 */
function ModelLoadingFallback() {
  return (
    <div className="w-full h-96 rounded-lg bg-gray-100 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading 3D model...</p>
      </div>
    </div>
  )
}

/**
 * Error state shown when model file cannot be loaded
 */
function ModelErrorFallback() {
  return (
    <div className="w-full h-96 rounded-lg bg-gray-100 flex items-center justify-center">
      <div className="text-center">
        {/* Error icon */}
        <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>

        {/* Error message */}
        <h3 className="text-lg font-medium text-gray-900 mb-2">Model Unavailable</h3>
        <p className="text-gray-600 mb-4">The 3D model file could not be loaded.</p>
        <p className="text-sm text-gray-500">This may happen if the model file has expired or been moved.</p>
      </div>
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * ModelViewer - A React wrapper for Google's model-viewer web component
 * 
 * Displays 3D models with interactive controls and AR support
 * Handles loading states, errors, and device-specific interactions
 */
export function ModelViewer({ modelUrl, poster = "/placeholder.svg" }: ModelViewerProps) {
  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================
  
  const [modelError, setModelError] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [modelViewerLoaded, setModelViewerLoaded] = useState(false)
  const isMobile = useIsMobile()

  // ============================================================================
  // EFFECT: Check if model-viewer web component is loaded
  // ============================================================================
  
  useEffect(() => {
    /**
     * Recursively checks if the model-viewer custom element is registered
     * Retries every 100ms until the element is available
     */
    const checkModelViewer = () => {
      if (typeof window !== 'undefined' && customElements.get('model-viewer')) {
        setModelViewerLoaded(true)
      } else {
        // Retry after 100ms if not yet loaded
        setTimeout(checkModelViewer, 100)
      }
    }

    checkModelViewer()
  }, [])

  // ============================================================================
  // EFFECT: Verify model URL is accessible
  // ============================================================================
  
  useEffect(() => {
    /**
     * Performs a HEAD request to verify the model file exists
     * Skips verification in development to avoid CORS issues
     */
    const checkModelUrl = async () => {
      // Skip verification in development to avoid CORS issues on mobile
      if (process.env.NODE_ENV === 'development') {
        console.warn('Skipping model URL verification in development mode')
        setIsLoading(false)
        return
      }

      try {
        const response = await fetch(modelUrl, { method: 'HEAD' })

        if (!response.ok) {
          console.error(`Model file not found: ${response.status} ${response.statusText}`)
          setModelError(true)
        }
      } catch (error) {
        console.error('Failed to check model URL:', error)
        setModelError(true)
      } finally {
        setIsLoading(false)
      }
    }

    // Only check URL after model-viewer library is loaded
    if (modelUrl && modelViewerLoaded) {
      checkModelUrl()
    }
  }, [modelUrl, modelViewerLoaded])

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================
  
  /**
   * Called when model successfully loads
   */
  const handleLoad = () => {
    setIsLoading(false)
    setModelError(false)
  }

  /**
   * Called when model fails to load
   */
  const handleError = () => {
    setModelError(true)
    setIsLoading(false)
  }

  // ============================================================================
  // CONDITIONAL RENDERING
  // ============================================================================
  
  // Show loading state while model-viewer library loads or model is being verified
  if (!modelViewerLoaded || isLoading) {
    return <ModelLoadingFallback />
  }

  // Show error state if model file is not accessible
  if (modelError) {
    return <ModelErrorFallback />
  }

  // ============================================================================
  // RENDER MODEL VIEWER
  // ============================================================================
  
  return (
    <div className="w-full">
      {/* Model viewer container */}
      <div className="w-full h-96 rounded-lg overflow-hidden bg-gray-100">
        {/* @ts-ignore - TypeScript doesn't recognize custom elements */}
        <model-viewer
        
          // Security & Loading
          crossOrigin="anonymous"
          src={modelUrl}
          poster={poster}
          alt="Generated 3D model"

          // Interaction Controls
          camera-controls              // Enable mouse/touch controls
          touch-action="pan-y"         // Allow vertical scrolling on mobile
          interaction-prompt="auto"    // Show interaction hints

          // Visual Effects
          shadow-intensity="1"         // Enable shadows

          // Auto-rotation
          auto-rotate                  // Enable automatic rotation
          auto-rotate-delay="3000"     // Wait 3s before auto-rotating
          rotation-per-second="30deg"  // Rotation speed
          
          // Augmented Reality
          ar                           // Enable AR button
          ar-modes="webxr scene-viewer quick-look"  // AR platforms
          ar-scale="auto"              // Auto-scale in AR
          
          style={{
            width: '100%',
            height: '100%',
            backgroundColor: '#f3f4f6'
          }}
          onLoad={handleLoad}
          onError={handleError}
        /> 
      </div>

      {/* Instruction text */}
      <div className="mt-4 text-center">
        <p className="text-sm text-gray-600">
          {isMobile
            ? "Touch and drag to rotate • Tap button to activate AR"
            : "Click and drag to rotate • Scroll to zoom"}
        </p>
      </div>
    </div>
  )
}
