"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { PhotoSet } from "@/app/page"

interface PhotoPreviewProps {
  photoSet: PhotoSet
  onUpload: (file: File, position: keyof PhotoSet) => void
  onRemove: (position: keyof PhotoSet) => void
  disabled?: boolean
}

const positions = [
  { key: "front" as keyof PhotoSet, label: "Front", required: true },
  { key: "left" as keyof PhotoSet, label: "Left", required: false },
  { key: "right" as keyof PhotoSet, label: "Right", required: false },
  { key: "back" as keyof PhotoSet, label: "Back", required: false },
]

export function PhotoPreview({ photoSet, onUpload, onRemove, disabled = false }: PhotoPreviewProps) {
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

  return (
    <div className="h-full flex flex-col">
      {/* Photo Grid - 1x4 horizontal layout with square aspect ratio */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {positions.map(({ key, label, required }) => {
          const photo = photoSet[key]
          const isDragOver = dragOver === key

          return (
            <div key={key} className="flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <span className={cn("text-sm font-medium", disabled ? "text-gray-400" : "text-gray-700")}>
                  {label} {required && <span className="text-red-500">*</span>}
                </span>
                {photo && !disabled && key !== "front" && (
                  <button
                    onClick={() => onRemove(key)}
                    className="text-xs text-red-500 hover:text-red-700"
                    disabled={disabled}
                  >
                    Remove
                  </button>
                )}
              </div>

              <div
                className={cn(
                  "relative border-2 border-dashed rounded-lg aspect-square transition-colors cursor-pointer group",
                  disabled
                    ? "border-gray-200 bg-gray-50 cursor-not-allowed"
                    : isDragOver
                      ? "border-blue-500 bg-blue-50"
                      : photo
                        ? "border-green-300 bg-green-50 hover:border-green-400"
                        : "border-gray-300 hover:border-gray-400 bg-gray-50 hover:bg-gray-100",
                )}
                onDragOver={handleDragOver(key)}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop(key)}
                onClick={() => !disabled && document.getElementById(`file-input-${key}`)?.click()}
              >
                <input
                  id={`file-input-${key}`}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect(key)}
                  className="hidden"
                  disabled={disabled}
                />

                {photo ? (
                  <div className="relative aspect-square w-full h-full">
                    <img
                      src={URL.createObjectURL(photo) || "/placeholder.svg"}
                      alt={`${label} view`}
                      className="w-full h-full object-cover rounded-lg"
                    />
                    {!disabled && (
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
                        disabled ? "bg-gray-200" : "bg-gray-200",
                      )}
                    >
                      <svg
                        className={cn("w-4 h-4", disabled ? "text-gray-400" : "text-gray-500")}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </div>
                    <span className={cn("text-xs font-medium", disabled ? "text-gray-400" : "text-gray-600")}>
                      {isDragOver ? `Drop ${label.toLowerCase()} photo` : `Add ${label}`}
                    </span>
                    <span className={cn("text-xs mt-1", disabled ? "text-gray-400" : "text-gray-400")}>
                      Click or drag
                    </span>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Instructions */}
      <div className="text-center">
        <p className={cn("text-sm", disabled ? "text-gray-400" : "text-gray-500")}>
          {disabled ? "Generation in progress..." : "Upload up to 4 photos for better 3D model quality"}
        </p>
        <p className={cn("text-xs mt-1", disabled ? "text-gray-400" : "text-gray-400")}>
          Front photo is required. Left, Right, and Back are optional.
        </p>
      </div>
    </div>
  )
}
