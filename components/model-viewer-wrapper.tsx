"use client"

import React, { useEffect, useRef } from 'react'
import type { ModelViewerJSX } from '@/types/model-viewer'

// Type for the model-viewer element
type ModelViewerElement = HTMLElement & ModelViewerJSX

interface ModelViewerWrapperProps {
  src: string
  poster?: string
  className?: string
  style?: React.CSSProperties
  onLoad?: () => void
  onError?: () => void
  [key: string]: any // Allow all model-viewer attributes
}

export function ModelViewerWrapper({ 
  src,
  poster = "/placeholder.svg",
  className = "",
  style = {},
  onLoad,
  onError,
  ...props 
}: ModelViewerWrapperProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const modelViewerRef = useRef<ModelViewerElement | null>(null)

  useEffect(() => {
    if (!containerRef.current) return

    // Create model-viewer element
    const modelViewer = document.createElement('model-viewer') as ModelViewerElement
    modelViewer.src = src
    modelViewer.poster = poster
    modelViewer.alt = "Generated 3D model"
    modelViewer.setAttribute('crossorigin', 'anonymous')
    modelViewer.setAttribute('camera-controls', '')
    modelViewer.setAttribute('touch-action', 'pan-y')
    modelViewer.setAttribute('shadow-intensity', '0.7')
    modelViewer.setAttribute('auto-rotate', '')
    modelViewer.setAttribute('auto-rotate-delay', '3000')
    modelViewer.setAttribute('exposure', '1')
    modelViewer.setAttribute('rotation-per-second', '5deg')
    modelViewer.setAttribute('interaction-prompt', 'auto')
    modelViewer.setAttribute('ar', '')
    modelViewer.setAttribute('ar-modes', 'webxr scene-viewer quick-look')
    modelViewer.setAttribute('ar-scale', 'auto')

    // Set additional props
    Object.entries(props).forEach(([key, value]) => {
      if (value === true) {
        modelViewer.setAttribute(key, '')
      } else if (value !== false && value !== undefined) {
        modelViewer.setAttribute(key, String(value))
      }
    })

    // Event handlers
    if (onLoad) {
      modelViewer.addEventListener('load', onLoad)
    }
    if (onError) {
      modelViewer.addEventListener('error', onError)
    }

    // Style
    modelViewer.style.width = '100%'
    modelViewer.style.height = '100%'
    modelViewer.style.backgroundColor = '#f3f4f6'

    // Clear container and append model-viewer
    containerRef.current.innerHTML = ''
    containerRef.current.appendChild(modelViewer)
    modelViewerRef.current = modelViewer

    return () => {
      if (onLoad) {
        modelViewer.removeEventListener('load', onLoad)
      }
      if (onError) {
        modelViewer.removeEventListener('error', onError)
      }
    }
  }, [src, poster, onLoad, onError, props])

  return (
    <div 
      ref={containerRef} 
      className={className}
      style={style}
    />
  )
}
