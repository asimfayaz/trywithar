"use client"

import type React from "react"
import type { PhotoSet } from "@/app/page"
import { ModelViewer } from "@/components/model-viewer"

// ============================================================================
// Type Definitions
// ============================================================================

interface ModelPreviewProps {
  modelUrl: string
  photoSet: PhotoSet
  onNavigateBack?: () => void
  isFullView?: boolean
}

// ============================================================================
// Constants
// ============================================================================

// Define the positions for photo display in the grid
// Each position corresponds to a different angle/view of the object
const PHOTO_POSITIONS = [
  { key: "front" as keyof PhotoSet, label: "Front", required: true },
  { key: "left" as keyof PhotoSet, label: "Left", required: false },
  { key: "right" as keyof PhotoSet, label: "Right", required: false },
  { key: "back" as keyof PhotoSet, label: "Back", required: false },
]

// ============================================================================
// Component
// ============================================================================

/**
 * ModelPreview Component
 * 
 * Displays a 3D model viewer along with a grid of source photos used to generate the model.
 * Shows the model in an interactive viewer at the top, with reference photos below in a 
 * horizontal grid layout.
 * 
 * @param modelUrl - URL to the 3D model file to display
 * @param photoSet - Object containing photos from different angles (front, left, right, back)
 */
export function ModelPreview({
  modelUrl,
  photoSet,
}: ModelPreviewProps) {
  return (
    <div className="h-full flex flex-col">
      {/* 3D Model Viewer Section */}
      {/* Takes up remaining vertical space with flex-1, mb-6 adds bottom margin */}
      <div className="flex-1 mb-6 min-h-0">
        <ModelViewer modelUrl={modelUrl} />
      </div>

      {/* Photo Reference Grid */}
      <div className="grid grid-cols-4 gap-4 mb-4">
        {PHOTO_POSITIONS.map(({ key, label, required }) => {
          // Get the photo for this position from the photoSet
          const photo = photoSet[key]

          return (
            <div key={key} className="flex flex-col">
              {/* Position Label */}
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-400">
                  {label}
                  {/* Show asterisk for required photos */}
                  {required && <span className="text-red-300">*</span>}
                </span>
              </div>

              {/* Photo Container - Square aspect ratio */}
              <div className="relative border-2 border-dashed rounded-lg aspect-square border-gray-200 bg-gray-50">
                {photo ? (
                  // Display the photo if it exists
                  // Use persistentUrl if available, fallback to dataUrl
                  <div className="relative aspect-square w-full h-full">
                    <img
                      src={photo.persistentUrl || photo.dataUrl}
                      alt={`${label} view`}
                      className="w-full h-full object-cover rounded-lg"
                    />
                  </div>
                ) : (
                  // Show placeholder if no photo exists for this position
                  <div className="flex flex-col items-center justify-center h-full p-2">
                    {/* Lock icon to indicate completed model */}
                    <div className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-200">
                      <svg
                        className="w-4 h-4 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                        />
                      </svg>
                    </div>
                    {/* Only show text on larger screens (hidden on small screens) */}
                    <span className="hidden sm:inline text-center mt-2 text-xs font-medium text-gray-400">
                      Model completed
                    </span>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Instructions Footer */}
      <div className="text-center">
        <p className="text-xs mt-1 text-gray-400">
          Photo(s) you provided to generate this model
        </p>
      </div>
    </div>
  )
}
