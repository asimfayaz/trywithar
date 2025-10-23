import { NextRequest, NextResponse } from 'next/server';
import { jobService } from '@/lib/supabase';
import { ModelService } from '@/lib/supabase/model.service';
import { supabaseServer } from '@/lib/supabase-server';
import { FirtozTrellisService } from '@/lib/firtoz-trellis/service';

// Initialize services
const modelService = new ModelService();
const firtozService = new FirtozTrellisService();

/**
 * 3D Model Generation API Endpoint
 * 
 * POST /api/generate
 * 
 * This endpoint handles the complete workflow for generating 3D models:
 * 1. Validates input parameters
 * 2. Checks and deducts user credits
 * 3. Initiates 3D model generation via Firtoz-Trellis API
 * 4. Creates job tracking record
 * 5. Logs transaction and updates statistics
 */
export async function POST(request: NextRequest) {
  let model: any = null;
  let userBilling: any = null;
  
  try {
    // ==================== STEP 1: Parse and Validate Input ====================
    const { modelId, imageUrls, textureSize, meshSimplify } = await parseAndValidateInput(request);
    
    // ==================== STEP 2: Get Model and User Info ====================
    model = await getModelById(modelId);
    
    // ==================== STEP 3: Credit Management ====================
    userBilling = await getUserBillingOrCreate(model.user_id);
    await validateSufficientCredits(userBilling);
    
    // Deduct one credit (will be refunded on error)
    await deductCredit(model.user_id, userBilling.credits);
    
    // ==================== STEP 4: Log Transaction ====================
    await logCreditTransaction(request);
    
    // ==================== STEP 5: Start 3D Generation ====================
    const predictionId = await startFirtozGeneration(imageUrls, textureSize, meshSimplify);
    
    // ==================== STEP 6: Create Job Tracking ====================
    const job = await createJobRecord(predictionId, model.user_id);
    
    // ==================== STEP 7: Update Model Status ====================
    await updateModelWithJob(modelId, job.id);
    
    // ==================== STEP 8: Update Statistics ====================
    await incrementModelsGenerated(model.user_id, userBilling.total_models_generated);
    
    // ==================== SUCCESS RESPONSE ====================
    return NextResponse.json({
      job_id: job.id,
      status: 'queued'
    }, { status: 200 });
    
  } catch (error) {
    return handleGenerationError(error, model, userBilling);
  }
}

// ==================== HELPER FUNCTIONS ====================

/**
 * Parses form data and extracts all required parameters
 * Validates that required fields are present
 */
async function parseAndValidateInput(request: NextRequest) {
  const formData = await request.formData();
  
  // Extract and validate model ID
  const modelId = formData.get('modelId') as string;
  if (!modelId) {
    throw new ValidationError('Model ID is required');
  }
  
  // Extract and validate image URLs
  const frontUrl = formData.get('frontUrl') as string;
  if (!frontUrl) {
    throw new ValidationError('Front view image URL is required');
  }
  
  // Collect all provided image URLs
  const imageUrls: string[] = [frontUrl];
  const backUrl = formData.get('backUrl') as string | null;
  const leftUrl = formData.get('leftUrl') as string | null;
  const rightUrl = formData.get('rightUrl') as string | null;
  
  if (backUrl) imageUrls.push(backUrl);
  if (leftUrl) imageUrls.push(leftUrl);
  if (rightUrl) imageUrls.push(rightUrl);
  
  // Parse optional generation parameters
  const options = formData.get('options') as string | null;
  let textureSize: number | undefined;
  let meshSimplify: number | undefined;
  
  if (options) {
    try {
      const opts = JSON.parse(options);
      textureSize = opts.texture_size;
      meshSimplify = opts.mesh_simplify;
    } catch (error) {
      console.error('⚠️ Failed to parse options, using defaults:', error);
    }
  }
  
  return { modelId, imageUrls, textureSize, meshSimplify };
}

/**
 * Retrieves model record from database
 */
async function getModelById(modelId: string) {
  console.log('🔍 Looking up model with ID:', modelId);
  const model = await modelService.getModel(modelId);
  console.log('✅ Found model:', { id: model.id, user_id: model.user_id });
  return model;
}

/**
 * Gets user billing record or creates one with default credits if it doesn't exist
 */
async function getUserBillingOrCreate(userId: string) {
  console.log('🔍 Checking user credits for user:', userId);
  
  try {
    // Try to fetch existing billing record
    const { data, error } = await supabaseServer
      .from('user_billing')
      .select('credits, total_models_generated')
      .eq('id', userId)
      .single();
    
    if (error) throw error;
    return data;
    
  } catch (error: any) {
    // If no record exists, create one with default credits
    if (error?.code === 'PGRST116') {
      console.log('ℹ️ No billing record found, creating one with default credits');
      
      const { data: newBilling, error: createError } = await supabaseServer
        .from('user_billing')
        .insert([{ 
          id: userId, 
          credits: 2,
          total_models_generated: 0 
        }])
        .select('credits, total_models_generated')
        .single();
        
      if (createError) {
        throw new Error(`Failed to create user billing record: ${createError.message}`);
      }
      
      return newBilling;
    }
    
    // Re-throw any other errors
    throw new Error(`Failed to fetch user credits: ${error?.message || 'Unknown error'}`);
  }
}

/**
 * Validates that user has sufficient credits for generation
 */
async function validateSufficientCredits(userBilling: any) {
  if (userBilling.credits < 1) {
    console.error('❌ Insufficient credits:', { credits: userBilling.credits });
    throw new InsufficientCreditsError('Insufficient credits to start generation');
  }
}

/**
 * Deducts one credit from user's account
 */
async function deductCredit(userId: string, currentCredits: number) {
  console.log('💳 Deducting 1 credit from user:', userId);
  
  const { error } = await supabaseServer
    .from('user_billing')
    .update({ credits: currentCredits - 1 })
    .eq('id', userId);
  
  if (error) {
    throw new Error(`Failed to deduct credits: ${error.message}`);
  }
}

/**
 * Logs credit usage transaction for audit trail
 */
async function logCreditTransaction(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  const transactionHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  // Only add Authorization header if it exists and is valid
  if (authHeader && authHeader.startsWith('Bearer ')) {
    transactionHeaders['Authorization'] = authHeader;
  }
  
  const transactionResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/transactions`, {
    method: 'POST',
    headers: transactionHeaders,
    body: JSON.stringify({
      type: 'usage',
      amount: 0,
      credits: -1,
      description: "3D Model Generation"
    })
  });
  
  if (!transactionResponse.ok) {
    const errorData = await transactionResponse.json();
    throw new Error(`Failed to log transaction: ${errorData.error}`);
  }
}

/**
 * Initiates 3D model generation via Firtoz-Trellis API
 */
async function startFirtozGeneration(
  imageUrls: string[], 
  textureSize?: number, 
  meshSimplify?: number
) {
  const input = {
    images: imageUrls,
    texture_size: textureSize,
    mesh_simplify: meshSimplify,
    generate_model: true,
    save_gaussian_ply: false,
    ss_sampling_steps: 38
  };
  
  console.log('🚀 Starting Firtoz-Trellis prediction');
  const predictionId = await firtozService.createPrediction(input);
  console.log('✅ Prediction created with ID:', predictionId);
  
  return predictionId;
}

/**
 * Creates job record to track generation progress
 */
async function createJobRecord(predictionId: string, userId: string) {
  console.log('📝 Creating job record for prediction:', predictionId);
  
  const job = await jobService.createJob({
    external_job_id: predictionId,
    user_id: userId,
    api_status: 'queued',
    api_stage: 'queued',
    progress: 0,
    expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString() // 1 hour expiration
  } as any);
  
  console.log('✅ Job created successfully:', { id: job.id, external_job_id: job.external_job_id });
  return job;
}

/**
 * Updates model record with job ID and status
 */
async function updateModelWithJob(modelId: string, jobId: string) {
  await modelService.updateModel(modelId, {
    job_id: jobId,
    model_status: 'generating_3d_model'
  });
}

/**
 * Increments the total models generated counter for user statistics
 */
async function incrementModelsGenerated(userId: string, currentTotal: number) {
  console.log('📈 Incrementing total models generated for user:', userId);
  
  await supabaseServer
    .from('user_billing')
    .update({ total_models_generated: currentTotal + 1 })
    .eq('id', userId);
}

/**
 * Handles errors during generation process
 * Refunds credits if they were deducted
 * Updates model status to failed
 */
async function handleGenerationError(error: unknown, model: any, userBilling: any) {
  // Refund credit if deduction occurred
  if (userBilling && model) {
    console.log('🔄 Refunding credit due to generation failure');
    await supabaseServer
      .from('user_billing')
      .update({ credits: userBilling.credits })
      .eq('id', model.user_id);
  }
  
  // Log detailed error information
  console.error('❌ Model generation error in API route:', error);
  
  if (error instanceof Error) {
    console.error('❌ Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
  }
  
  // Log environment configuration for debugging
  console.error('⚠️ Environment configuration:', {
    NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL,
    REPLICATE_API_TOKEN: process.env.REPLICATE_API_TOKEN ? '***' : 'MISSING',
    SUPABASE_URL: process.env.SUPABASE_URL,
    NODE_ENV: process.env.NODE_ENV
  });
  
  // Log model information if available
  if (model) {
    console.error('ℹ️ Model information:', {
      id: model.id,
      user_id: model.user_id,
      model_status: model.model_status
    });
  }
  
  // Update model status to failed
  if (model) {
    try {
      await modelService.updateModel(model.id, {
        model_status: 'failed'
      });
      console.log('📝 Updated model status to failed');
    } catch (statusError) {
      console.error('❌ Failed to update model status:', statusError);
    }
  }
  
  // Return appropriate error response
  if (error instanceof InsufficientCreditsError) {
    return NextResponse.json(
      { detail: error.message },
      { status: 402 }
    );
  }
  
  if (error instanceof ValidationError) {
    return NextResponse.json(
      { detail: error.message },
      { status: 400 }
    );
  }
  
  return NextResponse.json(
    { detail: error instanceof Error ? error.message : 'Model generation failed' },
    { status: 500 }
  );
}

// ==================== CUSTOM ERROR CLASSES ====================

/**
 * Error for validation failures (400 Bad Request)
 */
class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Error for insufficient credits (402 Payment Required)
 */
class InsufficientCreditsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InsufficientCreditsError';
  }
}