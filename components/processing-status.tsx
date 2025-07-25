"use client"

import { cn } from "@/lib/utils"

interface ProcessingStatusProps {
  stage: "uploaded" | "processing" | "generating" | "ready"
  thumbnail: string
}

const stages = [
  { key: "uploaded", label: "Photo uploaded", icon: "📷" },
  { key: "processing", label: "Processing image", icon: "🔄" },
  { key: "generating", label: "Generating 3D model", icon: "🎯" },
  { key: "ready", label: "Model ready", icon: "✅" },
] as const

export function ProcessingStatus({ stage, thumbnail }: ProcessingStatusProps) {
  const currentStageIndex = stages.findIndex((s) => s.key === stage)

  return (
    <div className="space-y-6">
      {/* Thumbnail */}
      <div className="flex justify-center">
        <div className="w-32 h-32 rounded-lg overflow-hidden border border-gray-200">
          <img src={thumbnail || "/placeholder.svg"} alt="Processing" className="w-full h-full object-cover" />
        </div>
      </div>

      {/* Progress Steps */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-center text-gray-900">Generating your 3D model...</h3>

        <div className="space-y-3">
          {stages.map((stageItem, index) => {
            const isCompleted = index <= currentStageIndex
            const isCurrent = index === currentStageIndex

            return (
              <div
                key={stageItem.key}
                className={cn(
                  "flex items-center space-x-3 p-3 rounded-lg transition-all duration-300",
                  isCompleted ? "bg-green-50 border border-green-200" : "bg-gray-50 border border-gray-200",
                )}
              >
                <div
                  className={cn(
                    "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-300",
                    isCompleted ? "bg-green-500 text-white" : "bg-gray-300 text-gray-600",
                  )}
                >
                  {isCompleted ? "✓" : index + 1}
                </div>

                <div className="flex-1">
                  <p
                    className={cn(
                      "font-medium transition-all duration-300",
                      isCompleted ? "text-green-800" : "text-gray-600",
                    )}
                  >
                    {stageItem.label}
                  </p>
                </div>

                {isCurrent && (
                  <div className="flex-shrink-0">
                    <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-500 h-2 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${((currentStageIndex + 1) / stages.length) * 100}%` }}
          />
        </div>

        <p className="text-center text-sm text-gray-500">This usually takes 2-3 minutes</p>
      </div>
    </div>
  )
}
