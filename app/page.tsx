"use client"

import { useState } from "react"
import { ImageGallery } from "@/components/image-gallery"
import { FileUpload } from "@/components/file-upload"
import { ModelViewer } from "@/components/model-viewer"
import { AuthModal } from "@/components/auth-modal"
import { UserDashboard } from "@/components/user-dashboard"
import { ProcessingStatus } from "@/components/processing-status"
import { PhotoPreview } from "@/components/photo-preview"
import { Button } from "@/components/ui/button"

export interface ModelData {
  id: string
  thumbnail: string
  status: "processing" | "complete" | "failed" | "uploaded"
  modelUrl?: string
  uploadedAt: Date
  processingStage?: "uploaded" | "processing" | "generating" | "ready"
  photoSet: PhotoSet
}

export interface User {
  id: string
  name: string
  email: string
  avatar: string
  freeModelsUsed: number
  credits: number
}

export interface PhotoSet {
  front?: File
  left?: File
  right?: File
  back?: File
}

export default function Home() {
  const [user, setUser] = useState<User | null>(null)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authReason, setAuthReason] = useState<string | null>(null)
  const [selectedModel, setSelectedModel] = useState<ModelData | null>(null)
  const [currentPhotoSet, setCurrentPhotoSet] = useState<PhotoSet>({})
  const [isGenerating, setIsGenerating] = useState(false)
  const [models, setModels] = useState<ModelData[]>([
    {
      id: "1",
      thumbnail: "/placeholder.svg?height=150&width=150",
      status: "complete",
      modelUrl: "/assets/3d/duck.glb",
      uploadedAt: new Date("2024-01-15"),
      photoSet: { front: new File([], "front1.jpg") },
    },
    {
      id: "2",
      thumbnail: "/placeholder.svg?height=150&width=150",
      status: "complete",
      modelUrl: "/assets/3d/duck.glb",
      uploadedAt: new Date("2024-01-14"),
      photoSet: { front: new File([], "front2.jpg") },
    },
    {
      id: "3",
      thumbnail: "/placeholder.svg?height=150&width=150",
      status: "processing",
      processingStage: "generating",
      uploadedAt: new Date("2024-01-16"),
      photoSet: { front: new File([], "front3.jpg") },
    },
    {
      id: "4",
      thumbnail: "/placeholder.svg?height=150&width=150",
      status: "complete",
      modelUrl: "/assets/3d/duck.glb",
      uploadedAt: new Date("2024-01-13"),
      photoSet: { front: new File([], "front4.jpg") },
    },
    {
      id: "5",
      thumbnail: "/placeholder.svg?height=150&width=150",
      status: "complete",
      modelUrl: "/assets/3d/duck.glb",
      uploadedAt: new Date("2024-01-12"),
      photoSet: { front: new File([], "front5.jpg") },
    },
    {
      id: "6",
      thumbnail: "/placeholder.svg?height=150&width=150",
      status: "failed",
      uploadedAt: new Date("2024-01-11"),
      photoSet: { front: new File([], "front6.jpg") },
    },
    {
      id: "7",
      thumbnail: "/placeholder.svg?height=150&width=150",
      status: "complete",
      modelUrl: "/assets/3d/duck.glb",
      uploadedAt: new Date("2024-01-10"),
      photoSet: { front: new File([], "front7.jpg") },
    },
    {
      id: "8",
      thumbnail: "/placeholder.svg?height=150&width=150",
      status: "complete",
      modelUrl: "/assets/3d/duck.glb",
      uploadedAt: new Date("2024-01-09"),
      photoSet: { front: new File([], "front8.jpg") },
    },
    {
      id: "9",
      thumbnail: "/placeholder.svg?height=150&width=150",
      status: "processing",
      processingStage: "processing",
      uploadedAt: new Date("2024-01-17"),
      photoSet: { front: new File([], "front9.jpg") },
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
    setCurrentPhotoSet({})
    setIsGenerating(false)
  }

  const handleUpload = (file: File, position: keyof PhotoSet = "front") => {
    if (!user) {
      setAuthReason("Please sign in to upload photos and generate 3D models.")
      setShowAuthModal(true)
      return
    }

    if (position === "front") {
      // Create new model entry when front image is uploaded
      const newModel: ModelData = {
        id: Date.now().toString(),
        thumbnail: URL.createObjectURL(file),
        status: "uploaded",
        uploadedAt: new Date(),
        photoSet: { front: file },
      }

      setModels((prev) => [newModel, ...prev])
      setSelectedModel(newModel)
      setCurrentPhotoSet({ front: file })
    } else {
      // Update existing photo set for additional photos
      setCurrentPhotoSet((prev) => ({
        ...prev,
        [position]: file,
      }))

      // Update the selected model's photo set
      if (selectedModel) {
        const updatedPhotoSet = { ...selectedModel.photoSet, [position]: file }
        setModels((prev) =>
          prev.map((model) => (model.id === selectedModel.id ? { ...model, photoSet: updatedPhotoSet } : model)),
        )
        setSelectedModel({ ...selectedModel, photoSet: updatedPhotoSet })
      }
    }
  }

  const handleRemovePhoto = (position: keyof PhotoSet) => {
    if (position === "front") {
      alert("Front image is required and cannot be removed.")
      return
    }

    setCurrentPhotoSet((prev) => {
      const newSet = { ...prev }
      delete newSet[position]
      return newSet
    })

    // Update the selected model's photo set
    if (selectedModel) {
      const updatedPhotoSet = { ...selectedModel.photoSet }
      delete updatedPhotoSet[position]
      setModels((prev) =>
        prev.map((model) => (model.id === selectedModel.id ? { ...model, photoSet: updatedPhotoSet } : model)),
      )
      setSelectedModel({ ...selectedModel, photoSet: updatedPhotoSet })
    }
  }

  const handleSelectModel = (model: ModelData) => {
    setSelectedModel(model)
    setCurrentPhotoSet(model.photoSet)
  }

  const handleGenerateModel = () => {
    if (!user) {
      setAuthReason("Please sign in to generate 3D models.")
      setShowAuthModal(true)
      return
    }

    if (!currentPhotoSet.front || !selectedModel) {
      alert("Please select a model with a front image to generate a 3D model.")
      return
    }

    // Check quota
    if (user.freeModelsUsed >= 2 && user.credits < 1) {
      alert("You have reached your free quota. Please add credits to continue.")
      return
    }

    setIsGenerating(true)

    // Update model status to processing
    setModels((prev) =>
      prev.map((model) =>
        model.id === selectedModel.id ? { ...model, status: "processing", processingStage: "uploaded" } : model,
      ),
    )

    // Simulate processing stages
    simulateProcessing(selectedModel.id)

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
        setIsGenerating(false)
        clearInterval(interval)
      }
    }, 2000)
  }

  const handleCloseAuthModal = () => {
    setShowAuthModal(false)
    setAuthReason(null)
  }

  const hasPhotos = Object.keys(currentPhotoSet).length > 0
  const canGenerate = currentPhotoSet.front && !isGenerating && selectedModel?.status !== "processing"

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
        <div className="lg:col-span-1 flex flex-col space-y-6 h-[calc(100vh-88px)]">
          {/* Gallery Section (X) - Takes remaining space */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 flex-1 min-h-0 overflow-hidden">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Uploads</h2>
            <ImageGallery models={models} onSelectModel={handleSelectModel} selectedModelId={selectedModel?.id} />
          </div>

          {/* Upload Section (Y) - Fixed square size */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 aspect-square">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Upload Photos</h2>
            <FileUpload onUpload={(file) => handleUpload(file, "front")} disabled={false} />
          </div>
        </div>

        {/* Right Column - Model Viewer (Z) */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200 p-6 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">3D Model Viewer</h2>
          </div>

          <div className="flex-1 min-h-0 flex flex-col">
            {selectedModel ? (
              selectedModel.status === "processing" ? (
                <ProcessingStatus
                  stage={selectedModel.processingStage || "uploaded"}
                  thumbnail={selectedModel.thumbnail}
                />
              ) : selectedModel.status === "complete" ? (
                <div className="flex-1 min-h-0">
                  <ModelViewer modelUrl={selectedModel.modelUrl!} />
                </div>
              ) : selectedModel.status === "failed" ? (
                <div className="flex items-center justify-center flex-1 text-red-500">
                  <p>Model generation failed. Please try again.</p>
                </div>
              ) : (
                // Show photo preview for uploaded but not processed models
                <div className="flex-1 min-h-0 flex flex-col">
                  <div className="flex-1 min-h-0">
                    <PhotoPreview
                      photoSet={currentPhotoSet}
                      onUpload={handleUpload}
                      onRemove={handleRemovePhoto}
                      disabled={false}
                    />
                  </div>

                  {/* Generate Button - positioned below the photo grid */}
                  {hasPhotos && selectedModel && (
                    <div className="pt-2">
                      <Button
                        onClick={handleGenerateModel}
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
                </div>
              )
            ) : (
              <div className="flex flex-col items-center justify-center flex-1 text-gray-500">
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium mb-2">No Photos Selected</h3>
                  <p className="text-sm">Upload or select photos to get started with 3D model generation</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Auth Modal */}
      <AuthModal isOpen={showAuthModal} onClose={handleCloseAuthModal} onLogin={handleLogin} reason={authReason} />
    </div>
  )
}
