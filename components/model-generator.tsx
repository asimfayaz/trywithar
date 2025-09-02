"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { PhotoSet, UploadItem } from "@/app/page"
import type { ModelStatus } from "@/lib/supabase/types"

interface ModelGeneratorProps {
  photoSet: PhotoSet
  onUpload: (file: File | UploadItem, position: keyof PhotoSet) => void
  onRemove: (position: keyof PhotoSet) => void
  onGenerate?: () => void
  canGenerate?: boolean
  isGenerating?: boolean
  isRetrying?: boolean
  processingStage?: ModelStatus
  selectedModel?: any
  errorMessage?: string
  onNavigateBack?: () => void
  isFullView?: boolean
}

const positions = [
  { key: "front" as keyof PhotoSet, label: "Front", required: true },
  { key: "left" as keyof PhotoSet, label: "Left", required: false },
  { key: "right" as keyof PhotoSet, label: "Right", required: false },
  { key: "back" as keyof PhotoSet, label: "Back", required: false },
]

const stages: { key: ModelStatus; label: string; icon: string }[] = [
  { key: 'uploading_photos', label: 'Uploading photos', icon: '📤' },
  { key: 'removing_background', label: 'Removing background', icon: '🎨' },
  { key: 'generating_3d_model', label: 'Generating 3D model', icon: '🎯' },
];

// Error messages for different failure states
const errorMessages: Record<string, string> = {
  'upload_failed': 'Failed to upload photo',
  'bgr_removal_failed': 'Failed to remove background',
  'job_creation_failed': 'Failed to create job',
  'model_generation_failed': 'Failed to generate 3D model',
  'model_saving_failed': 'Failed to save 3D model'
}

export function ModelGenerator({
  photoSet,
  onUpload,
  onRemove,
  onGenerate,
  canGenerate = false,
  isGenerating = false,
  isRetrying = false,
  processingStage,
  selectedModel,
  errorMessage,
}: ModelGeneratorProps) {
  const [dragOver, setDragOver] = useState<keyof PhotoSet | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [draftLoading, setDraftLoading] = useState<Record<keyof PhotoSet, boolean>>({
    front: false,
    left: false,
    right: false,
    back: false
  })

  // Clean up blob URLs when component unmounts or photos change
  useEffect(() => {
    return () => {
      // Revoke all blob URLs that don't have persistent URLs
      Object.values(photoSet).forEach(item => {
        if (item && item.dataUrl && !item.persistentUrl) {
          // No need to revoke data URLs as they are in-memory
        }
      });
    };
  }, [photoSet]);

  const handleFileSelect = (position: keyof PhotoSet) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.type.startsWith("image/")) {
      onUpload(file, position)
    }
  }

  const handleDragOver = (position: keyof PhotoSet) => (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(position)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(null)
  }

  const handleDrop = (position: keyof PhotoSet) => (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(null)

    const files = Array.from(e.dataTransfer.files)
    const imageFile = files.find((file) => file.type.startsWith("image/"))

    if (imageFile) {
      onUpload(imageFile, position)
    }
  }

  const showProcessing = (isGenerating || 
                         selectedModel?.status === "processing" || 
                         selectedModel?.status === "failed") && 
                         processingStage
  const currentStageIndex = processingStage ? stages.findIndex((s) => s.key === processingStage) : -1

  return (
    <div className="h-full flex flex-col">
      {/* Photo Grid - 1x4 horizontal layout with square aspect ratio */}
      <div className="grid grid-cols-4 gap-4 mb-4">
        {positions.map(({ key, label, required }) => {
          const photo = photoSet[key]
          const isDragOver = dragOver === key
          const isLoadingPosition = draftLoading[key]

          return (
            <div key={key} className="flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">
                  {label} {required && <span className="text-red-500">*</span>}
                </span>
                {photo && key !== "front" && (
                  <button
                    onClick={isRetrying ? undefined : () => onRemove(key)}
                    disabled={isRetrying}
                    className={`text-xs ${isRetrying ? 'text-gray-400 cursor-not-allowed' : 'text-red-500 hover:text-red-700'}`}
                  >
                    Remove
                  </button>
                )}
              </div>

              <div
                className={cn(
                  "relative border-2 border-dashed rounded-lg aspect-square transition-colors group",
                  isDragOver
                    ? "border-blue-500 bg-blue-50 cursor-pointer"
                    : photo
                      ? "border-green-300 bg-green-50 hover:border-green-400 cursor-pointer"
                      : "border-gray-300 hover:border-gray-400 bg-gray-50 hover:bg-gray-100 cursor-pointer",
                  isLoadingPosition ? "animate-pulse" : "",
                  isRetrying ? "opacity-50 cursor-not-allowed" : ""
                )}
                onDragOver={isRetrying ? undefined : handleDragOver(key)}
                onDragLeave={isRetrying ? undefined : handleDragLeave}
                onDrop={isRetrying ? undefined : handleDrop(key)}
                onClick={isRetrying ? undefined : () => document.getElementById(`file-input-${key}`)?.click()}
              >
                <input
                  id={`file-input-${key}`}
                  type="file"
                  accept="image/*"
                  onChange={isRetrying ? undefined : handleFileSelect(key)}
                  disabled={isRetrying}
                  className="hidden"
                />

                {photo ? (
                  <div className="relative aspect-square w-full h-full">
                    <img
                      src={photo.persistentUrl || photo.dataUrl}
                      alt={`${label} view`}
                      className="w-full h-full object-cover rounded-lg"
                    />
                    
                    {/* Loading spinner */}
                    {isLoadingPosition && (
                      <div className="absolute inset-0 bg-black bg-opacity-20 flex items-center justify-center rounded-lg">
                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white"></div>
                      </div>
                    )}

                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all rounded-lg flex items-center justify-center">
                      <Button
                        size="sm"
                        variant="secondary"
                        className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 hover:bg-white backdrop-blur-sm shadow-lg border border-white/20"
                        onClick={(e) => {
                          e.stopPropagation()
                          document.getElementById(`file-input-${key}`)?.click()
                        }}
                        disabled={isRetrying}
                      >
                        Replace
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full p-2">
                    {isLoadingPosition ? (
                      <div className="flex flex-col items-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500 mb-2"></div>
                        <span className="text-xs text-gray-500">Loading...</span>
                      </div>
                    ) : (
                      <>
                        <div className="w-8 h-8 rounded-full flex items-center justify-center mb-2 bg-gray-200">
                          <svg
                            className="w-4 h-4 text-gray-500"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                        </div>
                        <span className="text-xs font-medium text-gray-600">
                          {isDragOver ? `Drop ${label.toLowerCase()} photo` : `Add ${label}`}
                        </span>
                        <span className="text-xs mt-1 text-gray-400">
                          Click or drag
                        </span>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Generate Button - appears right after the photo grid */}
      {photoSet.front && selectedModel && onGenerate && (
        <div className="mb-4">
          <Button
            onClick={onGenerate}
            disabled={!canGenerate || isRetrying}
            className="w-full bg-blue-600 hover:bg-blue-700 h-12 text-base font-medium"
          >
            {isRetrying
              ? "Retrying..."
              : isGenerating
                ? "Generating..."
                : selectedModel.status === "completed"
                  ? "Regenerate 3D Model"
                  : "Generate 3D Model"}
          </Button>
        </div>
      )}

      {/* Processing Steps - appears below the button during generation */}
      {showProcessing && (
        <div className="mb-4 bg-gray-50 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-900 mb-3">Generation Progress</h3>
          <div className="space-y-3">
            {stages.map((stageItem, index) => {
              // Adjust stage index for failed models to show first two as completed
              let adjustedStageIndex = currentStageIndex;
              if (selectedModel?.status === "failed") {
                adjustedStageIndex = 2; // Generating 3D model step
              }

              const isCompleted = index < adjustedStageIndex
              const isCurrent = index === adjustedStageIndex
              const isPending = index > adjustedStageIndex

              return (
                <div key={stageItem.key} className="flex items-center space-x-3">
                  {/* Icon */}
                  <div
                    className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center text-xs flex-shrink-0",
                      isCompleted && "bg-green-500 text-white",
                      isCurrent && selectedModel?.status === "processing" && "bg-blue-500 text-white",
                      isCurrent && selectedModel?.status === "failed" && "bg-red-500 text-white",
                      isPending && "bg-gray-200 text-gray-500",
                    )}
                  >
                    {isCompleted || (index === 2 && selectedModel?.status === "completed") ? (
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    ) : isCurrent && selectedModel?.status === "failed" ? (
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                          clipRule="evenodd"
                        />
                      </svg>
                    ) : isCurrent ? (
                      <div className="w-2 h-2 bg-white rounded-full animate-spin" />
                    ) : (
                      <div className="w-2 h-2 bg-gray-400 rounded-full" />
                    )}
                  </div>

                  {/* Label */}
                  <span
                    className={cn(
                      "text-sm font-medium",
                      isCompleted && "text-green-600",
                      isCurrent && selectedModel?.status === "processing" && "text-blue-600",
                      isCurrent && selectedModel?.status === "failed" && "text-red-600",
                      isPending && "text-gray-500",
                    )}
                  >
                    {stageItem.label}
                    {stageItem.key === 'generating_3d_model' && 
                     isCurrent && 
                     selectedModel?.status === "failed" && (
                      <button 
                        onClick={onGenerate}
                        className="text-sm text-blue-500 hover:text-blue-700 ml-6 hover:underline"
                      >
                        Retry?
                      </button>
                    )}
                    {isCurrent && selectedModel?.status === "failed" && errorMessage && (
                      <span className="ml-2 text-xs text-red-500">({errorMessage})</span>
                    )}
                  </span>

                  {/* Loading indicator for current stage */}
                  {isCurrent && selectedModel?.status === "processing" && (
                    <div className="flex-1 flex justify-end">
                      <div className="flex space-x-1">
                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" />
                        <div
                          className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce"
                          style={{ animationDelay: "0.1s" }}
                        />
                        <div
                          className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce"
                          style={{ animationDelay: "0.2s" }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="text-center">
        <p className="text-sm text-gray-500">
          {(!selectedModel || selectedModel?.status === "pending") && "Upload up to 4 photos for better 3D model quality"}
        </p>
        <p className="text-xs mt-1 text-gray-400">
          {(!selectedModel || selectedModel?.status === "pending") && "Front photo is required. Left, Right, and Back are optional."}
        </p>
      </div>
    </div>
  )
}
