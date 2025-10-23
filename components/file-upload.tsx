"use client"

import type React from "react"
import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

// ============================================================================
// Types
// ============================================================================

interface FileUploadProps {
  /** Callback fired when a file is successfully uploaded */
  onUpload: (file: File) => void
  /** Optional callback to handle auth checks before upload */
  onUploadRequest?: () => void
  /** Disables the upload functionality when true */
  disabled?: boolean
}

// ============================================================================
// Constants
// ============================================================================

const ACCEPTED_FILE_TYPES = "image/*"
const MAX_FILE_SIZE_MB = 10
const ALLOWED_EXTENSIONS = "JPG, PNG"

// ============================================================================
// Component
// ============================================================================

export function FileUpload({ onUpload, onUploadRequest, disabled = false }: FileUploadProps) {
  // Track drag-over state for visual feedback
  const [isDragOver, setIsDragOver] = useState(false)

  // ============================================================================
  // File Processing Helpers
  // ============================================================================

  /**
   * Validates and processes an image file
   * Returns the file if it's a valid image, null otherwise
   */
  const validateImageFile = (file: File): File | null => {
    return file.type.startsWith("image/") ? file : null
  }

  /**
   * Handles the actual file upload logic
   * Checks for onUploadRequest callback to handle auth, otherwise uploads directly
   */
  const processFileUpload = useCallback(
    (file: File) => {
      const validFile = validateImageFile(file)
      if (!validFile) return

      // If auth check is required, trigger it before upload
      if (onUploadRequest) {
        onUploadRequest()
      }
      
      // Proceed with upload
      onUpload(validFile)
    },
    [onUpload, onUploadRequest]
  )

  /**
   * Opens a native file picker dialog
   * Used as fallback when onUploadRequest is not provided
   */
  const openFilePicker = useCallback(() => {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = ACCEPTED_FILE_TYPES
    
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        processFileUpload(file)
      }
    }
    
    input.click()
  }, [processFileUpload])

  // ============================================================================
  // Drag and Drop Handlers
  // ============================================================================

  /**
   * Handles drag over event
   * Prevents default to allow drop and shows visual feedback
   */
  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      if (disabled) return
      e.preventDefault()
      setIsDragOver(true)
    },
    [disabled]
  )

  /**
   * Handles drag leave event
   * Removes visual feedback when user drags away
   */
  const handleDragLeave = useCallback(
    (e: React.DragEvent) => {
      if (disabled) return
      e.preventDefault()
      setIsDragOver(false)
    },
    [disabled]
  )

  /**
   * Handles file drop event
   * Extracts the first image file and processes it
   */
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      if (disabled) return
      e.preventDefault()
      setIsDragOver(false)

      // Get all dropped files and find the first image
      const files = Array.from(e.dataTransfer.files)
      const imageFile = files.find((file) => file.type.startsWith("image/"))

      if (imageFile) {
        processFileUpload(imageFile)
      }
    },
    [disabled, processFileUpload]
  )

  // ============================================================================
  // Upload Button Handler
  // ============================================================================

  /**
   * Handles upload button click
   * Triggers auth check if provided, otherwise opens file picker
   */
  const handleUploadClick = (e: React.MouseEvent) => {
    e.preventDefault()
    
    if (onUploadRequest) {
      // Trigger auth check - parent component handles file selection
      onUploadRequest()
    } else {
      // No auth check needed - open file picker directly
      openFilePicker()
    }
  }

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div className="h-full flex flex-col">
      {/* Drop Zone Container */}
      <div
        className={cn(
          "border-2 border-dashed rounded-lg p-3 text-center flex-1 flex flex-col items-center justify-center transition-colors overflow-hidden",
          disabled
            ? "border-gray-200 bg-gray-50 cursor-not-allowed"
            : isDragOver
              ? "border-blue-500 bg-blue-50"
              : "border-gray-300 hover:border-gray-400"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="space-y-2 flex flex-col items-center justify-center max-h-full">
          {/* Upload Icon */}
          <div
            className={cn(
              "w-8 h-8 mx-auto rounded-full flex items-center justify-center flex-shrink-0",
              disabled ? "bg-gray-200" : "bg-gray-100"
            )}
          >
            <svg
              className={cn("w-4 h-4", disabled ? "text-gray-400" : "text-gray-600")}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
          </div>

          {/* Instructions Text - Hidden on mobile */}
          <div className="hidden sm:inline flex-shrink-0 text-center">
            <p className={cn("text-sm font-medium mb-1", disabled ? "text-gray-400" : "text-gray-900")}>
              {disabled ? "Photos uploaded" : "Drop front photo here"}
            </p>
            <p className={cn("text-xs mb-2", disabled ? "text-gray-400" : "text-gray-500")}>
              {disabled ? "Use the preview to manage photos" : "or click to browse"}
            </p>
          </div>

          {/* Upload Button and File Info */}
          {!disabled && (
            <div className="space-y-1 flex-shrink-0">
              <Button
                size="sm"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium"
                onClick={handleUploadClick}
              >
                Upload Front Photo
              </Button>

              <p className="text-xs text-gray-400">
                {ALLOWED_EXTENSIONS} up to {MAX_FILE_SIZE_MB}MB
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}