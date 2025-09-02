"use client"

import { useState, useEffect } from "react"
import { ModelGallery } from "@/components/model-gallery"
import { FileUpload } from "@/components/file-upload"
import { ModelGenerator } from "@/components/model-generator"
import { ModelPreview } from "@/components/model-preview"
import { MobileNavigationHeader } from "@/components/mobile-navigation-header"
import { useNavigation } from "@/contexts/NavigationContext"
import { useIsMobile } from "@/components/ui/use-mobile"
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext"
import { AuthModal } from "@/components/auth-modal"
import { StorageService } from "@/lib/storage.service"
import { useModelGeneration } from "@/hooks/useModelGeneration"
import { ModelService } from "@/lib/supabase/model.service"
import type { ModelStatus } from "@/lib/supabase/types"
import type { UploadItem, PhotoSet, ModelData } from "@/app/page"

export function MobileHomeContent() {
  const { currentView, navigateToGallery, navigateToUpload, navigateToGenerator, navigateToPreview } = useNavigation();
  const isMobile = useIsMobile();
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
  
  const [selectedModel, setSelectedModel] = useState<ModelData | null>(null)
  const [currentPhotoSet, setCurrentPhotoSet] = useState<PhotoSet>({})
  const [isGenerating, setIsGenerating] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [models, setModels] = useState<ModelData[]>([])
  const [error, setError] = useState<string | null>(null)
  
  const { generateModel, retryModelGeneration, pollJobStatus, isRetrying } = useModelGeneration();
  const modelService = new ModelService();

  // Add a new useEffect for initial mount:
  useEffect(() => {
    navigateToGallery(); // Set initial view to gallery
  }, []);


  // Load user photos
  const loadUserPhotos = async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    
    try {
      setIsLoading(true);
      setError(null);
      const modelsData = await modelService.getModelsByUserId(user.id)
      modelsData.sort((a: any, b: any) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      
      const modelData: ModelData[] = modelsData.map((model: any) => {
        const statusMap: Record<string, {status: string, processingStage?: ModelStatus}> = {
          'draft': { status: 'pending' },
          'uploading_photos': { status: 'processing', processingStage: 'uploading_photos' },
          'removing_background': { status: 'processing', processingStage: 'removing_background' },
          'generating_3d_model': { status: 'processing', processingStage: 'generating_3d_model' },
          'completed': { status: 'completed', processingStage: 'completed' },
          'failed': { status: 'failed', processingStage: 'failed' }
        };

        const mapping = statusMap[model.model_status] || { status: 'failed' };
        
        return {
          id: model.id,
          thumbnail: model.front_image_url || '/placeholder.svg?height=150&width=150',
          status: mapping.status as any,
          modelUrl: model.model_url || undefined,
          uploadedAt: new Date(model.created_at),
          updatedAt: new Date(model.updated_at),
          jobId: model.job_id || undefined,
          processingStage: mapping.processingStage,
          photoSet: { 
            front: {
              file: new File([], 'front.jpg'),
              dataUrl: model.front_image_url || '/placeholder.svg?height=150&width=150'
            }
          },
          error: undefined
        }
      })
      
      setModels(modelData)
    } catch (error) {
      console.error('Failed to load user photos:', error)
      setError(error instanceof Error ? error.message : 'Failed to load models')
    } finally {
      setIsLoading(false);
    }
  }

  // Load models when component mounts or user changes
  useEffect(() => {
    loadUserPhotos();
  }, [user, currentView]);

  // Handle model selection
  const handleSelectModel = async (model: ModelData) => {
    if (selectedModel?.isTemporary) {
      const storage = new StorageService();
      try {
        await storage.deleteDraft(selectedModel.id);
      } catch (error) {
        console.error('Failed to clean up temporary model:', error);
      }
    }
    
    setSelectedModel(model)
    
    try {
      const modelData = await modelService.getModel(model.id)
      if (modelData) {
        const photoSet: PhotoSet = {}
        
        if (modelData.front_image_url) {
          photoSet.front = {
            file: new File([], 'front.jpg'),
            dataUrl: modelData.front_image_url
          }
        }
        if (modelData.left_image_url) {
          photoSet.left = {
            file: new File([], 'left.jpg'),
            dataUrl: modelData.left_image_url
          }
        }
        if (modelData.right_image_url) {
          photoSet.right = {
            file: new File([], 'right.jpg'),
            dataUrl: modelData.right_image_url
          }
        }
        if (modelData.back_image_url) {
          photoSet.back = {
            file: new File([], 'back.jpg'),
            dataUrl: modelData.back_image_url
          }
        }
        
        setCurrentPhotoSet(photoSet)
      } else {
        setCurrentPhotoSet(model.photoSet)
      }
    } catch (error) {
      console.error('Failed to load photo data:', error)
      setCurrentPhotoSet(model.photoSet)
    }
    
    if (model.status === "completed" && model.modelUrl) {
      navigateToPreview();
    } else {
      navigateToGenerator();
    }
  }

  // Handle login
  const handleLogin = (user: any) => {
    login(user);
  }

  // Handle upload
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
          status: "pending",
          uploadedAt: new Date(),
          updatedAt: new Date(),
          photoSet: { front: uploadItem },
          processingStage: 'uploading_photos',
          isTemporary: true,
          error: undefined
        };

        setSelectedModel(previewModel);
        setCurrentPhotoSet({ front: uploadItem });
        navigateToGenerator();
      } else if (selectedModel) {
        const newDataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
        
        const newUploadItem: UploadItem = {
          file,
          dataUrl: newDataUrl
        };
        
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Navigation Header */}
      <MobileNavigationHeader 
        currentView={currentView} 
        onBack={() => {
          if (currentView === 'upload') {
            navigateToGallery();
          } else if (currentView === 'generator') {
            navigateToGallery();
          } else if (currentView === 'preview') {
            navigateToGallery();
          }
        }}
        user={user}
        onLogin={() => openAuthModal("Please sign in to continue")}
        onLogout={async () => {
          try {
            await logout();
          } catch (error) {
            console.error('Logout error:', error)
          }
          setSelectedModel(null)
          setCurrentPhotoSet({})
          setIsGenerating(false)
        }}
      />

      {/* Mobile Layout */}
      <div className="p-4">
        {currentView === 'gallery' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Your 3D Models</h2>
              <Button
                variant="default" 
                size="sm"
                onClick={navigateToUpload}
                disabled={isRetrying}
              >
                + Add Model
              </Button>
            </div>
            <ModelGallery 
              models={models} 
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

        {currentView === 'upload' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Upload Photos</h2>
            </div>
            <FileUpload onUpload={(file: File) => handleUpload(file, "front")} disabled={isRetrying} />
          </div>
        )}

        {currentView === 'generator' && selectedModel && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">3D Model Generator</h2>
              
            </div>
            <ModelGenerator
              photoSet={currentPhotoSet}
              onUpload={(fileOrItem: File | UploadItem, position: keyof PhotoSet) => {
                if (fileOrItem instanceof File) {
                  handleUpload(fileOrItem, position);
                } else {
                  handleUpload(fileOrItem.file, position);
                }
              }}
              onRemove={() => {}}
              onGenerate={async () => {
                if (!selectedModel || !user) return;
                
                try {
                  if (!user) {
                    throw new Error("User not authenticated");
                  }
                  
                  setIsGenerating(true);
                  
                  // Check if this is a retry for a failed model
                  let result;
                  if (selectedModel.status === "failed" && selectedModel.id) {
                    // Use retry function for failed models
                    result = await retryModelGeneration(selectedModel.id, user.id);
                  } else {
                    // Use regular generate function for new models
                    result = await generateModel(selectedModel.id, currentPhotoSet, user.id);
                  }
                  
                  // Navigate to generator view to show processing status
                  navigateToGenerator();
                  
                  // Start polling for job status
                  const storage = new StorageService();
                  
                  // Clean up temporary models
                  if (selectedModel.isTemporary) {
                    await storage.deleteDraft(selectedModel.id);
                  }
                  
                  // Update the selected model with the job ID and processing status
                  if (selectedModel) {
                    setSelectedModel(prev => prev ? {
                      ...prev,
                      jobId: result.jobId,
                      status: "processing",
                      processingStage: 'generating_3d_model',
                      error: undefined // Clear any previous errors
                    } : null);
                  }
                  
                  // Start polling for job status
                  console.log("Started job with ID:", result.jobId);
                  
                  // Poll for job completion
                  if (result.jobId) {
                    setTimeout(async () => {
                      try {
                        const jobResult = await pollJobStatus(result.jobId);
                        if (jobResult.status === 'completed' && jobResult.modelUrl) {
                          // Update model in database
                          await modelService.updateModel(selectedModel.id, {
                            model_status: 'completed',
                            model_url: jobResult.modelUrl
                          });
                          
                          // Update local state
                          setSelectedModel(prev => prev ? {
                            ...prev,
                            status: "completed",
                            modelUrl: jobResult.modelUrl,
                            processingStage: 'completed'
                          } : null);
                          
                          // Refresh models list
                          loadUserPhotos();
                        } else if (jobResult.status === 'failed') {
                          // Update model as failed
                          await modelService.updateModel(selectedModel.id, {
                            model_status: 'failed'
                          });
                          
                          // Update local state
                          setSelectedModel(prev => prev ? {
                            ...prev,
                            status: "failed",
                            processingStage: 'failed',
                            error: jobResult.errorMessage || 'Model generation failed'
                          } : null);
                        }
                      } catch (pollError) {
                        console.error("Job polling failed:", pollError);
                        // Update model as failed
                        await modelService.updateModel(selectedModel.id, {
                          model_status: 'failed'
                        });
                        
                        // Update local state
                        setSelectedModel(prev => prev ? {
                          ...prev,
                          status: "failed",
                          processingStage: 'failed',
                          error: 'Model generation failed'
                        } : null);
                      }
                    }, 1000);
                  }
                  
                } catch (error) {
                  console.error("Generation error:", error);
                  alert(error instanceof Error ? error.message : "Failed to generate model");
                } finally {
                  setIsGenerating(false);
                }
              }}
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

        {currentView === 'preview' && selectedModel && selectedModel.modelUrl && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
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
        onLogin={handleLogin} 
        reason={authReason}
        initialForgotPassword={showForgotPassword}
      />
    </div>
  )
}
