"use client"

import { useState, useEffect } from "react"
import { ImageGallery } from "@/components/image-gallery"
import { FileUpload } from "@/components/file-upload"
import { AuthModal } from "@/components/auth-modal"
import { authService, type AuthUser } from "@/lib/auth"
import { UserDashboard } from "@/components/user-dashboard"
import { PhotoPreview } from "@/components/photo-preview"

import { photoService } from "@/lib/supabase"
import { StorageService } from "@/lib/storage.service"

export type UploadItem = File | { 
  url: string; 
  expiresAt?: Date; 
  isTemporary?: boolean 
};

type ProcessingStage = 
  "uploaded" |
  "processing" | 
  "removing_background" |
  "generating" | 
  "ready" |
  "failed" |
  "original_persisting" |
  "background_removal";

export interface ModelData {
  isTemporary?: boolean
  expiresAt?: Date
  id: string
  thumbnail: string
  status: "processing" | "complete" | "failed" | "uploaded"
  modelUrl?: string
  uploadedAt: Date
  updatedAt: Date
  jobId?: string | null  // Allow null values
  processingStage?: ProcessingStage
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
  front?: UploadItem
  left?: UploadItem
  right?: UploadItem
  back?: UploadItem
}

export default function Home() {
  const [user, setUser] = useState<User | null>(null)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authReason, setAuthReason] = useState<string | null>(null)
  const [selectedModel, setSelectedModel] = useState<ModelData | null>(null)
  const [currentPhotoSet, setCurrentPhotoSet] = useState<PhotoSet>({})
  const [isGenerating, setIsGenerating] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Check for existing authentication session on app load
  useEffect(() => {
    let isInitialized = false
    
    const initializeAuth = async () => {
      try {
        console.log('🔄 Initializing auth...')
        const currentUser = await authService.getCurrentUser()
        console.log('👤 Current user from auth service:', currentUser)
        
        if (currentUser && !isInitialized) {
          console.log('✅ Setting user state:', currentUser.email)
          setUser({
            id: currentUser.id,
            name: currentUser.name || 'User',
            email: currentUser.email,
            avatar: currentUser.avatar_url || "/placeholder.svg?height=40&width=40",
            freeModelsUsed: currentUser.free_models_used,
            credits: currentUser.credits,
          })
        } else if (!currentUser) {
          console.log('❌ No current user found')
        }
      } catch (error) {
        console.error('❌ Failed to initialize auth:', error)
      } finally {
        // Always set loading to false, regardless of success/failure
        if (!isInitialized) {
          console.log('🏁 Setting loading to false, isInitialized:', isInitialized)
          setIsLoading(false)
          isInitialized = true
        }
      }
    }

    // Set up auth state listener first
    const { data: { subscription } } = authService.onAuthStateChange((authUser) => {
      console.log('🔔 Auth state changed:', authUser ? authUser.email : 'null')
      
      if (authUser) {
        console.log('✅ Auth listener setting user state:', authUser.email)
        setUser({
          id: authUser.id,
          name: authUser.name || 'User',
          email: authUser.email,
          avatar: authUser.avatar_url || "/placeholder.svg?height=40&width=40",
          freeModelsUsed: authUser.free_models_used,
          credits: authUser.credits,
        })
      } else {
        console.log('❌ Auth listener clearing user state')
        setUser(null)
      }
      
      // Ensure loading is set to false when auth state changes
      if (!isInitialized) {
        console.log('🏁 Auth listener setting loading to false')
        setIsLoading(false)
        isInitialized = true
      }
    })

    // Then run initial auth check
    initializeAuth()

    // Cleanup subscription on unmount
    return () => {
      subscription?.unsubscribe()
    }
  }, [])
  
  const [models, setModels] = useState<ModelData[]>([])

  // Function to load user's photos from database
    const loadUserPhotos = async () => {
      if (!user) return
      
      try {
        const photos = await photoService.getPhotosByUserId(user.id)
        
        // Sort photos by created_at in descending order (newest first)
        photos.sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        
        const modelData: ModelData[] = photos.map(photo => {
          // Map database status to ModelData status
          let status: "processing" | "complete" | "failed" | "uploaded"
          let processingStage: ProcessingStage | undefined
          
          switch (photo.generation_status) {
            case 'completed':
              status = 'complete'
              break
            case 'processing':
              status = 'processing'
              processingStage = 'generating'
              break
            case 'failed':
              status = 'failed'
              break
            case 'pending':
            default:
              status = 'uploaded'
              processingStage = 'uploaded'
          }
          
          return {
            id: photo.id,
            thumbnail: photo.front_image_url || '/placeholder.svg?height=150&width=150',
            status,
            modelUrl: photo.model_url || undefined,
            uploadedAt: new Date(photo.created_at),
            updatedAt: new Date(photo.updated_at),
            jobId: photo.job_id || undefined,
            processingStage,
            photoSet: { front: new File([], 'front.jpg') } // Placeholder for PhotoSet
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
  const handleLogin = (user: AuthUser) => {
    setUser({
      id: user.id,
      name: user.name || user.email.split('@')[0], // Use email prefix if name is null
      email: user.email,
      avatar: user.avatar_url || "/placeholder.svg?height=40&width=40",
      freeModelsUsed: user.free_models_used,
      credits: user.credits,
    })
    setShowAuthModal(false)
    setAuthReason(null)
  }

  const handleLogout = async () => {
    try {
      await authService.signOut()
      setUser(null)
    } catch (error) {
      console.error('Logout error:', error)
      // Still clear the user state even if logout fails
      setUser(null)
    }
    setSelectedModel(null)
    setCurrentPhotoSet({})
    setIsGenerating(false)
  }

  const handleUpload = async (file: File | UploadItem, position: keyof PhotoSet = "front") => {
    if (!user) {
      setAuthReason("You need to sign in to upload photos");
      setShowAuthModal(true);
      return;
    }

    // Handle URL-based items (Phase 3 implementation)
    if (typeof file !== 'object' || !(file instanceof File)) {
      console.log(`📤 Handling URL-based ${position} photo upload`);
      const uploadItem = file as { url: string; expiresAt?: Date; isTemporary?: boolean };
      
      // Set default expiration (24 hours from now) for temporary items
      const expiresAt = uploadItem.expiresAt || new Date(Date.now() + 24 * 60 * 60 * 1000);
      
      if (position === "front") {
        const newModel: ModelData = {
          id: crypto.randomUUID(),
          thumbnail: uploadItem.url,
          status: "uploaded",
          uploadedAt: new Date(),
          updatedAt: new Date(),
          photoSet: { front: { ...uploadItem, expiresAt } },
          processingStage: 'uploaded',
          isTemporary: uploadItem.isTemporary ?? true,
          expiresAt
        };
        setModels((prev) => [...prev, newModel]);
        setSelectedModel(newModel);
        setCurrentPhotoSet({ front: { ...uploadItem, expiresAt } });
      } else if (selectedModel) {
        const updatedItem = { ...uploadItem, expiresAt };
        setCurrentPhotoSet(prev => ({ ...prev, [position]: updatedItem }));
        setModels(prev => prev.map(model => 
          model.id === selectedModel.id
            ? { 
                ...model, 
                photoSet: { ...model.photoSet, [position]: updatedItem },
                isTemporary: true,
                expiresAt
              }
            : model
        ));
        setSelectedModel(prev => prev ? 
          { 
            ...prev, 
            photoSet: { ...prev.photoSet, [position]: updatedItem },
            isTemporary: true,
            expiresAt
          } 
          : null
        );
      }
      return;
    }

    // Handle File uploads
    console.log(`📤 Handling ${position} photo upload:`, file.name);

    try {
      // Store file temporarily in IndexedDB with expiration (24 hours)
      const storage = new StorageService();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await storage.storeDraft(position, file, expiresAt);
      
      // Update UI state
      if (position === "front") {
        const newModel: ModelData = {
          id: crypto.randomUUID(),
          thumbnail: URL.createObjectURL(file),
          status: "uploaded",
          uploadedAt: new Date(),
          updatedAt: new Date(),
          photoSet: { front: file },
          processingStage: 'uploaded',
          isTemporary: true,
          expiresAt
        };
        setModels((prev) => [...prev, newModel]);
        setSelectedModel(newModel);
        setCurrentPhotoSet({ front: file });
      } else if (selectedModel) {
        setCurrentPhotoSet(prev => ({ ...prev, [position]: file }));
        setModels(prev => prev.map(model => 
          model.id === selectedModel.id
            ? { 
                ...model, 
                photoSet: { ...model.photoSet, [position]: file },
                isTemporary: true,
                expiresAt
              }
            : model
        ));
        setSelectedModel(prev => prev ? 
          { 
            ...prev, 
            photoSet: { ...prev.photoSet, [position]: file },
            isTemporary: true,
            expiresAt
          } 
          : null
        );
      }
      
      console.log(`✅ ${position} photo stored as draft with expiration at ${expiresAt}`);
    } catch (error) {
      console.error(`❌ Error storing ${position} photo draft:`, error);
      
      // Enhanced error handling
      if (error instanceof Error && error.message.includes('QuotaExceededError')) {
        alert('Storage limit reached. Please remove some drafts or upload fewer photos.');
      } else {
        alert(`Failed to store ${position} photo. Please try again.`);
      }
      
      // Rollback state changes on error
      if (position === "front") {
        setModels(prev => prev.filter(m => m.id !== selectedModel?.id));
        setSelectedModel(null);
        setCurrentPhotoSet({});
      } else if (selectedModel) {
        setCurrentPhotoSet(prev => {
          const newSet = { ...prev };
          delete newSet[position];
          return newSet;
        });
        setModels(prev => prev.map(model => 
          model.id === selectedModel.id
            ? { 
                ...model, 
                photoSet: { ...model.photoSet },
                isTemporary: model.isTemporary,
                expiresAt: model.expiresAt
              }
            : model
        ));
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

  const handleSelectModel = async (model: ModelData) => {
    setSelectedModel(model)
    
    // Load the actual photo data from database to get real image URLs
    try {
      const photo = await photoService.getPhotoById(model.id)
      if (photo) {
        // Create a PhotoSet with actual image URLs instead of File objects
        const photoSet: PhotoSet = {}
        
        // Convert image URLs to File-like objects for PhotoPreview component
        if (photo.front_image_url) {
          // Create a fake File object with the URL as the name for display
          photoSet.front = new File([], photo.front_image_url)
        }
        if (photo.left_image_url) {
          photoSet.left = new File([], photo.left_image_url)
        }
        if (photo.right_image_url) {
          photoSet.right = new File([], photo.right_image_url)
        }
        if (photo.back_image_url) {
          photoSet.back = new File([], photo.back_image_url)
        }
        
        setCurrentPhotoSet(photoSet)
      } else {
        // Fallback to model's photoSet if photo not found
        setCurrentPhotoSet(model.photoSet)
      }
    } catch (error) {
      console.error('Failed to load photo data:', error)
      // Fallback to model's photoSet on error
      setCurrentPhotoSet(model.photoSet)
    }
  }

  const handleGenerateModel = async () => {
    if (!user) {
      setAuthReason("Please sign in to generate 3D models.");
      setShowAuthModal(true);
      return;
    }

    if (!currentPhotoSet.front || !selectedModel) {
      alert("Please select a model with a front image to generate a 3D model.");
      return;
    }

    // Check quota
    if (user.freeModelsUsed >= 2 && user.credits < 1) {
      alert("You have reached your free quota. Please add credits to continue.");
      return;
    }

    setIsGenerating(true);
  
    // Show initial progress state immediately
    setModels(prev =>
      prev.map(model =>
        model.id === selectedModel.id 
          ? { 
              ...model, 
              status: 'processing',
              processingStage: 'original_persisting',
            } 
          : model
      )
    );
    setSelectedModel(prev => 
      prev?.id === selectedModel.id 
        ? { 
            ...prev, 
            status: 'processing',
            processingStage: 'original_persisting',
          } 
        : prev
    );
    
    // Remove local job ID generation - we'll get the real ID from the API response
    let jobId: string | null = null;

    try {
      console.log('🎆 Starting 3D model generation process...');
      
      // Handle URL-based items (already implemented in Phase 3)
      if (typeof currentPhotoSet.front !== 'object' || !(currentPhotoSet.front instanceof File)) {
        const urlItem = currentPhotoSet.front as { url: string };
        console.log('⏳ Processing URL-based model generation:', urlItem.url);
        
      // Create a minimal photo record for URL-based items
      const photoRecord = {
        user_id: user.id,
        front_image_url: urlItem.url,
        generation_status: 'processing' as const,
        processing_stage: 'processing'
      };
        
        const createdPhoto = await photoService.createPhoto(photoRecord);
        
        // Ensure we have a valid photo ID
        if (!createdPhoto.id) {
          throw new Error('Failed to get photo ID after creation');
        }
        
        // Update UI state
        const updatedModel: ModelData = { 
          ...selectedModel, 
          id: createdPhoto.id,
          jobId,
          status: 'processing',
          processingStage: 'processing',
          thumbnail: urlItem.url,
          uploadedAt: new Date(),
          isTemporary: false // Mark as persistent
        };
        
        setModels(prev => prev.map(model => 
          model.id === selectedModel.id ? updatedModel : model
        ));
        setSelectedModel(updatedModel);
        
        // Simulate processing for now
        simulateProcessing(selectedModel.id, true);
        return;
      }

      // Handle File uploads - retrieve from IndexedDB
      const storage = new StorageService();
      const frontFile = await storage.getDraft('front', true);
      if (!frontFile) throw new Error('Front draft file not found');
      
      // Retrieve other views from IndexedDB if they exist
      const otherViews = ['left', 'right', 'back'] as const;
      const viewFiles: Record<string, File> = {};
      
      for (const view of otherViews) {
        if (currentPhotoSet[view]) {
          const file = await storage.getDraft(view, true);
          if (file) viewFiles[view] = file;
        }
      }

      // Create persistent database record with placeholder URL
      const photoRecord = {
        user_id: user.id,
        front_image_url: 'placeholder', // Will be updated with actual URL
        generation_status: 'processing' as const,
        processing_stage: 'original_persisting',
      };
      
      const createdPhoto = await photoService.createPhoto(photoRecord);
      console.log('✅ Created persistent photo record:', createdPhoto.id);

      // Update selected model with new persistent ID
      const updatedModel: ModelData = {
        ...selectedModel,
        id: createdPhoto.id,
        isTemporary: false,
        expiresAt: undefined,
        jobId,
        status: 'processing',
        processingStage: 'original_persisting',
        uploadedAt: new Date()
      };
      
      setModels(prev => prev.map(model => 
        model.id === selectedModel.id ? updatedModel : model
      ));
      setSelectedModel(updatedModel);

      // Upload original front image to R2
      const { uploadOriginalImageToR2 } = await import('@/lib/backgroundRemoval');
      const uploadResult = await uploadOriginalImageToR2(frontFile);
      
      console.log('✅ Raw image upload result:', uploadResult);
      
      // Validate the upload result
      if (!uploadResult || !uploadResult.url) {
        throw new Error('Failed to upload raw image to R2 - no URL returned');
      }
      
      // Update DB with the persisted image URL
      await photoService.updatePhoto(createdPhoto.id, {
        processing_stage: 'background_removal',
        front_image_url: uploadResult.url
      });

      // Run background removal using stored file
      console.log('🎨 Starting background removal process...');
      setSelectedModel(prev => 
        prev?.id === createdPhoto.id 
          ? { ...prev, processingStage: 'background_removal' } 
          : prev
      );

      const { removeBackgroundFromImage } = await import('@/lib/backgroundRemoval');
      const bgResult = await removeBackgroundFromImage(frontFile, {
        debug: process.env.NODE_ENV === 'development',
        progress: (key: string, current: number, total: number) => {
          console.log(`📊 Background removal progress: ${key} ${current}/${total}`);
        }
      });

      // Get presigned URL for direct upload
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

      // Direct upload to R2 using presigned URL
      const uploadRes = await fetch(presignedUrl, {
        method: 'PUT',
        body: bgResult.blob,
        headers: { 'Content-Type': 'image/png' }
      });

      if (!uploadRes.ok) {
        throw new Error('Direct upload to R2 failed');
      }

      // Get public URL for the uploaded file
      const r2 = await import('@/lib/r2');
      const publicUrl = r2.r2Service.getPublicUrl('photos', key);

      // Update DB with processed image URL
      await photoService.updatePhoto(createdPhoto.id, {
        processing_stage: 'processing',
        front_nobgr_image_url: publicUrl
      });

      // Create form data for model generation
      const formData = new FormData();
      formData.append('front', new File([bgResult.blob], 'processed.png', { type: 'image/png' }));
      
      // Add other views if available
      for (const [view, file] of Object.entries(viewFiles)) {
        formData.append(view, file);
      }
      
      // Add generation options
      formData.append('options', JSON.stringify({
        enable_pbr: true,
        should_remesh: true,
        should_texture: true
      }));
      
      // Add photo ID (required by the API)
      formData.append('photoId', createdPhoto.id);
      
      // We don't have job_creation_status column - removed this update

      // Submit to generation API
      const response = await fetch('/api/generate', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Job creation failed');
      }
      
      const jobResponse = await response.json();
      jobId = jobResponse.job_id; // Get actual job ID from API response
      console.log('🎉 Model generation job created:', jobId);

      // Update photo record with job ID (without job_creation_status)
      await photoService.updatePhoto(createdPhoto.id, {
        job_id: jobId
      });

      // Update UI with job ID (using spread to avoid type issues)
      setModels(prev => prev.map(model => 
        model.id === createdPhoto.id 
          ? { 
              ...model, 
              jobId: jobId || undefined,  // Convert null to undefined
              processingStage: 'processing' 
            } 
          : model
      ));
      setSelectedModel(prev => 
        prev?.id === createdPhoto.id 
          ? { 
              ...prev, 
              jobId: jobId || undefined,  // Convert null to undefined
              processingStage: 'processing' 
            } 
          : prev
      );

      // Start checking job status with retry logic (only if jobId is valid)
      if (jobId) {
        checkJobStatusWithRetry(createdPhoto.id, jobId);
      } else {
        throw new Error('Job ID is missing after creating job');
      }
      
      // Remove expired drafts during generation
      const storageService = new StorageService();
      await storageService.deleteExpiredDrafts();

    } catch (error) {
      console.error('❌ Error during model generation:', error);
      
      // Update model status to show the error
      setModels((prev) =>
        prev.map((model) =>
          model.id === selectedModel?.id 
            ? { 
                ...model, 
                status: "failed", 
                processingStage: undefined,
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
              processingStage: undefined,
              error: error instanceof Error ? error.message : 'Failed to generate model'
            } 
          : prev
      );
      
      // Show error to user
      alert('Failed to start model generation. Please try again.');
    } finally {
      setIsGenerating(false);
    }

    // Update user quota/credits
    if (user.freeModelsUsed < 2) {
      setUser((prev) => (prev ? { ...prev, freeModelsUsed: prev.freeModelsUsed + 1 } : null))
    } else {
      setUser((prev) => (prev ? { ...prev, credits: prev.credits - 1 } : null))
    }
  }

  // Function to check job status with retry logic
  const checkJobStatusWithRetry = async (photoId: string, jobId: string, attempt = 0) => {
    try {
      const response = await fetch(`/api/status?job_id=${encodeURIComponent(jobId)}`);
      
      if (response.status === 404 && attempt < 5) {
        // Job not ready yet - retry after delay
        await new Promise(resolve => setTimeout(resolve, 2000));
        return checkJobStatusWithRetry(photoId, jobId, attempt + 1);
      }
      
      if (!response.ok) {
        console.error('Failed to check job status:', response.statusText);
        throw new Error(`API returned ${response.status}`);
      }
      
      const statusData = await response.json();
      console.log(`Job ${jobId} status:`, statusData);
      
      // Update photo record in database
      if (statusData.status === 'completed' && statusData.model_urls?.glb) {
        await photoService.updatePhoto(photoId, {
          generation_status: 'completed',
          model_url: statusData.model_urls.glb
        });
        
        // Update UI state
        setModels(prev => prev.map(model => 
          model.jobId === jobId ? {
            ...model,
            status: 'complete',
            modelUrl: statusData.model_urls.glb,
            processingStage: undefined
          } : model
        ));
        
        if (selectedModel?.jobId === jobId) {
          setSelectedModel(prev => prev ? {
            ...prev,
            status: 'complete',
            modelUrl: statusData.model_urls.glb,
            processingStage: undefined
          } : prev);
        }
      } else if (statusData.status === 'failed') {
        await photoService.updatePhoto(photoId, {
          generation_status: 'failed'
        });
        
        // Update UI state
        setModels(prev => prev.map(model => 
          model.jobId === jobId ? {
            ...model,
            status: 'failed',
            processingStage: undefined,
            error: 'Model generation failed'
          } : model
        ));
        
        if (selectedModel?.jobId === jobId) {
          setSelectedModel(prev => prev ? {
            ...prev,
            status: 'failed',
            processingStage: undefined,
            error: 'Model generation failed'
          } : prev);
        }
      }
    } catch (error) {
      console.error('Error checking job status:', error);
      
      if (attempt < 5) {
        // Transient error - retry after delay
        await new Promise(resolve => setTimeout(resolve, 2000));
        return checkJobStatusWithRetry(photoId, jobId, attempt + 1);
      } else {
        // Permanent error - mark as failed
        console.error(`Failed to check job status after ${attempt} attempts for job ${jobId}`);
        setModels(prev => prev.map(model => 
          model.jobId === jobId ? {
            ...model,
            status: 'failed',
            processingStage: undefined,
            error: 'Failed to check job status'
          } : model
        ));
        
        if (selectedModel?.jobId === jobId) {
          setSelectedModel(prev => prev ? {
            ...prev,
            status: 'failed',
            processingStage: undefined,
            error: 'Failed to check job status'
          } : prev);
        }
      }
    }
  };
  
  // Function to check status for all processing photos
  const checkAllProcessingPhotos = async () => {
    try {
      const processingPhotos = await photoService.getPhotosByStatus('processing');
      
      for (const photo of processingPhotos) {
        if (photo.job_id) {
          await checkJobStatusWithRetry(photo.id, photo.job_id);
        }
      }
    } catch (error) {
      console.error('Error checking processing photos:', error);
    }
  };

  const simulateProcessing = (modelId: string, backgroundRemovalDone = false) => {
    // Define stages - if background removal is done, start from processing
    const allStages: readonly ProcessingStage[] = ["uploaded", "removing_background", "processing", "generating", "ready"];
    const stages: readonly ProcessingStage[] = backgroundRemovalDone 
      ? ["processing", "generating", "ready"] as const
      : allStages;
    
    let currentStage = 0

    const interval = setInterval(() => {
      currentStage++
      if (currentStage < stages.length) {
        console.log(`🔄 Processing stage: ${stages[currentStage]}`);
        setModels((prev) =>
          prev.map((model) => (model.id === modelId ? { ...model, processingStage: stages[currentStage] } : model)),
        )
        // Update selected model as well
        setSelectedModel((prev) =>
          prev && prev.id === modelId ? { ...prev, processingStage: stages[currentStage] } : prev,
        )
      } else {
        // Processing complete
        console.log('🎉 3D model generation completed!');
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
        // Update selected model as well
        setSelectedModel((prev) =>
          prev && prev.id === modelId
            ? {
                ...prev,
                status: "complete",
                modelUrl: "/assets/3d/duck.glb",
                processingStage: undefined,
              }
            : prev,
        )
        setIsGenerating(false)
        clearInterval(interval)
      }
    }, 2000)
  }

  // Check for processing jobs on initial load
  useEffect(() => {
    const checkJobs = async () => {
      try {
        // Status checking now handled by checkAllProcessingPhotos
      } catch (error) {
        console.error('Error checking processing jobs:', error);
        // Show error to user if needed
      } finally {
        setIsLoading(false);
      }
    };

    // Only check if we have models that might be processing
    const hasProcessingModels = models.some(model => model.status === 'processing' && model.jobId);
    if (hasProcessingModels) {
      checkJobs();
    } else {
      setIsLoading(false);
    }
  }, [models]);

  // Check for processing jobs and photos on initial load
  useEffect(() => {
    if (user) {
      // Check status for all processing photos on page load
      checkAllProcessingPhotos();
    }
  }, [user]);
  
  // Phase 5: Expiration Handling - Cleanup interval
  useEffect(() => {
    const storage = new StorageService();
    const interval = setInterval(async () => {
      try {
        console.log('⏳ Running expiration cleanup...');
        
        // 1. Frontend model expiration filtering
        const now = new Date();
        setModels(prev => prev.filter(model => 
          !model.isTemporary || (model.expiresAt && model.expiresAt > now)
        ));
        
        // Reset selected model if it's expired
        setSelectedModel(prev => 
          prev && prev.isTemporary && prev.expiresAt && prev.expiresAt <= now 
            ? null 
            : prev
        );
        
        // 2. Backend purge of expired IndexedDB entries
        await storage.deleteExpiredDrafts();
        console.log('✅ Expired drafts purged from IndexedDB');
      } catch (error) {
        console.error('❌ Error during expiration cleanup:', error);
      }
    }, 30000); // Every 30 seconds
    
    return () => clearInterval(interval);
  }, []);
  
  // Check status when selected model changes (when user selects a photo)
  useEffect(() => {
    if (selectedModel?.jobId && selectedModel.status === 'processing') {
      // Find the photo ID for this model
      const photoId = models.find(m => m.id === selectedModel.id)?.id;
      if (photoId) {
        checkJobStatusWithRetry(photoId, selectedModel.jobId);
      }
    }
  }, [selectedModel?.id]);

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
          <h1 className="text-2xl font-bold text-gray-900">Try with AR</h1>
          <UserDashboard user={user} onLogin={() => setShowAuthModal(true)} onLogout={handleLogout} />
        </div>
      </header>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6 h-[calc(100vh-88px)]">
        {/* Left Column - Gallery and Upload (X) */}
        <div className="lg:col-span-1 space-y-4 flex flex-col min-h-0">
          {/* Upload Section (Y) - Fixed square size */}
          <div className="grid row-span-1 bg-white rounded-lg shadow-sm border border-gray-200 p-6 h-fit">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Upload Photos</h2>
            <FileUpload onUpload={(file: File) => handleUpload(file, "front")} disabled={false} />
          </div>

          {/* Image Gallery (X) - Takes remaining space */}
          <div className="grid row-span-2 bg-white rounded-lg shadow-sm border border-gray-200 p-6 flex-1 min-h-0">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Photos</h2>
            <ImageGallery models={models} onSelectModel={handleSelectModel} selectedModelId={selectedModel?.id} />
          </div>
        </div>

        {/* Right Column - Model Viewer (Z) */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200 p-6 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">3D Model</h2>
          </div>

          <div className="flex-1 min-h-0 flex flex-col">
            {selectedModel ? (
              selectedModel.status === "failed" ? (
                <div className="flex items-center justify-center flex-1 text-red-500">
                  <p>Model generation failed. Please try again.</p>
                </div>
              ) : (
                // Show photo preview with integrated model viewer, generate button, and processing steps
                <div className="flex-1 min-h-0">
                    <PhotoPreview
                    photoSet={{
                      front: currentPhotoSet.front instanceof File ? currentPhotoSet.front : new File([], 'front.jpg', { type: 'image/jpeg' }),
                      left: currentPhotoSet.left instanceof File ? currentPhotoSet.left : undefined,
                      right: currentPhotoSet.right instanceof File ? currentPhotoSet.right : undefined,
                      back: currentPhotoSet.back instanceof File ? currentPhotoSet.back : undefined
                    }}
                    processingStage={
                      selectedModel.processingStage === 'failed' 
                        ? undefined 
                        : selectedModel.processingStage as "uploaded" | "processing" | "removing_background" | "generating" | "ready" | undefined
                    }
                    modelUrl={selectedModel.modelUrl}
                    selectedModel={selectedModel}
                    onUpload={(file) => handleUpload(file, "front")}
                    onRemove={(position) => handleRemovePhoto(position)}
                    disabled={false}
                    onGenerate={handleGenerateModel}
                    canGenerate={canGenerate}
                    isGenerating={isGenerating}
                  />
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
