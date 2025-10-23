"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useToast } from '@/components/ui/use-toast';

// Component imports
import { ModelGallery } from "@/components/model-gallery"
import { FileUpload } from "@/components/file-upload"
import { ModelGenerator } from "@/components/model-generator"
import { ModelPreview } from "@/components/model-preview"
import { MobileNavigationHeader } from "@/components/mobile-navigation-header"
import { Button } from "@/components/ui/button";
import { AuthModal } from "@/components/auth-modal"

// Hook imports
import { useNavigation } from "@/contexts/NavigationContext"
import { useIsMobile } from "@/components/ui/use-mobile"
import { useAuth } from "@/contexts/AuthContext"
import { useModelGeneration } from "@/hooks/useModelGeneration"

// Service imports
import { StorageService } from "@/lib/storage.service"
import { ModelService } from "@/lib/supabase/model.service"
import { supabase } from "@/lib/supabase"
import type { ModelStatus } from "@/lib/supabase/types"
import type { UploadItem, PhotoSet, ModelData } from "@/app/page"

// ============================================================================
// Constants
// ============================================================================

const ADMIN_USER_ID = "541a43f1-6c11-43a0-8ddb-91563e22c5f7"
const STATUS_MAP: Record<string, {status: string, processingStage?: ModelStatus}> = {
  'draft': { status: 'draft' },
  'uploading_photos': { status: 'processing', processingStage: 'uploading_photos' },
  'removed_background': { status: 'processing', processingStage: 'removed_background' },
  'generating_3d_model': { status: 'processing', processingStage: 'generating_3d_model' },
  'completed': { status: 'completed', processingStage: 'completed' },
  'failed': { status: 'failed', processingStage: 'failed' }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Converts a raw database model to the application's ModelData format
 */
function convertToModelData(model: any): ModelData {
  const mapping = STATUS_MAP[model.model_status] || { status: 'failed' }
  
  // Build photo set from available image URLs
  const photoSet: PhotoSet = {}
  if (model.front_image_url) {
    photoSet.front = {
      file: new File([], 'front.jpg'),
      dataUrl: model.front_image_url
    }
  }
  if (model.left_image_url) {
    photoSet.left = {
      file: new File([], 'left.jpg'),
      dataUrl: model.left_image_url
    }
  }
  if (model.right_image_url) {
    photoSet.right = {
      file: new File([], 'right.jpg'),
      dataUrl: model.right_image_url
    }
  }
  if (model.back_image_url) {
    photoSet.back = {
      file: new File([], 'back.jpg'),
      dataUrl: model.back_image_url
    }
  }
  
  return {
    id: model.id,
    thumbnail: model.front_image_url || model.front_nobgr_image_url || '/placeholder.svg?height=150&width=150',
    status: mapping.status as any,
    modelUrl: model.model_url || undefined,
    uploadedAt: new Date(model.created_at),
    updatedAt: new Date(model.updated_at),
    jobId: model.job_id || undefined,
    processingStage: mapping.processingStage,
    photoSet,
    error: undefined
  }
}

/**
 * Reads a file and converts it to a data URL
 */
function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.readAsDataURL(file)
  })
}

/**
 * Gets the current Supabase access token
 */
async function getAccessToken(): Promise<string | null> {
  try {
    const { data: { session }, error } = await supabase.auth.getSession()
    if (error) {
      console.error('Error getting session:', error)
      return null
    }
    return session?.access_token || null
  } catch (error) {
    console.error('Error getting access token:', error)
    return null
  }
}

// ============================================================================
// Main Component
// ============================================================================


export function MobileHomeContent() {
  // ========================================
  // Hooks
  // ========================================
  
  const navigationRouter = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { currentView, navigateToGallery, navigateToUpload, navigateToGenerator, navigateToPreview } = useNavigation();
  const isMobile = useIsMobile();

  // Auth context
  const { 
    user, 
    showAuthModal, 
    authReason, 
    showForgotPassword,
    login, 
    logout, 
    openAuthModal, 
    closeAuthModal,
    setShowForgotPassword
  } = useAuth();

  // Model generation hook
  const { 
    uploadRawPhotos,
    removeBackground,
    generate3DModel,
    retryModelGeneration, 
    pollJobStatus, 
    createModelDraft,
    isGenerating: isGeneratingHook,
    isInitialized,
    getModelsByUserId
  } = useModelGeneration();

  // ========================================
  // State
  // ========================================
  
  // Model state
  const [selectedModel, setSelectedModel] = useState<ModelData | null>(null)
  const [currentPhotoSet, setCurrentPhotoSet] = useState<PhotoSet>({})
  const [models, setModels] = useState<ModelData[]>([])
  const [adminModels, setAdminModels] = useState<ModelData[]>([])

  // UI state
  const [isGenerating, setIsGenerating] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isAdminModelsLoading, setIsAdminModelsLoading] = useState(true)
  const [isProcessingUpload, setIsProcessingUpload] = useState(false)
  const [isRetrying, setIsRetrying] = useState(false);
  const [error, setError] = useState<string | null>(null)

  // Refs
  const navigationInProgress = useRef(false)
  
  // ========================================
  // Data Loading Functions
  // ========================================
  
  /**
   * Loads the current user's models from the database
   */
  const loadUserPhotos = async () => {
    if (!user || !isInitialized) {
      setIsLoading(false);
      return;
    }
    
    try {
      setIsLoading(true);
      setError(null);

      // Fetch models from database
      const modelsData = await getModelsByUserId(user.id);

      // Sort by updated_at timestamp (newest first)
      modelsData.sort((a: any, b: any) => 
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );
      
      // Convert to ModelData format
      const modelData: ModelData[] = modelsData.map(convertToModelData)
      
      setModels(modelData)
    } catch (error) {
      console.error('Failed to load user photos:', error)
      setError(error instanceof Error ? error.message : 'Failed to load models')
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Fetches sample models from admin account for logged-out users
   */
  const fetchAdminModels = async () => {
    if (user) return // Only fetch if user is logged out
    
    try {
      setIsAdminModelsLoading(true)
      const modelService = new ModelService()
      const adminModelsData = await modelService.getModelsByUserId(ADMIN_USER_ID)
      
      // Convert to ModelData format
      const modelData: ModelData[] = adminModelsData.map(convertToModelData)
      
      setAdminModels(modelData)
    } catch (error) {
      console.error('Failed to load admin models:', error)
    } finally {
      setIsAdminModelsLoading(false)
    }
  }

  // ========================================
  // Event Handlers
  // ========================================
  
  /**
   * Handles model selection from gallery
   */
  const handleSelectModel = async (model: ModelData) => {
    // Clean up any temporary models
    if (selectedModel?.isTemporary) {
      const storage = new StorageService();
      try {
        await storage.deleteDraft(selectedModel.id);
      } catch (error) {
        console.error('Failed to clean up temporary model:', error);
      }
    }
    
    setSelectedModel(model)
    setCurrentPhotoSet(model.photoSet)
    
    // Navigate to appropriate view based on model status
    if (model.status === "completed" && model.modelUrl) {
      navigateToPreview(model.id);
    } else {
      navigateToGenerator(model.id);
    }
  }

  /**
   * Handles file upload for a specific photo position
   */
  const handleUpload = async (file: File, position: keyof PhotoSet = "front") => {
    if (!user) {
      openAuthModal("You need to sign in to upload photos");
      return;
    }

    try {
      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
      
      const uploadItem: UploadItem = {
        file,
        dataUrl
      };

      if (position === "front") {
        const tempId = `temp-${Date.now()}`;
        const previewModel: ModelData = {
          id: tempId,
          thumbnail: dataUrl,
          status: "draft",
          uploadedAt: new Date(),
          updatedAt: new Date(),
          photoSet: { front: uploadItem },
          processingStage: 'uploading_photos',
          isTemporary: true,
          error: undefined
        };

        setIsProcessingUpload(true);
        setSelectedModel(previewModel);
        setCurrentPhotoSet({ front: uploadItem });
        
        // Navigate to generator view
        navigateToGenerator(previewModel.id);
        setIsProcessingUpload(false);
        
        // Show success notification
        toast({
          title: "Photo uploaded",
          description: "Your photo has been uploaded successfully. You can now generate your 3D model.",
          variant: "default",
        });
      } else if (selectedModel) {
        // Additional photos (left, right, back) add to existing model
        const newDataUrl = await readFileAsDataUrl(file);
        
        const newUploadItem: UploadItem = {
          file,
          dataUrl: newDataUrl
        };
        
        // Update photo set and selected model
        setCurrentPhotoSet(prev => ({ ...prev, [position]: newUploadItem }));
        setSelectedModel(prev => prev ? 
          { 
            ...prev, 
            photoSet: { ...prev.photoSet, [position]: newUploadItem }
          } 
          : null
        );
      }
    } catch (error) {
      console.error(`❌ Error storing ${position} photo draft:`, error);
      alert(`Failed to store ${position} photo. Please try again.`);
    }
  }

  /**
   * Handles the model generation process
   */
  const handleGenerate = async () => {
    if (!selectedModel || !user) return
    
    try {
      setIsGenerating(true)
      
      let modelId: string
      let isRetry = false
      
      // Check if this is a retry for a failed model
      if (selectedModel.status === "failed" && selectedModel.id) {
        isRetry = true
        modelId = selectedModel.id
      } else {
        // Create new draft model record
        modelId = await createModelDraft(user.id)
        
        // Update selected model with new ID
        setSelectedModel(prev => prev ? {
          ...prev,
          id: modelId,
          status: "draft",
          processingStage: 'draft'
        } : null)
      }
      
      if (isRetry) {
        // ========================================
        // Retry Logic
        // ========================================
        console.log("Starting retry for model:", modelId)
        const retryResult = await retryModelGeneration(
          modelId, 
          user.id, 
          await getAccessToken() || undefined
        )
        
        // Update model with job ID
        setSelectedModel(prev => prev ? {
          ...prev,
          jobId: retryResult.jobId,
          status: "processing",
          processingStage: 'generating_3d_model',
          error: undefined
        } : null)
        
        console.log("Started retry job with ID:", retryResult.jobId)
        
        // Poll for completion
        if (retryResult.jobId) {
          await pollForJobCompletion(retryResult.jobId)
        }
      } else {
        // ========================================
        // New Generation Logic
        // ========================================
        console.log("Starting new generation for model:", modelId)
        
        // Step 1: Upload raw photos
        const urlMap = await uploadRawPhotos(modelId, currentPhotoSet)
        
        // Step 2: Remove background
        const processedUrl = await removeBackground(modelId, urlMap.front)
        
        // Step 3: Generate 3D model
        const result = await generate3DModel(
          modelId, 
          processedUrl, 
          currentPhotoSet, 
          await getAccessToken() || undefined
        )
        
        // Navigate to generator view
        //navigateToGenerator(modelId)
        
        // Clean up temporary models
        if (selectedModel.isTemporary) {
          const storage = new StorageService()
          await storage.deleteDraft(selectedModel.id)
        }
        
        // Update model with job ID
        setSelectedModel(prev => prev ? {
          ...prev,
          id: modelId,
          jobId: result.jobId,
          status: "processing",
          processingStage: 'generating_3d_model',
          error: undefined
        } : null)
        
        console.log("Started job with ID:", result.jobId)
        
        // Poll for completion
        if (result.jobId) {
          await pollForJobCompletion(result.jobId)
        }
      }
      
    } catch (error) {
      console.error("Generation error:", error)
      alert(error instanceof Error ? error.message : "Failed to generate model")
    } finally {
      setIsGenerating(false)
    }
  }

  /**
   * Polls for job completion and updates model state
   */
  const pollForJobCompletion = async (jobId: string) => {
    setTimeout(async () => {
      try {
        const jobResult = await pollJobStatus(jobId)
        
        if (jobResult.status === 'completed' && jobResult.modelUrl) {
          // Success - update to completed state
          setSelectedModel(prev => prev ? {
            ...prev,
            status: "completed",
            modelUrl: jobResult.modelUrl,
            processingStage: 'completed'
          } : null)
          
          // Refresh models list
          loadUserPhotos()
        } else if (jobResult.status === 'failed') {
          // Failure - update to failed state
          setSelectedModel(prev => prev ? {
            ...prev,
            status: "failed",
            processingStage: 'failed',
            error: jobResult.errorMessage || 'Model generation failed'
          } : null)
        }
      } catch (pollError) {
        console.error("Job polling failed:", pollError)
        
        // Update to failed state
        setSelectedModel(prev => prev ? {
          ...prev,
          status: "failed",
          processingStage: 'failed',
          error: 'Model generation failed'
        } : null)
        
        // Show error notification
        toast({
          title: "Generation Failed",
          description: "There was an issue generating your 3D model. Please try again.",
          variant: "destructive",
        })
      }
    }, 1000)
  }

  /**
   * Handles user logout
   */
  const handleLogout = async () => {
    try {
      await logout()
    } catch (error) {
      console.error('Logout error:', error)
    }
    
    // Reset all state
    setModels([])
    setSelectedModel(null)
    setCurrentPhotoSet({})
    setIsGenerating(false)
  }

  /**
   * Handles navigation back from current view
   */
  const handleBack = () => {
    if (currentView === 'upload') {
      navigateToGallery()
    } else if (currentView === 'generator') {
      navigateToGallery()
    } else if (currentView === 'preview') {
      setSelectedModel(null)
      navigateToGallery()
    }
  }

  // ========================================
  // Effects
  // ========================================
  
  // Load user models when user changes or view changes
  useEffect(() => {
    loadUserPhotos()
  }, [user, currentView])
  
  // Fetch admin models for logged-out users
  useEffect(() => {
    if (!user) {
      fetchAdminModels()
    }
  }, [user])

  // ========================================
  // Render
  // ========================================
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Navigation Header */}
      <MobileNavigationHeader 
        currentView={currentView} 
        onBack={handleBack}
        user={user}
        onLogin={() => openAuthModal("Please sign in to continue")}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <div className="p-4">
        {/* ========================================
            Gallery View
        ======================================== */}
        {currentView === 'gallery' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6" data-testid="gallery-view">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">
                {user ? "Your 3D Models" : "Sample 3D Models"}
              </h2>
              <Button
                variant="default" 
                size="sm"
                onClick={() => {
                  if (!user) {
                    openAuthModal("Please sign in or create an account to upload photos and generate 3D models.")
                    return
                  }
                  navigateToUpload()
                }}
                disabled={isRetrying || !isInitialized}
              >
                + Add Model
              </Button>
            </div>
            <ModelGallery 
              key={user ? user.id : 'logged-out'}
              models={user ? models : adminModels} 
              onSelectModel={isRetrying ? undefined : handleSelectModel} 
              selectedModelId={selectedModel?.id}
              onNavigateToUpload={isRetrying ? undefined : navigateToUpload}
              onNavigateBack={navigateToGallery}
              isFullView={currentView === 'gallery'}
              isLoading={isLoading}
              error={error}
            />
          </div>
        )}

        {/* ========================================
            Upload View
        ======================================== */}
        {currentView === 'upload' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6" data-testid="upload-view">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Upload Photos</h2>
            </div>
            <FileUpload 
              onUpload={(file: File) => handleUpload(file, "front")} 
              disabled={isRetrying} 
            />
          </div>
        )}

        {/* ========================================
            Generator View
        ======================================== */}
        {currentView === 'generator' && selectedModel && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6" data-testid="generator-view">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">3D Model</h2>
            </div>
            <ModelGenerator
              photoSet={currentPhotoSet}
              onUpload={(fileOrItem: File | UploadItem, position: keyof PhotoSet) => {
                if (fileOrItem instanceof File) {
                  handleUpload(fileOrItem, position)
                } else {
                  handleUpload(fileOrItem.file, position)
                }
              }}
              onRemove={() => {}}
              onGenerate={handleGenerate}
              canGenerate={true}
              isGenerating={isGenerating}
              isRetrying={isRetrying}
              processingStage={selectedModel.processingStage}
              selectedModel={selectedModel}
              onNavigateBack={navigateToGallery}
              isFullView={true}
            />
          </div>
        )}

        {/* ========================================
            Preview View
        ======================================== */}
        {currentView === 'preview' && selectedModel && selectedModel.modelUrl && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6" data-testid="preview-view">
            <ModelPreview 
              modelUrl={selectedModel.modelUrl} 
              photoSet={currentPhotoSet}
              onNavigateBack={navigateToGallery}
              isFullView={true}
            />
          </div>
        )}
      </div>
      
      {/* Auth Modal */}
      <AuthModal 
        isOpen={showAuthModal} 
        onClose={closeAuthModal} 
        onLogin={login} 
        reason={authReason}
        initialForgotPassword={showForgotPassword}
        aria-describedby="auth-dialog-description"
      />
    </div>
  )
}
