"use client"

import type React from "react"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface FileUploadProps {
  onUpload: (file: File) => void
  disabled?: boolean
}

export function FileUpload({ onUpload, disabled = false }: FileUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false)

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      if (disabled) return
      e.preventDefault()
      setIsDragOver(true)
    },
    [disabled],
  )

  const handleDragLeave = useCallback(
    (e: React.DragEvent) => {
      if (disabled) return
      e.preventDefault()
      setIsDragOver(false)
    },
    [disabled],
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      if (disabled) return
      e.preventDefault()
      setIsDragOver(false)

      const files = Array.from(e.dataTransfer.files)
      const imageFile = files.find((file) => file.type.startsWith("image/"))

      if (imageFile) {
        onUpload(imageFile)
      }
    },
    [onUpload, disabled],
  )

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (disabled) return
      const file = e.target.files?.[0]
      if (file && file.type.startsWith("image/")) {
        onUpload(file)
      }
    },
    [onUpload, disabled],
  )

  return (
    <div className="h-full flex flex-col">
      <div
        className={cn(
          "border-2 border-dashed rounded-lg p-3 text-center flex-1 flex flex-col items-center justify-center transition-colors overflow-hidden",
          disabled
            ? "border-gray-200 bg-gray-50 cursor-not-allowed"
            : isDragOver
              ? "border-blue-500 bg-blue-50"
              : "border-gray-300 hover:border-gray-400",
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="space-y-2 flex flex-col items-center justify-center max-h-full">
          <div
            className={cn(
              "w-8 h-8 mx-auto rounded-full flex items-center justify-center flex-shrink-0",
              disabled ? "bg-gray-200" : "bg-gray-100",
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

          <div className="hidden sm:inline flex-shrink-0 text-center">
            <p className={cn("text-sm font-medium mb-1", disabled ? "text-gray-400" : "text-gray-900")}>
              {disabled ? "Photos uploaded" : "Drop front photo here"}
            </p>
            <p className={cn("text-xs mb-2", disabled ? "text-gray-400" : "text-gray-500")}>
              {disabled ? "Use the preview to manage photos" : "or click to browse"}
            </p>
          </div>

          {!disabled && (
            <div className="space-y-1 flex-shrink-0">
              <Button asChild size="sm" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium">
                <label className="cursor-pointer">
                  <input type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
                  Upload Front Photo
                </label>
              </Button>

              <p className="text-xs text-gray-400">JPG, PNG up to 10MB</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
