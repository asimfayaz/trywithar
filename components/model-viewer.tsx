"use client"

import React from "react"
import { useState, useEffect } from "react"
import type { ModelViewerJSX } from "@/types/model-viewer"

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'model-viewer': ModelViewerJSX & React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>
    }
  }
}
interface ModelViewerProps {
  modelUrl: string
  /**
   * URL for a poster image to display while the model loads
   * @default "/placeholder.svg"
   */
  poster?: string
}

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

function ModelErrorFallback() {
  return (
    <div className="w-full h-96 rounded-lg bg-gray-100 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Model Unavailable</h3>
        <p className="text-gray-600 mb-4">The 3D model file could not be loaded.</p>
        <p className="text-sm text-gray-500">This may happen if the model file has expired or been moved.</p>
      </div>
    </div>
  )
}

export function ModelViewer({ modelUrl, poster = "/placeholder.svg" }: ModelViewerProps) {
  const [modelError, setModelError] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [modelViewerLoaded, setModelViewerLoaded] = useState(false)

  // Check if model-viewer is loaded and model URL is accessible
  useEffect(() => {
    const checkModelViewer = () => {
      if (typeof window !== 'undefined' && customElements.get('model-viewer')) {
        setModelViewerLoaded(true)
      } else {
        // Wait a bit more for model-viewer to load
        setTimeout(checkModelViewer, 100)
      }
    }

    checkModelViewer()
  }, [])

  useEffect(() => {
    const checkModelUrl = async () => {
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

    if (modelUrl && modelViewerLoaded) {
      checkModelUrl()
    }
  }, [modelUrl, modelViewerLoaded])

  // Show loading state while model-viewer is loading or model is being checked
  if (!modelViewerLoaded || isLoading) {
    return <ModelLoadingFallback />
  }

  // Show error state if model file is not accessible
  if (modelError) {
    return <ModelErrorFallback />
  }

  const handleLoad = () => {
    setIsLoading(false)
    setModelError(false)
  }

  const handleError = () => {
    setModelError(true)
    setIsLoading(false)
  }

  return (
    <div className="w-full">
      <div className="w-full h-96 rounded-lg overflow-hidden bg-gray-100">
{/* @ts-ignore */}
<model-viewer
  src={modelUrl}
  alt="Generated 3D model"
  camera-controls
  touch-action="pan-y"
  shadow-intensity="1"
  auto-rotate
  auto-rotate-delay="3000"
  rotation-per-second="30deg"
  interaction-prompt="auto"
  ar
  ar-modes="webxr scene-viewer quick-look"
  ar-scale="auto"
  poster={poster}
  style={{
    width: '100%',
    height: '100%',
    backgroundColor: '#f3f4f6'
  }}
  onLoad={handleLoad}
  onError={handleError}
/>
      </div>

      <div className="mt-4 text-center">
        <p className="text-sm text-gray-600">
          Click and drag to rotate • Scroll to zoom • Touch to interact
        </p>
      </div>
    </div>
  )
}
