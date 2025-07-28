"use client"

import { useState, useEffect } from "react"
import { ImageGallery } from "@/components/image-gallery"
import { FileUpload } from "@/components/file-upload"
import { AuthModal } from "@/components/auth-modal"
import { authService, type AuthUser } from "@/lib/auth"
import { UserDashboard } from "@/components/user-dashboard"
import { PhotoPreview } from "@/components/photo-preview"

import { photoService } from "@/lib/supabase"

type ProcessingStage = "uploaded" | "removing_background" | "processing" | "generating" | "ready";

export interface ModelData {
  id: string
  thumbnail: string
  status: "processing" | "complete" | "failed" | "uploaded"
  modelUrl?: string
  uploadedAt: Date
  jobId?: string
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
  const [isLoading, setIsLoading] = useState(true)

  // Check for existing authentication session on app load
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const currentUser = await authService.getCurrentUser()
        if (currentUser) {
          setUser({
            id: currentUser.id,
            name: currentUser.name || 'User',
            email: currentUser.email,
            avatar: currentUser.avatar_url || "/placeholder.svg?height=40&width=40",
            freeModelsUsed: currentUser.free_models_used,
            credits: currentUser.credits,
          })
        }
      } catch (error) {
        console.error('Failed to initialize auth:', error)
      } finally {
        setIsLoading(false)
      }
    }

    initializeAuth()

    // Set up auth state listener
    const { data: { subscription } } = authService.onAuthStateChange((authUser) => {
      if (authUser) {
        setUser({
          id: authUser.id,
          name: authUser.name || 'User',
          email: authUser.email,
          avatar: authUser.avatar_url || "/placeholder.svg?height=40&width=40",
          freeModelsUsed: authUser.free_models_used,
          credits: authUser.credits,
        })
      } else {
        setUser(null)
      }
    })

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

  const handleUpload = (file: File, position: keyof PhotoSet = "front") => {
    if (!user) {
      setAuthReason("You need to sign in to upload photos")
      setShowAuthModal(true)
      return
    }

    console.log(`📤 Uploading ${position} photo:`, file.name)

    // Update the current photo set with the original image
    setCurrentPhotoSet((prev) => ({
      ...prev,
      [position]: file,
    }))

    // If no model is selected, create a new one
    if (!selectedModel) {
      const newModel: ModelData = {
        id: Date.now().toString(),
        thumbnail: URL.createObjectURL(file),
        status: "uploaded",
        uploadedAt: new Date(),
        photoSet: { [position]: file },
      }
      setModels((prev) => [newModel, ...prev])
      setSelectedModel(newModel)
    } else {
      // Update existing model
      setModels((prev) =>
        prev.map((model) =>
          model.id === selectedModel.id
            ? {
                ...model,
                photoSet: { ...model.photoSet, [position]: file },
                thumbnail: position === "front" ? URL.createObjectURL(file) : model.thumbnail,
              }
            : model,
        ),
      )
      setSelectedModel((prev) =>
        prev
          ? {
              ...prev,
              photoSet: { ...prev.photoSet, [position]: file },
              thumbnail: position === "front" ? URL.createObjectURL(file) : prev.thumbnail,
            }
          : null,
      )
    }
    
    console.log('✅ Photo uploaded successfully!');
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

    setIsGenerating(true);
  
  // Show initial progress state immediately
  setModels(prev =>
    prev.map(model =>
      model.id === selectedModel.id 
        ? { 
            ...model, 
            status: 'processing',
            processingStage: 'uploaded',
          } 
        : model
    )
  );
  setSelectedModel(prev => 
    prev?.id === selectedModel.id 
      ? { 
          ...prev, 
          status: 'processing',
          processingStage: 'uploaded',
        } 
      : prev
  );
  
  // Import Supabase job utilities
  // Using photoService instead of jobs module
  
  // Create a job ID if one doesn't exist
  const jobId = selectedModel.jobId || crypto.randomUUID();

  try {
    console.log('🎆 Starting 3D model generation process...');
    
    // Step 1: Upload raw image to R2 first
    console.log('📤 Uploading raw image to R2...');
    console.log('📤 Front image file details:', {
      name: currentPhotoSet.front.name,
      size: currentPhotoSet.front.size,
      type: currentPhotoSet.front.type
    });
    
    const { uploadOriginalImageToR2 } = await import('@/lib/backgroundRemoval');
    const rawImageUpload = await uploadOriginalImageToR2(currentPhotoSet.front);
    
    console.log('✅ Raw image upload result:', rawImageUpload);
    
    // Validate the upload result
    if (!rawImageUpload || !rawImageUpload.url) {
      throw new Error('Failed to upload raw image to R2 - no URL returned');
    }
    
    console.log('✅ Raw image uploaded to R2:', rawImageUpload.url);
    
    // Step 2: Create photo record with actual raw image URL
    console.log('📝 Creating photo record with raw image URL...');
    const initialPhotoRecord = {
      user_id: user.id,
      front_image_url: rawImageUpload.url, // Actual raw image URL from R2
      left_image_url: null,
      right_image_url: null, 
      back_image_url: null,
      generation_status: 'processing' as const,
      job_id: null, // Will be updated after API call
      model_url: null
    };
    
    console.log('📝 Photo record to be created:', initialPhotoRecord);
    
    let createdPhoto;
    try {
      console.log('🔄 Attempting to create photo record...');
      createdPhoto = await photoService.createPhoto(initialPhotoRecord);
      console.log('✅ Photo record created with ID:', createdPhoto.id);
    } catch (createError) {
      console.error('❌ CRITICAL: Photo creation failed:', {
        error: createError instanceof Error ? createError.message : 'Unknown error',
        stack: createError instanceof Error ? createError.stack : undefined,
        photoData: initialPhotoRecord
      });
      throw createError;
    }
    
    // Step 3: Background Removal
    console.log('🎨 Step 3: Removing background from front image...');
    
    // Update to removing_background stage
    setModels(prev =>
      prev.map(model =>
        model.id === selectedModel.id 
          ? { ...model, processingStage: 'removing_background' } 
          : model
      )
    );
    setSelectedModel(prev => 
      prev?.id === selectedModel.id 
        ? { ...prev, processingStage: 'removing_background' } 
        : prev
    );
      
    // Import the background removal function dynamically
    const { removeBackgroundFromImage } = await import('@/lib/backgroundRemoval');
    
    // Remove background from the front image (this uploads processed image to R2)
    const result = await removeBackgroundFromImage(currentPhotoSet.front, {
      debug: process.env.NODE_ENV === 'development',
      progress: (key: string, current: number, total: number) => {
        console.log(`📊 Background removal progress: ${key} ${current}/${total}`);
      }
    });
    
    console.log('✅ Background removal completed!');
    console.log('📄 Original image URL:', result.originalImageUrl);
    console.log('🎨 Processed image URL:', result.processedImageUrl);
    
    // Create a File object from the processed image
    const processedFile = new File([result.blob], result.fileName, { type: 'image/png' });
    
    // Step 4: Update photo record with background-removed image URL
    console.log('🔄 Updating photo record with background-removed image URL...');
    console.log('🔄 Photo ID:', createdPhoto.id);
    console.log('🔄 Processed image URL:', result.processedImageUrl);
    
    // Verify the photo exists before updating
    console.log('🔍 Verifying photo exists before update...');
    try {
      const existingPhoto = await photoService.getPhotoById(createdPhoto.id);
      console.log('✅ Photo found for update:', {
        id: existingPhoto.id,
        current_front_nobgr_image_url: existingPhoto.front_nobgr_image_url
      });
    } catch (verifyError) {
      console.error('❌ Photo verification failed:', verifyError);
    }
    
    try {
      console.log('🔄 Calling updatePhoto with data:', {
        photoId: createdPhoto.id,
        updateData: { front_nobgr_image_url: result.processedImageUrl }
      });
      
      const updatedPhoto = await photoService.updatePhoto(createdPhoto.id, {
        front_nobgr_image_url: result.processedImageUrl // Store background-removed image for debugging
      });
      
      console.log('✅ Photo record updated with background-removed image URL:', updatedPhoto);
      console.log('🔍 Updated photo front_nobgr_image_url:', updatedPhoto.front_nobgr_image_url);
      
      // Verify the update actually worked by fetching the record again
      console.log('🔍 Verifying update by re-fetching photo...');
      const verifiedPhoto = await photoService.getPhotoById(createdPhoto.id);
      console.log('🔍 Verified photo after update:', {
        id: verifiedPhoto.id,
        front_nobgr_image_url: verifiedPhoto.front_nobgr_image_url
      });
      
    } catch (updateError) {
      console.error('❌ Failed to update photo record:', updateError);
      console.error('❌ Update error details:', {
        photoId: createdPhoto.id,
        processedImageUrl: result.processedImageUrl,
        error: updateError instanceof Error ? updateError.message : 'Unknown error',
        stack: updateError instanceof Error ? updateError.stack : undefined
      });
      // Continue with the process even if the update fails
      console.log('⚠️ Continuing with model generation despite update failure...');
    }
    
    // Step 5: Prepare the model data for Hunyuan3D API
    console.log('🚀 Step 5: Sending request to Hunyuan3D API...');
      
    // Import the Hunyuan3D client

      
      // Create form data with the processed image
      const formData = new FormData();
      formData.append('front', processedFile);
      
      // Add other views if available
      if (currentPhotoSet.back) formData.append('back', currentPhotoSet.back);
      if (currentPhotoSet.left) formData.append('left', currentPhotoSet.left);
      if (currentPhotoSet.right) formData.append('right', currentPhotoSet.right);
      
      // Add generation options
      const options = {
        enable_pbr: true,  // Enable PBR materials for better quality
        should_remesh: true,  // Enable remeshing for better geometry
        should_texture: true  // Enable texture generation
      };
      formData.append('options', JSON.stringify(options));
      
      // Update model status to show we're starting the API request
      const updateModelStatus = (status: 'processing' | 'complete' | 'failed', stage?: ProcessingStage) => {
        setModels(prev =>
          prev.map(model =>
            model.id === selectedModel.id 
              ? { 
                  ...model, 
                  status,
                  processingStage: stage,
                  photoSet: { ...model.photoSet, front: processedFile },
                  thumbnail: result.originalImageUrl,
                } 
              : model
          )
        );
        setSelectedModel(prev => 
          prev?.id === selectedModel.id 
            ? { 
                ...prev, 
                status,
                processingStage: stage,
                photoSet: { ...prev.photoSet, front: processedFile },
                thumbnail: result.originalImageUrl,
              } 
            : prev
        );
      };
      
      // Update status to show we're starting the model generation
      updateModelStatus('processing', 'processing');
      
      // Update the existing photo record with background removal results
      console.log('🔄 Updating photo record with background removal results...');
      await photoService.updatePhoto(createdPhoto.id, {
        front_image_url: result.originalImageUrl, // Store original image URL from R2
        front_nobgr_image_url: result.processedImageUrl // Store background-removed image for debugging
      });
      console.log('✅ Photo record updated with original and background-removed image URLs');
      
      // Call the local API to create a new job (matches external API format)
      const jobFormData = new FormData();
      jobFormData.append('photoId', createdPhoto.id); // Internal use only
      jobFormData.append('front', processedFile); // Matches external API
      
      // Add optional views if provided (matches external API field names)
      if (currentPhotoSet.back) jobFormData.append('back', currentPhotoSet.back);
      if (currentPhotoSet.left) jobFormData.append('left', currentPhotoSet.left);
      if (currentPhotoSet.right) jobFormData.append('right', currentPhotoSet.right);
      
      // Add generation options
      jobFormData.append('options', JSON.stringify({
        enable_pbr: true,
        should_remesh: true,
        should_texture: true
      }));
      
      const response = await fetch('/api/generate', {
        method: 'POST',
        body: jobFormData,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Job creation failed');
      }
      
      const jobResponse = await response.json();
      
      console.log('🎉 Model generation job created:', jobResponse);
      
      // Update photo record with the job ID (already done by API endpoint)
      // No need to update again since API endpoint handles this
      
      // Update the model with the job ID and status
      const updatedModel: ModelData = { 
        ...selectedModel, 
        id: jobId, // Ensure we have the correct ID
        jobId: jobResponse.job_id, // External API uses job_id
        status: 'processing',
        processingStage: 'processing',
        photoSet: { ...selectedModel.photoSet, front: processedFile },
        thumbnail: result.originalImageUrl, // Use original image URL from R2
        uploadedAt: new Date()
      };
      
      // Update models state with the updated model
      setModels(prev =>
        prev.map(model =>
          model.id === selectedModel.id ? updatedModel : model
        )
      );
      
      // Update selected model
      setSelectedModel(updatedModel);
      
      console.log('✅ Model generation started! The page will automatically update when complete.');
      
      // The job status will be checked on page load or when the user returns to the page
      
      // Continue with the rest of the processing stages
      simulateProcessing(selectedModel.id, true); // Pass true to indicate background removal is done
      
      // Check status for this photo periodically
      checkJobStatusForPhoto(createdPhoto.id, jobResponse.job_id);
      
    } catch (error) {
      console.error('❌ Error during model generation:', error);
      console.error('❌ Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        error: error
      });
      
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

  // Function to check job status for a specific photo
  const checkJobStatusForPhoto = async (photoId: string, jobId: string) => {
    try {
      const response = await fetch(`/api/status?job_id=${encodeURIComponent(jobId)}`);
      if (!response.ok) {
        console.error('Failed to check job status:', response.statusText);
        return;
      }
      
      const statusData = await response.json();
      console.log(`Job ${jobId} status:`, statusData);
      
      // Update photo record in database
      if (statusData.status === 'completed' && statusData.model_urls?.glb) {
        await photoService.updatePhoto(photoId, {
          generation_status: 'completed', // Use the actual database enum value
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
    }
  };
  
  // Function to check status for all processing photos
  const checkAllProcessingPhotos = async () => {
    try {
      const processingPhotos = await photoService.getPhotosByStatus('processing');
      
      for (const photo of processingPhotos) {
        if (photo.job_id) {
          await checkJobStatusForPhoto(photo.id, photo.job_id);
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
  
  // Check status when selected model changes (when user selects a photo)
  useEffect(() => {
    if (selectedModel?.jobId && selectedModel.status === 'processing') {
      // Find the photo ID for this model
      const photoId = models.find(m => m.id === selectedModel.id)?.id;
      if (photoId) {
        checkJobStatusForPhoto(photoId, selectedModel.jobId);
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
          <h1 className="text-2xl font-bold text-gray-900">3D Model Generator</h1>
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
            <FileUpload onUpload={(file) => handleUpload(file, "front")} disabled={false} />
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
                    photoSet={currentPhotoSet}
                    onUpload={handleUpload}
                    onRemove={handleRemovePhoto}
                    disabled={false}
                    onGenerate={handleGenerateModel}
                    canGenerate={canGenerate}
                    isGenerating={isGenerating}
                    processingStage={selectedModel.processingStage}
                    modelUrl={selectedModel.modelUrl}
                    selectedModel={selectedModel}
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
