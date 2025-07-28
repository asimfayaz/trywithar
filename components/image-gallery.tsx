"use client"

import { cn } from "@/lib/utils"
import type { ModelData } from "@/app/page"

interface ImageGalleryProps {
  models: ModelData[]
  onSelectModel: (model: ModelData) => void
  selectedModelId?: string
}

export function ImageGallery({ models, onSelectModel, selectedModelId }: ImageGalleryProps) {
  if (models.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500">
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
        <p className="text-sm text-center">No photos yet. Upload photos to get started!</p>
      </div>
    )
  }

  return (
    <div className="overflow-y-auto -mr-2 pr-2 h-full max-h-full">
      <div className="grid grid-cols-2 gap-3">
        {models.map((model) => (
          <div
            key={model.id}
            className={cn(
              "relative aspect-square rounded-lg overflow-hidden cursor-pointer transition-all border-2 group",
              selectedModelId === model.id
                ? "border-blue-500 ring-2 ring-blue-200"
                : "border-transparent hover:border-gray-300",
            )}
            onClick={() => onSelectModel(model)}
            title={`Last updated: ${model.updatedAt.toLocaleString()}`}
          >
            <img
              src={model.thumbnail || "/placeholder.svg"}
              alt="Photo thumbnail"
              className="w-full h-full object-cover"
            />

            {/* Status Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

            {/* Status Badge */}
            <div className="absolute top-2 right-2">
              {model.status === "uploaded" && (
                <div className="bg-gray-500 text-white text-xs px-2 py-1 rounded-full flex items-center">
                  <div className="w-2 h-2 bg-white rounded-full mr-1" />
                  Uploaded
                </div>
              )}
              {model.status === "processing" && (
                <div className="bg-yellow-500 text-white text-xs px-2 py-1 rounded-full flex items-center">
                  <div className="w-2 h-2 bg-white rounded-full mr-1 animate-pulse" />
                  Processing
                </div>
              )}
              {model.status === "complete" && (
                <div className="bg-green-500 text-white text-xs px-2 py-1 rounded-full flex items-center">
                  <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Ready
                </div>
              )}
              {model.status === "failed" && (
                <div className="bg-red-500 text-white text-xs px-2 py-1 rounded-full flex items-center">
                  <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Failed
                </div>
              )}
            </div>

            {/* Date */}
            <div className="absolute bottom-2 left-2 text-white text-xs">{model.uploadedAt.toLocaleDateString()}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
