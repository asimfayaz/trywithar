"use client"

import { useState } from "react"
import { ImageGallery } from "@/components/image-gallery"
import { FileUpload } from "@/components/file-upload"
import { ModelViewer } from "@/components/model-viewer"
import { AuthModal } from "@/components/auth-modal"
import { UserDashboard } from "@/components/user-dashboard"
import { ProcessingStatus } from "@/components/processing-status"

export interface ModelData {
  id: string
  thumbnail: string
  status: "processing" | "complete" | "failed"
  modelUrl?: string
  uploadedAt: Date
  processingStage?: "uploaded" | "processing" | "generating" | "ready"
}

export interface User {
  id: string
  name: string
  email: string
  avatar: string
  freeModelsUsed: number
  credits: number
}

export default function Home() {
  const [user, setUser] = useState<User | null>(null)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authReason, setAuthReason] = useState<string | null>(null)
  const [selectedModel, setSelectedModel] = useState<ModelData | null>(null)
  const [models, setModels] = useState<ModelData[]>([
    {
      id: "1",
      thumbnail: "/placeholder.svg?height=150&width=150",
      status: "complete",
      modelUrl: "/assets/3d/duck.glb",
      uploadedAt: new Date("2024-01-15"),
    },
    {
      id: "2",
      thumbnail: "/placeholder.svg?height=150&width=150",
      status: "complete",
      modelUrl: "/assets/3d/duck.glb",
      uploadedAt: new Date("2024-01-14"),
    },
    {
      id: "3",
      thumbnail: "/placeholder.svg?height=150&width=150",
      status: "processing",
      processingStage: "generating",
      uploadedAt: new Date("2024-01-16"),
    },
    {
      id: "4",
      thumbnail: "/placeholder.svg?height=150&width=150",
      status: "complete",
      modelUrl: "/assets/3d/duck.glb",
      uploadedAt: new Date("2024-01-13"),
    },
    {
      id: "5",
      thumbnail: "/placeholder.svg?height=150&width=150",
      status: "complete",
      modelUrl: "/assets/3d/duck.glb",
      uploadedAt: new Date("2024-01-12"),
    },
    {
      id: "6",
      thumbnail: "/placeholder.svg?height=150&width=150",
      status: "failed",
      uploadedAt: new Date("2024-01-11"),
    },
    {
      id: "7",
      thumbnail: "/placeholder.svg?height=150&width=150",
      status: "complete",
      modelUrl: "/assets/3d/duck.glb",
      uploadedAt: new Date("2024-01-10"),
    },
    {
      id: "8",
      thumbnail: "/placeholder.svg?height=150&width=150",
      status: "complete",
      modelUrl: "/assets/3d/duck.glb",
      uploadedAt: new Date("2024-01-09"),
    },
    {
      id: "9",
      thumbnail: "/placeholder.svg?height=150&width=150",
      status: "processing",
      processingStage: "processing",
      uploadedAt: new Date("2024-01-17"),
    },
  ])

  // Mock user login
  const handleLogin = (email: string, password: string) => {
    setUser({
      id: "1",
      name: "John Doe",
      email: email,
      avatar: "/placeholder.svg?height=40&width=40",
      freeModelsUsed: 2,
      credits: 5.0,
    })
    setShowAuthModal(false)
    setAuthReason(null)
  }

  const handleLogout = () => {
    setUser(null)
    setSelectedModel(null)
  }

  const handleUpload = (file: File) => {
    if (!user) {
      setAuthReason("Please sign in to upload photos and generate 3D models.")
      setShowAuthModal(true)
      return
    }

    // Check quota
    if (user.freeModelsUsed >= 2 && user.credits < 1) {
      alert("You have reached your free quota. Please add credits to continue.")
      return
    }

    // Create new model entry
    const newModel: ModelData = {
      id: Date.now().toString(),
      thumbnail: URL.createObjectURL(file),
      status: "processing",
      processingStage: "uploaded",
      uploadedAt: new Date(),
    }

    setModels((prev) => [newModel, ...prev])
    setSelectedModel(newModel)

    // Simulate processing stages
    simulateProcessing(newModel.id)

    // Update user quota/credits
    if (user.freeModelsUsed < 2) {
      setUser((prev) => (prev ? { ...prev, freeModelsUsed: prev.freeModelsUsed + 1 } : null))
    } else {
      setUser((prev) => (prev ? { ...prev, credits: prev.credits - 1 } : null))
    }
  }

  const simulateProcessing = (modelId: string) => {
    const stages = ["uploaded", "processing", "generating", "ready"] as const
    let currentStage = 0

    const interval = setInterval(() => {
      currentStage++
      if (currentStage < stages.length) {
        setModels((prev) =>
          prev.map((model) => (model.id === modelId ? { ...model, processingStage: stages[currentStage] } : model)),
        )
      } else {
        // Processing complete
        setModels((prev) =>
          prev.map((model) =>
            model.id === modelId
              ? {
                  ...model,
                  status: "complete",
                  modelUrl: "/assets/3d/duck.glb",
                  processingStage: undefined,
                }
              : model,
          ),
        )
        clearInterval(interval)
      }
    }, 2000)
  }

  const handleCloseAuthModal = () => {
    setShowAuthModal(false)
    setAuthReason(null)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">3D Model Generator</h1>
          <UserDashboard user={user} onLogin={() => setShowAuthModal(true)} onLogout={handleLogout} />
        </div>
      </header>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6 h-[calc(100vh-88px)]">
        {/* Left Column - Gallery (X) and Upload (Y) */}
        <div className="lg:col-span-1 flex flex-col space-y-6">
          {/* Gallery Section (X) - Takes remaining space */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 flex-1 min-h-0">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Models</h2>
            <ImageGallery models={models} onSelectModel={setSelectedModel} selectedModelId={selectedModel?.id} />
          </div>

          {/* Upload Section (Y) - Fixed square size */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 aspect-square">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Upload New Photo</h2>
            <FileUpload onUpload={handleUpload} />
          </div>
        </div>

        {/* Right Column - Model Viewer (Z) */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200 p-6 aspect-square">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">3D Model Viewer</h2>
          {selectedModel ? (
            selectedModel.status === "processing" ? (
              <ProcessingStatus
                stage={selectedModel.processingStage || "uploaded"}
                thumbnail={selectedModel.thumbnail}
              />
            ) : selectedModel.status === "complete" ? (
              <ModelViewer modelUrl={selectedModel.modelUrl!} />
            ) : (
              <div className="flex items-center justify-center h-96 text-red-500">
                <p>Model generation failed. Please try again.</p>
              </div>
            )
          ) : (
            <div className="flex flex-col items-center justify-center h-96 text-gray-500">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-medium mb-2">No Model Selected</h3>
                <p className="text-sm">Click on any image from your gallery to view its 3D model</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Auth Modal */}
      <AuthModal isOpen={showAuthModal} onClose={handleCloseAuthModal} onLogin={handleLogin} reason={authReason} />
    </div>
  )
}
