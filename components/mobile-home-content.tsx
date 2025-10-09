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

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { ViewState } from '@/contexts/NavigationContext';
import { useToast } from '@/components/ui/use-toast';

export function MobileHomeContent() {
  const navigationRouter = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { toast } = useToast();
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
  const [adminModels, setAdminModels] = useState<ModelData[]>([])
  const [isAdminModelsLoading, setIsAdminModelsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Initialize from URL parameters
  useEffect(() => {
    const viewParam = searchParams.get('view') as ViewState | null;
    if (viewParam && ['gallery', 'upload', 'generator', 'preview'].includes(viewParam)) {
      // View state is managed by NavigationContext
    }
    
    const modelId = searchParams.get('modelId');
    if (modelId && !isLoading && (!user ? !isAdminModelsLoading : true)) {
      // Skip validation for temporary models (prefixed with "temp-")
      if (modelId.startsWith('temp-')) {
        return;
      }
      
      // Search in appropriate model array based on user state
      const model = user 
        ? models.find(m => m.id === modelId)
        : adminModels.find(m => m.id === modelId);
        
      if (model) {
        setSelectedModel(model);
      } else {
        toast({
          title: "Model not found",
          description: "The model you are trying to access does not exist.",
          variant: "destructive",
        });
        
        // Redirect to gallery
        navigationRouter.replace(`${pathname}?view=gallery`);
        setSelectedModel(null);
      }
    }
  }, [searchParams, isLoading, models, adminModels, isAdminModelsLoading, user]);
  
  // Remove modelService references
  // All model operations should go through useModelGeneration hook
  
  const { 
    generateModel, 
    retryModelGeneration, 
    pollJobStatus, 
    isRetrying,
    isInitialized,
    getModelsByUserId
  } = useModelGeneration();



  // Load user photos using useModelGeneration hook
  const loadUserPhotos = async () => {
    if (!user || !isInitialized) {
      setIsLoading(false);
      return;
    }
    
    try {
      setIsLoading(true);
      setError(null);
      const modelsData = await getModelsByUserId(user.id);
      modelsData.sort((a: any, b: any) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      
      const modelData: ModelData[] = modelsData.map((model: any) => {
        const statusMap: Record<string, {status: string, processingStage?: ModelStatus}> = {
          'draft': { status: 'draft' },
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
      
      setModels(modelData);
    } catch (error) {
      console.error('Failed to load user photos:', error);
      setError(error instanceof Error ? error.message : 'Failed to load models');
    } finally {
      setIsLoading(false);
    }
  }

  // Fetch admin models for logged-out users
  useEffect(() => {
    const fetchAdminModels = async () => {
      if (!user) {
        try {
          setIsAdminModelsLoading(true);
          const modelService = new ModelService();
          const adminUserId = "541a43f1-6c11-43a0-8ddb-91563e22c5f7";
          const adminModelsData = await modelService.getModelsByUserId(adminUserId);
          
          const modelData: ModelData[] = adminModelsData.map((model: any) => {
            const statusMap: Record<string, {status: string, processingStage?: ModelStatus}> = {
              'draft': { status: 'draft' },
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
          });
          
          setAdminModels(modelData);
        } catch (error) {
          console.error('Failed to load admin models:', error);
        } finally {
          setIsAdminModelsLoading(false);
        }
      }
    };

    if (!user) {
      fetchAdminModels();
    }
  }, [user]);

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
    
    // We can't access modelService directly anymore
    // For now, we'll just use the existing model data
    setCurrentPhotoSet(model.photoSet)
    
    if (model.status === "completed" && model.modelUrl) {
      navigateToPreview(model.id);
    } else {
      navigateToGenerator(model.id);
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
          status: "draft",
          uploadedAt: new Date(),
          updatedAt: new Date(),
          photoSet: { front: uploadItem },
          processingStage: 'uploading_photos',
          isTemporary: true,
          error: undefined
        };

        setSelectedModel(previewModel);
        setCurrentPhotoSet({ front: uploadItem });
        navigateToGenerator(previewModel.id);
        
        // Show success toast
        toast({
          title: "Photo uploaded",
          description: "Your photo has been uploaded successfully. You can now generate your 3D model.",
          variant: "default",
        });
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
            setSelectedModel(null);
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
      setModels([]); // Reset models on logout
      setSelectedModel(null)
      setCurrentPhotoSet({})
      setIsGenerating(false)
    }}
      />

      {/* Mobile Layout */}
      <div className="p-4">
        {currentView === 'gallery' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6" data-testid="gallery-view">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">{user ? "Your 3D Models" : "Sample 3D Models"}</h2>
              <Button
                variant="default" 
                size="sm"
                onClick={() => {
                  if (!user) {
                    openAuthModal("Please sign in or create an account to upload photos and generate 3D models.");
                    return;
                  }
                  navigateToUpload();
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

        {currentView === 'upload' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6" data-testid="upload-view">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Upload Photos</h2>
            </div>
            <FileUpload onUpload={(file: File) => handleUpload(file, "front")} disabled={isRetrying} />
          </div>
        )}

        {currentView === 'generator' && selectedModel && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6" data-testid="generator-view">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">3D Model</h2>
              
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
                  
                  // Update URL to generator view with model ID
                  navigateToGenerator(selectedModel.id);
                  
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
          onLogin={handleLogin} 
          reason={authReason}
          initialForgotPassword={showForgotPassword}
          aria-describedby="auth-dialog-description"
        />
    </div>
  )
}
