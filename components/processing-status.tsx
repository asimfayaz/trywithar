"use client"

import { cn } from "@/lib/utils"

interface ProcessingStatusProps {
  stage: "uploaded" | "processing" | "generating" | "ready"
  thumbnail: string
}

const stages = [
  { key: "uploaded", label: "Photo uploaded", icon: "📤" },
  { key: "processing", label: "Processing image", icon: "🔄" },
  { key: "generating", label: "Generating 3D model", icon: "🎯" },
  { key: "ready", label: "Model ready", icon: "✅" },
]

export function ProcessingStatus({ stage, thumbnail }: ProcessingStatusProps) {
  const currentStageIndex = stages.findIndex((s) => s.key === stage)

  return (
    <div className="flex flex-col items-center justify-center h-96 space-y-6">
      {/* Thumbnail */}
      <div className="w-32 h-32 rounded-lg overflow-hidden shadow-lg">
        <img src={thumbnail || "/placeholder.svg"} alt="Processing" className="w-full h-full object-cover" />
      </div>

      {/* Progress Steps */}
      <div className="space-y-4 w-full max-w-md">
        {stages.map((stageItem, index) => {
          const isCompleted = index < currentStageIndex
          const isCurrent = index === currentStageIndex
          const isPending = index > currentStageIndex

          return (
            <div key={stageItem.key} className="flex items-center space-x-3">
              {/* Icon */}
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm",
                  isCompleted && "bg-green-500 text-white",
                  isCurrent && "bg-blue-500 text-white animate-pulse",
                  isPending && "bg-gray-200 text-gray-500",
                )}
              >
                {isCompleted ? (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                ) : isCurrent ? (
                  <div className="w-3 h-3 bg-white rounded-full animate-spin" />
                ) : (
                  <div className="w-3 h-3 bg-gray-400 rounded-full" />
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
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" />
                    <div
                      className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
                      style={{ animationDelay: "0.1s" }}
                    />
                    <div
                      className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
                      style={{ animationDelay: "0.2s" }}
                    />
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <p className="text-sm text-gray-600 text-center">
        This usually takes 2-3 minutes. You can continue using the app while we process your model.
      </p>
    </div>
  )
}
