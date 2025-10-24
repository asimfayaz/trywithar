"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useToast } from '@/components/ui/use-toast';

// Component imports
import { ModelGallery } from "@/components/model-gallery"
import { FileUpload } from "@/components/file-upload"
import { AuthModal } from "@/components/auth-modal"
import { UserDashboard } from "@/components/user-dashboard"
import { ModelGenerator } from "@/components/model-generator"
import { ModelPreview } from "@/components/model-preview"
import { MobileHomeContent } from "@/components/mobile-home-content"
import { Logo } from "@/components/logo"

// Context imports
import { NavigationProvider } from "@/contexts/NavigationContext"
import { useAuth } from "@/contexts/AuthContext"
import { ViewState } from '@/contexts/NavigationContext';

// Service imports
import { ModelService } from "@/lib/supabase/model.service"
import { StorageService } from "@/lib/storage.service"
import { supabase } from "@/lib/supabase"

// Hook imports
import { useIsMobile } from "@/components/ui/use-mobile"
import { useModelGeneration } from "@/hooks/useModelGeneration";

// Type imports
import type { ModelStatus } from "@/lib/supabase/types"

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Represents a single uploaded file with preview and storage URLs
 */
export interface UploadItem {
  file: File;
  dataUrl: string; // Base64 data URL for preview
  persistentUrl?: string; // Persistent URL from R2 storage
}

/**
 * Collection of photos for different angles of the subject
 */
export interface PhotoSet {
  front?: UploadItem;
  left?: UploadItem;
  right?: UploadItem;
  back?: UploadItem;
}

/**
 * Processing stage aligned with ModelStatus type
 */
type ProcessingStage = ModelStatus;

/**
 * Complete model data structure including metadata and processing state
 */
export interface ModelData {
  id: string
  thumbnail: string
  status: "draft" | "processing" | "completed" | "failed"
  modelUrl?: string
  uploadedAt: Date
  updatedAt: Date
  jobId?: string | null
  processingStage?: ModelStatus | undefined
  photoSet: PhotoSet
  sourcePhotoId?: string
  error?: string
  isTemporary?: boolean // Indicates if model is a temporary draft
  expiresAt?: Date // Expiration date for temporary models
}

/**
 * User profile data structure
 */
export interface User {
  id: string
  name?: string | null
  email: string
  avatar_url?: string | null
  credits?: number
  created_at?: string
}

// ============================================================================
// CONSTANTS
// ============================================================================

// Admin user ID for displaying sample models to logged-out users
const ADMIN_USER_ID = "541a43f1-6c11-43a0-8ddb-91563e22c5f7"

// Maximum retry attempts for job status checks
const MAX_STATUS_CHECK_RETRIES = 5

// Delay between retry attempts (milliseconds)
const STATUS_CHECK_RETRY_DELAY = 2000

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Converts database model status to UI model status
 */
function mapModelStatus(dbStatus: string): {
  status: "draft" | "processing" | "completed" | "failed"
  processingStage?: ProcessingStage
} {
  const statusMap: Record<string, {
    status: "draft" | "processing" | "completed" | "failed"
    processingStage?: ProcessingStage
  }> = {
    'draft': { status: 'draft' },
    'uploading_photos': { status: 'processing', processingStage: 'uploading_photos' },
    'removed_background': { status: 'processing', processingStage: 'removed_background' },
    'generating_3d_model': { status: 'processing', processingStage: 'generating_3d_model' },
    'completed': { status: 'completed', processingStage: 'completed' },
    'failed': { status: 'failed', processingStage: 'failed' }
  }

  return statusMap[dbStatus] || { status: 'failed' }
}

/**
 * Transforms database model data to UI ModelData format
 */
function transformModelData(model: any): ModelData {
  const mapping = mapModelStatus(model.model_status)
  
  return {
    id: model.id,
    thumbnail: model.front_image_url || model.front_nobgr_image_url || '/placeholder.svg?height=150&width=150',
    status: mapping.status,
    modelUrl: model.model_url || undefined,
    uploadedAt: new Date(model.created_at),
    updatedAt: new Date(model.updated_at),
    jobId: model.job_id || undefined,
    processingStage: mapping.processingStage,
    photoSet: { 
      front: {
        file: new File([], 'front.jpg'),
        dataUrl: model.front_image_url || model.front_nobgr_image_url || '/placeholder.svg?height=150&width=150'
      }
    },
    error: undefined
  }
}

/**
 * Converts a File to a base64 data URL
 */
async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
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
// MAIN COMPONENT
// ============================================================================

/**
 * Main home content component that handles 3D model generation workflow
 * Separated from Home component to work properly with Next.js Suspense
 */
function HomeContent() {
  // ============================================================================
  // HOOKS & ROUTER
  // ============================================================================
  
  const navigationRouter = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  
  // Extract URL parameters
  const viewParam = searchParams.get('view') as ViewState | null;
  const modelIdParam = searchParams.get('modelId');

  // Authentication context
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
    createModelDraft
  } = useModelGeneration();

  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================

  // Currently selected model being viewed/edited
  const [selectedModel, setSelectedModel] = useState<ModelData | null>(null)
  
  // Current photo set being worked on
  const [currentPhotoSet, setCurrentPhotoSet] = useState<PhotoSet>({})
  
  // Generation and loading states
  const [isGenerating, setIsGenerating] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  
  // Model collections
  const [models, setModels] = useState<ModelData[]>([]) // User's models
  const [adminModels, setAdminModels] = useState<ModelData[]>([]) // Sample models for logged-out users

  // ============================================================================
  // SERVICE INSTANCES
  // ============================================================================

  const modelService = new ModelService();
  const storageService = new StorageService();

  // ============================================================================
  // URL PARAMETER INITIALIZATION
  // ============================================================================

  /**
   * Initialize component state from URL parameters
   * Handles view state and model selection on page load
   */
  useEffect(() => {
    try {
      // View parameter is handled by NavigationContext
      if (viewParam && ['gallery', 'upload', 'generator', 'preview'].includes(viewParam)) {
        // View state is managed by NavigationContext
      }
      
      // Handle model ID parameter
      if (modelIdParam) {
        // Wait for models to load before selecting
        if (models.length === 0) return
        
        const model = models.find(m => m.id === modelIdParam)
        if (model) {
          setSelectedModel(model)
        } else {
          // Model not found - show error and redirect
          toast({
            title: "Model not found",
            description: "The model you are trying to access does not exist.",
            variant: "destructive",
          })
          
          navigationRouter.replace(`${pathname}?view=gallery`)
          setSelectedModel(null)
        }
      }
    } catch (error) {
      console.error('Error initializing from URL parameters:', error);
      toast({
        title: "Initialization error",
        description: "Failed to initialize from URL parameters.",
        variant: "destructive",
      });
    }
  }, [viewParam, modelIdParam, models]);

  // ============================================================================
  // AUTH MODAL HANDLING
  // ============================================================================

  /**
   * Check URL parameters for auth modal triggers
   * Allows deep linking to auth modal with specific modes
   */
  useEffect(() => {
    const showAuth = searchParams.get('showAuth');
    const authMode = searchParams.get('authMode');
    
    if (showAuth === 'true') {
      openAuthModal();
      
      if (authMode === 'forgotPassword') {
        setShowForgotPassword(true);
      }
      
      // Clear auth params from URL after opening modal
      navigationRouter.replace(pathname);
    }
  }, [searchParams]);

  // ============================================================================
  // DATA LOADING
  // ============================================================================

  /**
   * Load user's photos from database
   * Fetches and transforms all models belonging to the current user
   */
  const loadUserPhotos = async () => {
    if (!user) return
    
    try {
      const modelsData = await modelService.getModelsByUserId(user.id)
      
      // Sort by creation date (newest first)
      modelsData.sort((a: any, b: any) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
      
      // Transform database models to UI format
      const modelData: ModelData[] = modelsData.map(transformModelData)
      
      setModels(modelData)
    } catch (error) {
      console.error('Failed to load user photos:', error)
      toast({
        title: "Failed to load models",
        description: "Could not load your models. Please try refreshing the page.",
        variant: "destructive",
      })
    }
  };

  /**
   * Load user's models when user changes
   * Clears models when user logs out
   */
  useEffect(() => {
    if (user) {
      loadUserPhotos()
    } else {
      setModels([])
    }
  }, [user]);

  /**
   * Load admin models for display when user is not logged in
   * Shows sample models to demonstrate the application
   */
  useEffect(() => {
    const fetchAdminModels = async () => {
      if (!user) {
        try {
          const adminModelsData = await modelService.getModelsByUserId(ADMIN_USER_ID)
          const modelData: ModelData[] = adminModelsData.map(transformModelData)
          setAdminModels(modelData)
        } catch (error) {
          console.error('Failed to load sample models:', error)
          toast({
            title: "Failed to load sample models",
            description: "Sample models could not be loaded at this time.",
            variant: "destructive",
          })
        }
      }
    }
    
    fetchAdminModels()
  }, [user]);

  // ============================================================================
  // AUTHENTICATION HANDLERS
  // ============================================================================

  /**
   * Handle user login
   */
  const handleLogin = (user: any) => {
    login(user)
  };

  const handleLogout = async () => {
    try {
      await logout()
      // Clear all user data
      setModels([])
      setSelectedModel(null)
      setCurrentPhotoSet({})
      setIsGenerating(false)
    } catch (error) {
      console.error('Logout error:', error)
      toast({
        title: "Logout failed",
        description: "An error occurred during logout. Please try again.",
        variant: "destructive",
      })
    }
  };

  // ============================================================================
  // FILE UPLOAD HANDLERS
  // ============================================================================

  /**
   * Handle request to upload file
   * Checks authentication before allowing upload
   */
  const handleUploadRequest = () => {
    if (!user) {
      openAuthModal("Please sign in to upload photos");
      return;
    }
    // Trigger file input click
    document.getElementById('desktop-file-input')?.click();
  }

  /**
   * Handle file upload for a specific position
   * Creates preview and updates state
   */
  const handleUpload = async (file: File, position: keyof PhotoSet = "front") => {
    if (!user) {
      openAuthModal("You need to sign in to upload photos");
      return;
    }

    try {
      // Convert file to data URL for preview
      const dataUrl = await fileToDataUrl(file);
      
      const uploadItem: UploadItem = {
        file,
        dataUrl
      };

      if (position === "front") {
        try {
          // Create database draft model instead of temporary ID
          const modelId = await createModelDraft(user.id);
          
          const previewModel: ModelData = {
            id: modelId,
            thumbnail: dataUrl,
            status: "draft",
            uploadedAt: new Date(),
            updatedAt: new Date(),
            photoSet: { front: uploadItem },
            processingStage: 'draft',
            isTemporary: false, // Now a real database record
            error: undefined
          };

          setSelectedModel(previewModel);
          setCurrentPhotoSet({ front: uploadItem });
          
          // Add to models list immediately
          setModels(prev => [previewModel, ...prev]);
        } catch (draftError) {
          console.error('❌ Draft creation failed:', draftError);
          toast({
            title: "Draft creation failed",
            description: `Could not create model: ${draftError instanceof Error ? draftError.message : 'Unknown error'}`,
            variant: "destructive",
          });
          return;
        }
      }
      // Handle additional angle uploads (updates existing model)
      else if (selectedModel) {
        const newDataUrl = await fileToDataUrl(file);
        
        const newUploadItem: UploadItem = {
          file,
          dataUrl: newDataUrl
        };
        
        // Update photo set
        setCurrentPhotoSet(prev => ({ ...prev, [position]: newUploadItem }));

        // Update selected model
        setSelectedModel(prev => prev ? 
          { 
            ...prev, 
            photoSet: { ...prev.photoSet, [position]: newUploadItem }
          } 
          : null
        );
      }
    } catch (error) {
      console.error(`❌ Error storing ${position} photo draft:`, error)
      toast({
        title: "Upload failed",
        description: `Failed to store ${position} photo. Please try again.`,
        variant: "destructive",
      })
      
      // Cleanup on error
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

  /**
   * Remove a photo from a specific position
   * Front image cannot be removed as it's required
   */
  const handleRemovePhoto = (position: keyof PhotoSet) => {
    if (position === "front") {
      alert("Front image is required and cannot be removed.")
      return
    }

    // Remove from current photo set
    setCurrentPhotoSet((prev) => {
      const newSet = { ...prev }
      delete newSet[position]
      return newSet
    })

    // Remove from selected model
    if (selectedModel) {
      const updatedPhotoSet = { ...selectedModel.photoSet }
      delete updatedPhotoSet[position]
      setSelectedModel({ ...selectedModel, photoSet: updatedPhotoSet })
    }
  }

  // ============================================================================
  // MODEL SELECTION
  // ============================================================================

  /**
   * Handle selecting a model from the gallery
   * Loads full photo set data from database
   */
  const handleSelectModel = async (model: ModelData) => {
    // Only clean up temporary models (not database-backed models)
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
      // Fetch full model data including all photos
      const modelData = await modelService.getModel(model.id)
      if (modelData) {
        // Build complete photo set from database URLs
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
        // Fallback to model's existing photo set
        setCurrentPhotoSet(model.photoSet)
      }
    } catch (error) {
      console.error('Failed to load photo data:', error)
      setCurrentPhotoSet(model.photoSet)
    }
  }

  // ============================================================================
  // MODEL GENERATION
  // ============================================================================

  /**
   * Main handler for 3D model generation
   * Orchestrates the multi-step generation process
   */
  const handleGenerateModel = async () => {
    // Validation checks
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

    // Create processing model entry
    const newModel: ModelData = {
      ...selectedModel,
      status: 'processing',
      processingStage: 'draft',
      updatedAt: new Date(),
      isTemporary: false,
      error: undefined
    };

    // Only add to models list if it's not already there
    if (!models.some(m => m.id === newModel.id)) {
      setModels(prev => [newModel, ...prev]);
    }
    setSelectedModel(newModel);
    
    let jobId: string | null = null;

    try {
      const modelId = selectedModel.id;

      // Step 1: Upload raw photos
      const urlMap = await uploadRawPhotos(modelId, currentPhotoSet);

      // Step 2: Remove background (using the front URL)
      const processedUrl = await removeBackground(modelId, urlMap.front);

      // Step 3: Generate 3D model
      const result = await generate3DModel(modelId, processedUrl, currentPhotoSet, await getAccessToken() || undefined);
      jobId = result.jobId;
      
      // Update UI with job information
      setModels(prev => prev.map(model => 
        model.id === modelId 
          ? { 
              ...model, 
              jobId: jobId || undefined,
              processingStage: 'generating_3d_model' 
            } 
          : model
      ));

      setSelectedModel(prev => {
        if (!prev || prev.id !== modelId) return prev;
        return {
          ...prev,
          jobId: jobId || undefined,
          processingStage: 'generating_3d_model'
        };
      });

      // Start polling for job completion
      if (jobId) {
        checkJobStatusWithRetry(modelId, jobId);
      } else {
        throw new Error('Job ID is missing after creating job');
      }
      
      // Cleanup expired drafts
      await storageService.deleteExpiredDrafts();

    } catch (error) {
      console.error('❌ Error during model generation:', error);

      // Update model to failed state
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate model'
      
      
      setModels((prev) =>
        prev.map((model) =>
          model.id === selectedModel?.id 
            ? { 
                ...model, 
                status: "failed", 
                processingStage: 'failed',
                error: errorMessage
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
              error: errorMessage
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

  // ============================================================================
  // JOB STATUS POLLING
  // ============================================================================

  /**
   * Check job status with retry logic
   * Polls API until job completes or fails
   */
  const checkJobStatusWithRetry = async (
    photoId: string, 
    jobId: string, 
    attempt = 0
  ) => {
    try {
      const response = await fetch(`/api/status?job_id=${encodeURIComponent(jobId)}`);
      
      // Handle job not found
      if (response.status === 404) {
        await modelService.updateModel(photoId, {
          model_status: 'failed'
        });
        
        updateModelStatus(jobId, 'failed', 'Job not found')
        return;
      }
      
      // Handle API errors
      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }
      
      const statusData = await response.json();
      
      // Handle completed job
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
      }
      // Handle failed job
      else if (statusData.status === 'failed') {
        await modelService.updateModel(photoId, {
          model_status: 'failed'
        });
        
        updateModelStatus(jobId, 'failed', 'Model generation failed');
      }
      // Job still processing - continue polling
      else {
        // Continue checking status
        setTimeout(() => checkJobStatusWithRetry(photoId, jobId, attempt), 3000)
      }
    } catch (error) {
      console.error('Error checking job status:', error);
      
      // Retry if under max attempts
      if (attempt < MAX_STATUS_CHECK_RETRIES) {
        await new Promise(resolve => setTimeout(resolve, STATUS_CHECK_RETRY_DELAY))
        return checkJobStatusWithRetry(photoId, jobId, attempt + 1)
      } else {
        // Max retries reached - mark as failed
        updateModelStatus(jobId, 'failed', 'Failed to check job status')
      }
    }
  };

  /**
   * Helper to update model status in state
   */
  const updateModelStatus = (
    jobId: string, 
    status: 'failed', 
    error: string
  ) => {
    setModels(prev => prev.map(model => 
      model.jobId === jobId ? {
        ...model,
        status,
        processingStage: 'failed',
        error
      } : model
    ))
    
    if (selectedModel?.jobId === jobId) {
      setSelectedModel(prev => prev ? {
        ...prev,
        status,
        processingStage: 'failed',
        error
      } : prev)
    }
  }

  /**
   * Check status for all processing models
   * Used on initial load to resume monitoring
   */
  const checkAllProcessingPhotos = async () => {
    try {
      const statuses = ['photos_uploaded', 'removed_background', 'generating_3d_model'] as const;
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

  // ============================================================================
  // LIFECYCLE EFFECTS
  // ============================================================================

  /**
   * Check for processing jobs on initial load
   */
  useEffect(() => {
    const checkJobs = async () => {
      try {
        // Job checking logic here
      } catch (error) {
        console.error('Error checking processing jobs:', error);
      } finally {
        setIsLoading(false);
      }
    };

    const hasProcessingModels = models.some(model =>
      model.status === 'processing' && model.jobId
    );

    if (hasProcessingModels) {
      checkJobs();
    } else {
      setIsLoading(false);
    }
  }, [models]);

  /**
   * Update selected model when models array changes
   */
  useEffect(() => {
    if (selectedModel) {
      const updatedModel = models.find(model => model.id === selectedModel.id);
      if (updatedModel && updatedModel.updatedAt > selectedModel.updatedAt) {
        setSelectedModel(updatedModel);
      }
    }
  }, [models]);

  /**
   * Check for processing jobs when user logs in
   */
  useEffect(() => {
    if (user) {
      checkAllProcessingPhotos();
    }
  }, [user]);
  
  /**
   * Cleanup temporary models on tab close
   */
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
  
  /**
   * Check status when selected model changes
   */
  useEffect(() => {
    if (selectedModel?.jobId && selectedModel.status === 'processing') {
      const photoId = models.find(m => m.id === selectedModel.id)?.id;
      if (photoId) {
        checkJobStatusWithRetry(photoId, selectedModel.jobId);
      }
    }
  }, [selectedModel?.id]);
  
  /**
   * Refresh user credits (placeholder for AuthContext integration)
   */
  const refreshUserCredits = async () => {
    // TODO: Implement credit refresh in AuthContext
  };

  /**
   * Refresh credits on initial load
   */
  useEffect(() => {
    if (user) {
      refreshUserCredits();
    }
  }, []);

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================


  const handleCloseAuthModal = () => {
    closeAuthModal();
  }

  const hasPhotos = Object.keys(currentPhotoSet).length > 0
  const photoControlsDisabled = 
    selectedModel?.status === "processing" ||
    selectedModel?.status === "completed" ||
    selectedModel?.status === "failed";
  const canGenerate = 
    currentPhotoSet.front &&
    !isGenerating &&
    selectedModel?.status !== "processing" &&
    selectedModel?.status !== "failed";

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <NavigationProvider>
      {isMobile ? (
        <MobileHomeContent />
      ) : (
        <div className="min-h-screen bg-gray-50">
        {/* ===== HEADER ===== */}
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Logo /><h1 className="text-2xl font-bold text-gray-900 ml-3">Try with AR</h1>
            </div>
            <UserDashboard
              user={user}
              onLogin={() => openAuthModal("Please sign in to continue")}
              onLogout={handleLogout} />
          </div>
        </header>

        {/* ===== MAIN GRID LAYOUT ===== */}
        <div className="grid grid-cols-1 lg:grid-cols-3 md:grid-cols-3 gap-6 p-6 h-[calc(100vh-88px)]">
          
          {/* ===== LEFT COLUMN - Gallery and Upload ===== */}
          <div className="lg:col-span-1 space-y-4 flex flex-col min-h-0">
            
            {/* Upload Section */}
            <div className="grid row-span-1 bg-white rounded-lg shadow-sm border border-gray-200 p-6 h-fit" data-testid="upload-view">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Upload Photos</h2>
              <FileUpload 
                onUpload={(file: File) => handleUpload(file, "front")} 
                onUploadRequest={handleUploadRequest}
                disabled={false} 
              />
              {/* Hidden file input for desktop */}
              <input
                id="desktop-file-input"
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    handleUpload(file, "front");
                  }
                }}
                className="hidden"
              />
            </div>

            {/* Model Gallery */}
            <div className="grid row-span-2 bg-white rounded-lg shadow-sm border border-gray-200 p-6 flex-1 min-h-0" data-testid="gallery-view">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                {user ? "Your 3D Models" : "Sample 3D Models"}
              </h2>
            <ModelGallery 
              key={user ? user.id : 'logged-out'}
              models={user ? models : adminModels} 
              onSelectModel={handleSelectModel} 
              selectedModelId={selectedModel?.id}
              onNavigateToUpload={() => {}} 
            />
            </div>
          </div>

          {/* ===== RIGHT COLUMN - Model Viewer ===== */}
          <div className="lg:col-span-2 md:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200 p-6 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">3D Model</h2>
            </div>

            <div className="flex-1 min-h-0 flex flex-col">
              {selectedModel ? (
                <div className="flex-1 min-h-0" data-testid="generator-view">
                  {/* Show preview if model is completed */}
                  {selectedModel?.status === 'completed' && selectedModel.modelUrl ? (
                    <ModelPreview
                    modelUrl={selectedModel.modelUrl}
                    photoSet={currentPhotoSet}
                    data-testid="preview-view" />
                  ) : (
                    /* Show generator for draft/processing/failed models */
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
                /* Empty state when no model is selected */
                <div className="flex flex-col items-center justify-center flex-1 text-gray-500">
                  <div className="text-center">
                    <div className="w-12 h-12 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                      {/* 3D cube icon */}
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

        {/* ===== AUTH MODAL ===== */}
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

// ============================================================================
// EXPORTED COMPONENT WITH SUSPENSE BOUNDARY
// ============================================================================

/**
 * Main Home component with Suspense boundary
 * Wraps HomeContent to handle Next.js async routing
 */
export default function Home() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading application...</p>
        </div>
      </div>
    }>
      <HomeContent />
    </Suspense>
  )
}
