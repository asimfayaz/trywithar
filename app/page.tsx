"use client"

import { useState, useEffect } from "react"
import { ModelGallery } from "@/components/model-gallery"
import { FileUpload } from "@/components/file-upload"
import { AuthModal } from "@/components/auth-modal"
import { UserDashboard } from "@/components/user-dashboard"
import { ModelGenerator } from "@/components/model-generator"
import { ModelPreview } from "@/components/model-preview"
import { NavigationProvider, useNavigation } from "@/contexts/NavigationContext"
import { MobileHomeContent } from "@/components/mobile-home-content"
import { useIsMobile } from "@/components/ui/use-mobile"
import { Logo } from "@/components/logo"
import { useAuth } from "@/contexts/AuthContext"

import { ModelService } from "@/lib/supabase/model.service"
import { StorageService } from "@/lib/storage.service"
import type { ModelStatus } from "@/lib/supabase/types"

export interface UploadItem {
  file: File;
  dataUrl: string; // Base64 data URL for preview
  persistentUrl?: string; // Persistent URL from R2 storage
}

export interface PhotoSet {
  front?: UploadItem;
  left?: UploadItem;
  right?: UploadItem;
  back?: UploadItem;
}

// Align with ModelStatus type
type ProcessingStage = ModelStatus;

export interface ModelData {
  isTemporary?: boolean
  expiresAt?: Date
  id: string
  thumbnail: string
  status: "draft" | "processing" | "completed" | "failed"
  modelUrl?: string
  uploadedAt: Date
  updatedAt: Date
  jobId?: string | null
  processingStage?: ModelStatus | undefined
  photoSet: PhotoSet
  sourcePhotoId?: string;
  error?: string; // Add error property for failed state
}

export interface User {
  id: string
  name?: string | null
  email: string
  avatar_url?: string | null
  credits?: number
  created_at?: string
}

export default function Home() {
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
  
  // Create model service instance
  const modelService = new ModelService();

  // Check URL parameters for auth modal triggers
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const showAuth = urlParams.get('showAuth');
    const authMode = urlParams.get('authMode');
    
    if (showAuth === 'true') {
      openAuthModal();
      
      if (authMode === 'forgotPassword') {
        setShowForgotPassword(true);
      }
    }
    
    if (showAuth || authMode) {
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
    }
  }, []);
  
  const [models, setModels] = useState<ModelData[]>([])

  // Function to load user's photos from database
  const loadUserPhotos = async () => {
    if (!user) return
    
    try {
      const modelsData = await modelService.getModelsByUserId(user.id)
      modelsData.sort((a: any, b: any) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      
      const modelData: ModelData[] = modelsData.map((model: any) => {
        let status: "draft" | "processing" | "completed" | "failed"
        let processingStage: ProcessingStage | undefined
        
  const statusMap: Record<string, {status: string, processingStage?: ProcessingStage}> = {
    'draft': { status: 'draft' },
    'uploading_photos': { status: 'processing', processingStage: 'uploading_photos' },
    'removing_background': { status: 'processing', processingStage: 'removing_background' },
    'generating_3d_model': { status: 'processing', processingStage: 'generating_3d_model' },
    'completed': { status: 'completed', processingStage: 'completed' },
    'failed': { status: 'failed', processingStage: 'failed' }
  };

        const mapping = statusMap[model.model_status] || { status: 'failed' };
        status = mapping.status as any;
        processingStage = mapping.processingStage;
          
return {
  id: model.id,
  thumbnail: model.front_image_url || '/placeholder.svg?height=150&width=150',
  status,
  modelUrl: model.model_url || undefined,
  uploadedAt: new Date(model.created_at),
  updatedAt: new Date(model.updated_at),
  jobId: model.job_id || undefined,
  processingStage,
  photoSet: { 
    front: {
      file: new File([], 'front.jpg'),
      dataUrl: model.front_image_url || '/placeholder.svg?height=150&width=150'
    }
  },
  error: undefined // Initialize error as undefined
}
      })
      
      setModels(modelData)
    } catch (error) {
      console.error('Failed to load user photos:', error)
    }
  }


  // Load photos when user changes
  useEffect(() => {
    if (user) {
      loadUserPhotos()
    } else {
      setModels([])
    }
  }, [user])

  // Real user authentication
  const handleLogin = (user: any) => {
    login(user);
  }

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error)
    }
    setModels([]); // Reset models on logout
    setSelectedModel(null)
    setCurrentPhotoSet({})
    setIsGenerating(false)
  }

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
  error: undefined // Initialize error
};

        setSelectedModel(previewModel);
        setCurrentPhotoSet({ front: uploadItem });
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
      
      if (position === "front") {
        setSelectedModel(null);
        setCurrentPhotoSet({});
      } else if (selectedModel) {
        setCurrentPhotoSet(prev => {
          const newSet = { ...prev };
          delete newSet[position];
          return newSet;
        });
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

    if (selectedModel) {
      const updatedPhotoSet = { ...selectedModel.photoSet }
      delete updatedPhotoSet[position]
      setSelectedModel({ ...selectedModel, photoSet: updatedPhotoSet })
    }
  }

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
  }

  const handleGenerateModel = async () => {
    if (!user) {
      openAuthModal("Please sign in to generate 3D models.");
      return;
    }

    if (!currentPhotoSet.front || !selectedModel) {
      alert("Please select a model with a front image to generate a 3D model.");
      return;
    }

    if ((user.credits || 0) < 1) {
      alert("You have no credits remaining. Please add credits to continue.");
      return;
    }

    setIsGenerating(true);

const newModel: ModelData = {
  ...selectedModel,
  status: 'processing',
  processingStage: 'draft',
  updatedAt: new Date(),
  isTemporary: false,
  error: undefined // Reset error when retrying
};

    setModels(prev => [newModel, ...prev]);
    setSelectedModel(newModel);
    
    let jobId: string | null = null;

    try {
      const frontFile = currentPhotoSet.front?.file;
      if (!frontFile) throw new Error('Front draft file not found');
      
      const otherViews = ['left', 'right', 'back'] as const;
      
      // Upload original photos for all views
      const { uploadOriginalImageToR2 } = await import('@/lib/backgroundRemoval');
      const uploadPromises = [];
      
      // Upload front photo
      uploadPromises.push(uploadOriginalImageToR2(frontFile).then(result => {
        return { position: 'front', url: result.url };
      }));
      
      // Upload other views
      for (const view of otherViews) {
        const uploadItem = currentPhotoSet[view as keyof PhotoSet];
        if (uploadItem) {
          uploadPromises.push(uploadOriginalImageToR2(uploadItem.file).then(result => {
            return { position: view, url: result.url };
          }));
        }
      }
      
      // Wait for all uploads to complete
      const uploadResults = await Promise.all(uploadPromises);
      
      // Create a map of URLs by position
      const urlMap: Record<string, string> = {};
      for (const result of uploadResults) {
        urlMap[result.position] = result.url;
      }

      const modelRecord = {
        user_id: user.id,
        model_status: 'draft' as const,
      };
      
      const createdModel = await modelService.createModel(modelRecord);
const updatedModel: ModelData = {
  ...selectedModel,
  id: createdModel.id,
  isTemporary: false,
  expiresAt: undefined,
  jobId,
  status: 'processing',
  processingStage: 'uploading_photos',
  uploadedAt: new Date()
};
      
      setModels(prev => prev.map(model => 
        model.id === selectedModel.id ? updatedModel : model
      ));
      setSelectedModel(updatedModel);

      // This duplicate upload call was removed since we already uploaded the front file
      // in the batch upload above
      
      await modelService.updateModel(createdModel.id, {
        model_status: 'removing_background',
        front_image_url: urlMap.front,
        ...(urlMap.left && { left_image_url: urlMap.left }),
        ...(urlMap.right && { right_image_url: urlMap.right }),
        ...(urlMap.back && { back_image_url: urlMap.back })
      });

      setSelectedModel(prev => {
        if (!prev || prev.id !== createdModel.id) return prev;
        return {
          ...prev,
          processingStage: 'removing_background'
        };
      });

      let bgResult;
      try {
        const { removeBackgroundFromImage } = await import('@/lib/backgroundRemoval');
        bgResult = await removeBackgroundFromImage(frontFile, {
          debug: process.env.NODE_ENV === 'development'
        });
      } catch (bgError) {
        console.error('❌ Background removal failed:', bgError);
        await modelService.updateModel(createdModel.id, {
          model_status: 'failed'
        });
        throw new Error(bgError instanceof Error ? 
          `Background removal failed: ${bgError.message}` : 
          'Background removal failed');
      }

      const presignedRes = await fetch('/api/generate-upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          fileName: 'processed.png',
          contentType: 'image/png',
          prefix: 'nobgr'
        })
      });

      if (!presignedRes.ok) {
        const errorData = await presignedRes.json();
        throw new Error(`Failed to get upload URL: ${errorData.message}`);
      }

      const { presignedUrl, key } = await presignedRes.json();
      const uploadRes = await fetch(presignedUrl, {
        method: 'PUT',
        body: bgResult.blob,
        headers: { 'Content-Type': 'image/png' }
      });

      if (!uploadRes.ok) {
        throw new Error('Direct upload to R2 failed');
      }

      const r2 = await import('@/lib/r2');
      const publicUrl = r2.r2Service.getPublicUrl('photos', key);

      await modelService.updateModel(createdModel.id, {
        model_status: 'removing_background',
        front_nobgr_image_url: publicUrl
      });
      
      // Skip the photos_uploaded stage
      setSelectedModel(prev => {
        if (!prev || prev.id !== createdModel.id) return prev;
        return {
          ...prev,
          processingStage: 'generating_3d_model'
        };
      });

      // Send pre-uploaded URLs instead of file objects
      const formData = new FormData();
      formData.append('frontUrl', publicUrl); // Use the background-removed URL for front
      
      // Add URLs for other views if they exist
      if (currentPhotoSet.left?.persistentUrl) {
        formData.append('leftUrl', currentPhotoSet.left.persistentUrl);
      }
      if (currentPhotoSet.right?.persistentUrl) {
        formData.append('rightUrl', currentPhotoSet.right.persistentUrl);
      }
      if (currentPhotoSet.back?.persistentUrl) {
        formData.append('backUrl', currentPhotoSet.back.persistentUrl);
      }
      
      formData.append('options', JSON.stringify({
        enable_pbr: true,
        should_remesh: true,
        should_texture: true
      }));
      
      formData.append('modelId', createdModel.id);
      
      const response = await fetch('/api/generate', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Job creation failed');
      }
      
      const jobResponse = await response.json();
      jobId = jobResponse.job_id;
      
      setModels(prev => prev.map(model => 
        model.id === createdModel.id 
          ? { 
              ...model, 
              jobId: jobId || undefined,
              processingStage: 'generating_3d_model' 
            } 
          : model
      ));
      setSelectedModel(prev => {
        if (!prev || prev.id !== createdModel.id) return prev;
        return {
          ...prev,
          jobId: jobId || undefined,
          processingStage: 'generating_3d_model'
        };
      });

      if (jobId) {
        checkJobStatusWithRetry(createdModel.id, jobId);
      } else {
        throw new Error('Job ID is missing after creating job');
      }
      
      const storageService = new StorageService();
      await storageService.deleteExpiredDrafts();

    } catch (error) {
      console.error('❌ Error during model generation:', error);
      
      setModels((prev) =>
        prev.map((model) =>
          model.id === selectedModel?.id 
            ? { 
                ...model, 
                status: "failed", 
                processingStage: 'failed',
                error: error instanceof Error ? error.message : 'Failed to generate model'
              } 
            : model,
        ),
      );
      
      setSelectedModel((prev) => 
        prev && prev.id === selectedModel?.id 
          ? { 
              ...prev, 
              status: "failed", 
              processingStage: 'failed',
              error: error instanceof Error ? error.message : 'Failed to generate model'
            } 
          : prev
      );
      
      alert('Failed to start model generation. Please try again.');
    } finally {
      setIsGenerating(false);
      refreshUserCredits();

      if (selectedModel?.isTemporary) {
        const storage = new StorageService();
        try {
          await storage.deleteDraft(selectedModel.id);
        } catch (error) {
          console.error('Failed to clean up temporary model:', error);
        }
      }
    }
  }

  // Function to check job status with retry logic
  const checkJobStatusWithRetry = async (photoId: string, jobId: string, attempt = 0) => {
    try {
      const response = await fetch(`/api/status?job_id=${encodeURIComponent(jobId)}`);
      
      if (response.status === 404) {
        await modelService.updateModel(photoId, {
          model_status: 'failed'
        });
        
        setModels(prev => prev.map(model => 
          model.jobId === jobId ? {
            ...model,
            status: 'failed',
            processingStage: 'failed',
            error: 'Job not found'
          } : model
        ));
        
        if (selectedModel?.jobId === jobId) {
          setSelectedModel(prev => prev ? {
            ...prev,
            status: 'failed',
            processingStage: 'failed',
            error: 'Job not found'
          } : prev);
        }
        return;
      }
      
      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }
      
      const statusData = await response.json();
      
      if (statusData.status === 'completed' && statusData.model_urls?.glb) {
        await modelService.updateModel(photoId, {
          model_status: 'completed',
          model_url: statusData.model_urls.glb
        });
        
        setModels(prev => prev.map(model => 
          model.jobId === jobId ? {
            ...model,
            status: 'completed',
            modelUrl: statusData.model_urls.glb,
            processingStage: undefined
          } : model
        ));
        
        if (selectedModel?.jobId === jobId) {
          setSelectedModel(prev => prev ? {
            ...prev,
            status: 'completed',
            modelUrl: statusData.model_urls.glb,
            processingStage: undefined
          } : prev);
        }
      } else if (statusData.status === 'failed') {
        await modelService.updateModel(photoId, {
          model_status: 'failed'
        });
        
        setModels(prev => prev.map(model => 
          model.jobId === jobId ? {
            ...model,
            status: 'failed',
            processingStage: 'failed',
            error: 'Model generation failed'
          } : model
        ));
        
        if (selectedModel?.jobId === jobId) {
          setSelectedModel(prev => prev ? {
            ...prev,
            status: 'failed',
            processingStage: 'failed',
            error: 'Model generation failed'
          } : prev);
        }
      }
    } catch (error) {
      console.error('Error checking job status:', error);
      
      if (attempt < 5) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        return checkJobStatusWithRetry(photoId, jobId, attempt + 1);
      } else {
        setModels(prev => prev.map(model => 
          model.jobId === jobId ? {
            ...model,
            status: 'failed',
            processingStage: 'failed',
            error: 'Failed to check job status'
          } : model
        ));
        
        if (selectedModel?.jobId === jobId) {
          setSelectedModel(prev => prev ? {
            ...prev,
            status: 'failed',
            processingStage: 'failed',
            error: 'Failed to check job status'
          } : prev);
        }
      }
    }
  };
  
  // Function to check status for all processing photos
  const checkAllProcessingPhotos = async () => {
    try {
      const statuses = ['photos_uploaded', 'removing_background', 'generating_3d_model'] as const;
      let processingModels: any[] = [];
      for (const status of statuses) {
        const models = await modelService.getModelsByStatus(status);
        processingModels = [...processingModels, ...models];
      }
    
      for (const model of processingModels) {
        if (model.job_id) {
          await checkJobStatusWithRetry(model.id, model.job_id);
        }
      }
    } catch (error) {
      console.error('Error checking processing photos:', error);
    }
  };

  // Check for processing jobs on initial load
  useEffect(() => {
    const checkJobs = async () => {
      try {
      } catch (error) {
        console.error('Error checking processing jobs:', error);
      } finally {
        setIsLoading(false);
      }
    };

    const hasProcessingModels = models.some(model => model.status === 'processing' && model.jobId);
    if (hasProcessingModels) {
      checkJobs();
    } else {
      setIsLoading(false);
    }
  }, [models]);

  // Real-time updates for models
  useEffect(() => {
    if (!user) return;

    // TODO: Implement real-time updates using AuthContext
    // This will be handled by the AuthContext or a separate service

    return () => {
      // Cleanup real-time subscription
    };
  }, [user]);

  // Update selected model when models are updated
  useEffect(() => {
    if (selectedModel) {
      const updatedModel = models.find(model => model.id === selectedModel.id);
      if (updatedModel && updatedModel.updatedAt > selectedModel.updatedAt) {
        setSelectedModel(updatedModel);
      }
    }
  }, [models]);

  // Check for processing jobs and photos on initial load
  useEffect(() => {
    if (user) {
      checkAllProcessingPhotos();
    }
  }, [user]);
  
  // Cleanup on tab close
  useEffect(() => {
    const handleBeforeUnload = async () => {
      if (selectedModel?.isTemporary) {
        const storage = new StorageService();
        try {
          await storage.deleteDraft(selectedModel.id);
        } catch (error) {
          console.error('Failed to clean up temporary model:', error);
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [selectedModel]);
  
  // Check status when selected model changes
  useEffect(() => {
    if (selectedModel?.jobId && selectedModel.status === 'processing') {
      const photoId = models.find(m => m.id === selectedModel.id)?.id;
      if (photoId) {
        checkJobStatusWithRetry(photoId, selectedModel.jobId);
      }
    }
  }, [selectedModel?.id]);
  
  // Function to refresh user credit data
  const refreshUserCredits = async () => {
    // This will be handled by the AuthContext
    // TODO: Implement credit refresh in AuthContext
  };

  // Refresh credits on initial load
  useEffect(() => {
    if (user) {
      refreshUserCredits();
    }
  }, []);

  const handleCloseAuthModal = () => {
    closeAuthModal();
  }

  const hasPhotos = Object.keys(currentPhotoSet).length > 0
  const photoControlsDisabled = selectedModel?.status === "processing" || selectedModel?.status === "completed" || selectedModel?.status === "failed";
  const canGenerate = currentPhotoSet.front && !isGenerating && selectedModel?.status !== "processing" && selectedModel?.status !== "failed";

  const isMobile = useIsMobile();

  return (
    <NavigationProvider>
      {isMobile ? (
        <MobileHomeContent />
      ) : (
        <div className="min-h-screen bg-gray-50">
          {/* Header */}
          <header className="bg-white border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Logo /><h1 className="text-2xl font-bold text-gray-900 ml-3">Try with AR</h1>
              </div>
              <UserDashboard user={user} onLogin={() => openAuthModal("Please sign in to continue")} onLogout={handleLogout} />
            </div>
          </header>

          {/* Main Grid Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 md:grid-cols-3 gap-6 p-6 h-[calc(100vh-88px)]">
            {/* Left Column - Gallery and Upload */}
            <div className="lg:col-span-1 space-y-4 flex flex-col min-h-0">
              {/* Upload Section */}
              <div className="grid row-span-1 bg-white rounded-lg shadow-sm border border-gray-200 p-6 h-fit">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Upload Photos</h2>
                <FileUpload onUpload={(file: File) => handleUpload(file, "front")} disabled={false} />
              </div>

              {/* Model Gallery */}
              <div className="grid row-span-2 bg-white rounded-lg shadow-sm border border-gray-200 p-6 flex-1 min-h-0">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Your 3D Models</h2>
              <ModelGallery 
                key={user ? user.id : 'logged-out'}
                models={models} 
                onSelectModel={handleSelectModel} 
                selectedModelId={selectedModel?.id}
                onNavigateToUpload={() => {}} 
              />
              </div>
            </div>

            {/* Right Column - Model Viewer */}
            <div className="lg:col-span-2 md:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200 p-6 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">3D Model</h2>
              </div>

              <div className="flex-1 min-h-0 flex flex-col">
                {selectedModel ? (
                  <div className="flex-1 min-h-0">
                    {selectedModel?.status === 'completed' && selectedModel.modelUrl ? (
                      <ModelPreview modelUrl={selectedModel.modelUrl} photoSet={currentPhotoSet} />
                    ) : (
                      <ModelGenerator
                        photoSet={currentPhotoSet}
                        onUpload={(fileOrItem: File | UploadItem, position: keyof PhotoSet) => {
                          if (fileOrItem instanceof File) {
                            handleUpload(fileOrItem, position);
                          } else {
                            handleUpload(fileOrItem.file, position);
                          }
                        }}
                        onRemove={(position: keyof PhotoSet) => handleRemovePhoto(position)}
                        onGenerate={handleGenerateModel}
                        canGenerate={canGenerate}
                        isGenerating={isGenerating}
                        processingStage={selectedModel.processingStage}
                        selectedModel={selectedModel}
                        errorMessage={selectedModel.status === "failed" ? selectedModel.error : undefined}
                      />
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center flex-1 text-gray-500">
                    <div className="text-center">
                      <div className="w-12 h-12 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                        <svg className="w-6 h-6" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M16 8h-4a8 8 0 0 0-8 8v4" />
                          <path d="M48 8h4a8 8 0 0 1 8 8v4" />
                          <path d="M16 56h-4a8 8 0 0 1-8-8v-4" />
                          <path d="M48 56h4a8 8 0 0 0 8-8v-4" />
                          <polygon points="32,16 48,25 48,41 32,50 16,41 16,25" />
                          <polyline points="32,50 32,34 48,25" />
                          <polyline points="32,34 16,25" />
                        </svg>
                      </div>
                      <h3 className="text-lg mb-2">No Model Selected</h3>
                      <p className="text-sm">Upload a photo to generate a 3D model, or select a model from the gallery</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Auth Modal */}
          <AuthModal 
            isOpen={showAuthModal} 
            onClose={handleCloseAuthModal} 
            onLogin={handleLogin} 
            reason={authReason}
            initialForgotPassword={showForgotPassword}
          />
        </div>
      )}
    </NavigationProvider>
  )
}
