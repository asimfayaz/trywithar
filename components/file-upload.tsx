"use client"

import type React from "react"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface FileUploadProps {
  onUpload: (file: File) => void
}

export function FileUpload({ onUpload }: FileUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragOver(false)

      const files = Array.from(e.dataTransfer.files)
      const imageFile = files.find((file) => file.type.startsWith("image/"))

      if (imageFile) {
        onUpload(imageFile)
      }
    },
    [onUpload],
  )

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file && file.type.startsWith("image/")) {
        onUpload(file)
      }
    },
    [onUpload],
  )

  return (
    <div className="h-full flex flex-col">
      <div
        className={cn(
          "border-2 border-dashed rounded-lg p-3 text-center flex-1 flex flex-col items-center justify-center transition-colors overflow-hidden",
          isDragOver ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-gray-400",
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="space-y-2 flex flex-col items-center justify-center max-h-full">
          <div className="w-8 h-8 mx-auto bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
          </div>

          <div className="flex-shrink-0 text-center">
            <p className="text-sm font-medium text-gray-900 mb-1">Drop photo here</p>
            <p className="text-xs text-gray-500 mb-2">or click to browse</p>
          </div>

          <div className="space-y-1 flex-shrink-0">
            <Button asChild size="sm" className="w-full">
              <label className="cursor-pointer">
                <input type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
                Upload Photo
              </label>
            </Button>

            <p className="text-xs text-gray-400">JPG, PNG, WebP up to 10MB</p>
          </div>
        </div>
      </div>
    </div>
  )
}
