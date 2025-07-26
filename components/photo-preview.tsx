"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { PhotoSet } from "@/app/page"
import { ModelViewer } from "@/components/model-viewer"

interface PhotoPreviewProps {
  photoSet: PhotoSet
  onUpload: (file: File, position: keyof PhotoSet) => void
  onRemove: (position: keyof PhotoSet) => void
  disabled?: boolean
  onGenerate?: () => void
  canGenerate?: boolean
  isGenerating?: boolean
  processingStage?: "uploaded" | "processing" | "generating" | "ready"
  modelUrl?: string
  selectedModel?: any
}

const positions = [
  { key: "front" as keyof PhotoSet, label: "Front", required: true },
  { key: "left" as keyof PhotoSet, label: "Left", required: false },
  { key: "right" as keyof PhotoSet, label: "Right", required: false },
  { key: "back" as keyof PhotoSet, label: "Back", required: false },
]

const stages = [
  { key: "uploaded", label: "Photo uploaded", icon: "📤" },
  { key: "processing", label: "Processing image", icon: "🔄" },
  { key: "generating", label: "Generating 3D model", icon: "🎯" },
  { key: "ready", label: "Model ready", icon: "✅" },
]

export function PhotoPreview({
  photoSet,
  onUpload,
  onRemove,
  disabled = false,
  onGenerate,
  canGenerate = false,
  isGenerating = false,
  processingStage,
  modelUrl,
  selectedModel,
}: PhotoPreviewProps) {
  const [dragOver, setDragOver] = useState<keyof PhotoSet | null>(null)

  const handleFileSelect = (position: keyof PhotoSet) => (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return
    const file = e.target.files?.[0]
    if (file && file.type.startsWith("image/")) {
      onUpload(file, position)
    }
  }

  const handleDragOver = (position: keyof PhotoSet) => (e: React.DragEvent) => {
    if (disabled) return
    e.preventDefault()
    setDragOver(position)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    if (disabled) return
    e.preventDefault()
    setDragOver(null)
  }

  const handleDrop = (position: keyof PhotoSet) => (e: React.DragEvent) => {
    if (disabled) return
    e.preventDefault()
    setDragOver(null)

    const files = Array.from(e.dataTransfer.files)
    const imageFile = files.find((file) => file.type.startsWith("image/"))

    if (imageFile) {
      onUpload(imageFile, position)
    }
  }

  const showModel = selectedModel?.status === "complete" && modelUrl
  const showProcessing = (isGenerating || selectedModel?.status === "processing") && processingStage
  const currentStageIndex = processingStage ? stages.findIndex((s) => s.key === processingStage) : -1

  // Disable photo controls when generating, processing, or model is complete
  const photoControlsDisabled =
    disabled || isGenerating || selectedModel?.status === "processing" || selectedModel?.status === "complete"

  return (
    <div className="h-full flex flex-col">
      {/* 3D Model Viewer - Shows when model is ready */}
      {showModel && (
        <div className="flex-1 mb-6 min-h-0">
          <ModelViewer modelUrl={modelUrl} />
        </div>
      )}

      {/* Photo Grid - 1x4 horizontal layout with square aspect ratio */}
      <div className="grid grid-cols-4 gap-4 mb-4">
        {positions.map(({ key, label, required }) => {
          const photo = photoSet[key]
          const isDragOver = dragOver === key

          return (
            <div key={key} className="flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <span className={cn("text-sm font-medium", photoControlsDisabled ? "text-gray-400" : "text-gray-700")}>
                  {label} {required && <span className="text-red-500">*</span>}
                </span>
                {photo && !photoControlsDisabled && key !== "front" && (
                  <button
                    onClick={() => onRemove(key)}
                    className="text-xs text-red-500 hover:text-red-700"
                    disabled={photoControlsDisabled}
                  >
                    Remove
                  </button>
                )}
              </div>

              <div
                className={cn(
                  "relative border-2 border-dashed rounded-lg aspect-square transition-colors group",
                  photoControlsDisabled
                    ? "border-gray-200 bg-gray-50 cursor-not-allowed"
                    : isDragOver
                      ? "border-blue-500 bg-blue-50 cursor-pointer"
                      : photo
                        ? "border-green-300 bg-green-50 hover:border-green-400 cursor-pointer"
                        : "border-gray-300 hover:border-gray-400 bg-gray-50 hover:bg-gray-100 cursor-pointer",
                )}
                onDragOver={photoControlsDisabled ? undefined : handleDragOver(key)}
                onDragLeave={photoControlsDisabled ? undefined : handleDragLeave}
                onDrop={photoControlsDisabled ? undefined : handleDrop(key)}
                onClick={() => !photoControlsDisabled && document.getElementById(`file-input-${key}`)?.click()}
              >
                <input
                  id={`file-input-${key}`}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect(key)}
                  className="hidden"
                  disabled={photoControlsDisabled}
                />

                {photo ? (
                  <div className="relative aspect-square w-full h-full">
                    <img
                      src={URL.createObjectURL(photo) || "/placeholder.svg"}
                      alt={`${label} view`}
                      className="w-full h-full object-cover rounded-lg"
                    />
                    {!photoControlsDisabled && (
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all rounded-lg flex items-center justify-center">
                        <Button
                          size="sm"
                          variant="secondary"
                          className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 hover:bg-white backdrop-blur-sm shadow-lg border border-white/20"
                          onClick={(e) => {
                            e.stopPropagation()
                            document.getElementById(`file-input-${key}`)?.click()
                          }}
                        >
                          Replace
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full p-2">
                    <div
                      className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center mb-2",
                        photoControlsDisabled ? "bg-gray-200" : "bg-gray-200",
                      )}
                    >
                      <svg
                        className={cn("w-4 h-4", photoControlsDisabled ? "text-gray-400" : "text-gray-500")}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </div>
                    <span
                      className={cn("text-xs font-medium", photoControlsDisabled ? "text-gray-400" : "text-gray-600")}
                    >
                      {!photoControlsDisabled && isDragOver ? `Drop ${label.toLowerCase()} photo` : `Add ${label}`}
                    </span>
                    <span className={cn("text-xs mt-1", photoControlsDisabled ? "text-gray-400" : "text-gray-400")}>
                      {!photoControlsDisabled ? "Click or drag" : "Locked"}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Generate Button - appears right after the photo grid */}
      {photoSet.front && selectedModel && !showModel && onGenerate && (
        <div className="mb-4">
          <Button
            onClick={onGenerate}
            disabled={!canGenerate}
            className="w-full bg-blue-600 hover:bg-blue-700 h-12 text-base font-medium"
          >
            {isGenerating
              ? "Generating..."
              : selectedModel.status === "complete"
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
              const isCompleted = index < currentStageIndex
              const isCurrent = index === currentStageIndex
              const isPending = index > currentStageIndex

              return (
                <div key={stageItem.key} className="flex items-center space-x-3">
                  {/* Icon */}
                  <div
                    className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center text-xs flex-shrink-0",
                      isCompleted && "bg-green-500 text-white",
                      isCurrent && "bg-blue-500 text-white animate-pulse",
                      isPending && "bg-gray-200 text-gray-500",
                    )}
                  >
                    {isCompleted ? (
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
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
                      isCurrent && "text-blue-600",
                      isPending && "text-gray-500",
                    )}
                  >
                    {stageItem.label}
                  </span>

                  {/* Loading indicator for current stage */}
                  {isCurrent && (
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
        <p className={cn("text-sm", photoControlsDisabled ? "text-gray-400" : "text-gray-500")}>
          {photoControlsDisabled
            ? selectedModel?.status === "complete"
              ? "Model generated successfully"
              : "Generation in progress..."
            : "Upload up to 4 photos for better 3D model quality"}
        </p>
        <p className={cn("text-xs mt-1", photoControlsDisabled ? "text-gray-400" : "text-gray-400")}>
          {photoControlsDisabled
            ? selectedModel?.status === "complete"
              ? "Photos are locked after generation"
              : "Please wait while processing"
            : "Front photo is required. Left, Right, and Back are optional."}
        </p>
      </div>
    </div>
  )
}
