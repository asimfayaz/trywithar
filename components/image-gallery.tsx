"use client"

import type { ModelData } from "@/app/page"
import { cn } from "@/lib/utils"

interface ImageGalleryProps {
  models: ModelData[]
  onSelectModel: (model: ModelData) => void
  selectedModelId?: string
}

export function ImageGallery({ models, onSelectModel, selectedModelId }: ImageGalleryProps) {
  if (models.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-3 bg-gray-100 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
          <h3 className="text-base font-medium mb-1">No Models Yet</h3>
          <p className="text-sm">Upload your first photo to get started</p>
        </div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-3 h-full overflow-y-auto pr-2 -mr-2">
      {models.map((model) => (
        <div
          key={model.id}
          className={cn(
            "relative group cursor-pointer rounded-lg overflow-hidden border-2 transition-all duration-200 hover:shadow-lg aspect-square",
            selectedModelId === model.id ? "border-blue-500 shadow-lg" : "border-gray-200 hover:border-gray-300",
          )}
          onClick={() => onSelectModel(model)}
        >
          <div className="w-full h-full">
            <img
              src={model.thumbnail || "/placeholder.svg"}
              alt="Model thumbnail"
              className="w-full h-full object-cover"
            />
          </div>

          {/* Status Indicator */}
          <div className="absolute top-2 right-2">
            {model.status === "processing" && (
              <div className="w-3 h-3 bg-yellow-500 rounded-full animate-pulse" title="Processing" />
            )}
            {model.status === "complete" && <div className="w-3 h-3 bg-green-500 rounded-full" title="Complete" />}
            {model.status === "failed" && <div className="w-3 h-3 bg-red-500 rounded-full" title="Failed" />}
          </div>

          {/* Overlay */}
          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200" />

          {/* Date */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
            <p className="text-white text-xs truncate">{model.uploadedAt.toLocaleDateString()}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
