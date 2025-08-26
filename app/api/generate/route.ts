// HUNYUAN3D_START: Preserved for potential future use (see git history)
// HUNYUAN3D_END

import { NextRequest, NextResponse } from 'next/server';
import { jobService } from '@/lib/supabase';
import { ModelService } from '@/lib/supabase/model.service';
import { supabaseServer } from '@/lib/supabase-server';
import { FirtozTrellisService } from '@/lib/firtoz-trellis/service';

const modelService = new ModelService();
const firtozService = new FirtozTrellisService();

/**
 * 3D Model Generation endpoint
 * POST /api/generate
 * 
 * Uses Firtoz-Trellis API for 3D model generation
 */
export async function POST(request: NextRequest) {
  // Declare variables that need to be accessed in try and catch blocks
  let originalCredits: number | undefined;
  let model: any = null;
  
  try {
    // Parse form data
    const formData = await request.formData();
    
    // Get model ID from form data (internal use only)
    const modelId = formData.get('modelId') as string;
    if (!modelId) {
      return NextResponse.json(
        { detail: 'Model ID is required' },
        { status: 400 }
      );
    }
    
    // Get image URLs - Firtoz-Trellis expects multiple images
    const imageUrls: string[] = [];
    const frontUrl = formData.get('frontUrl') as string;
    if (!frontUrl) {
      return NextResponse.json(
        { detail: 'Front view image URL is required' },
        { status: 400 }
      );
    }
    imageUrls.push(frontUrl);
    
    // Add optional images
    const backUrl = formData.get('backUrl') as string | null;
    if (backUrl) imageUrls.push(backUrl);
    const leftUrl = formData.get('leftUrl') as string | null;
    if (leftUrl) imageUrls.push(leftUrl);
    const rightUrl = formData.get('rightUrl') as string | null;
    if (rightUrl) imageUrls.push(rightUrl);
    
    // Parse options
    const options = formData.get('options') as string | null;
    let textureSize: number | undefined;
    let meshSimplify: number | undefined;
    
    if (options) {
      try {
        const opts = JSON.parse(options);
        textureSize = opts.texture_size;
        meshSimplify = opts.mesh_simplify;
      } catch (error) {
        console.error('Failed to parse options:', error);
      }
    }
    
    // Get model record to get user_id
    console.log('🔍 Looking up model with ID:', modelId);
    model = await modelService.getModel(modelId);
    console.log('✅ Found model:', { id: model.id, user_id: model.user_id });
    
    // Check user credits before proceeding
    console.log('🔍 Checking user credits for user:', model.user_id);
    let userBilling = null;
    let billingError: any = null;
    
    try {
      // First try to fetch existing billing record
      const { data, error } = await supabaseServer
        .from('user_billing')
        .select('credits, total_models_generated')
        .eq('id', model.user_id)
        .single();
      
      if (error) throw error;
      userBilling = data;
    } catch (error: any) {
      if (error?.code === 'PGRST116') {
        console.log('ℹ️ No billing record found, creating one with default credits');
        
        // Create new billing record with default credits
        const { data: newBilling, error: createError } = await supabaseServer
          .from('user_billing')
          .insert([{ 
            id: model.user_id, 
            credits: 2,
            total_models_generated: 0 
          }])
          .select('credits, total_models_generated')
          .single();
          
        if (createError) {
          console.error('❌ Failed to create user billing record:', createError.message);
          return NextResponse.json(
            { detail: 'Failed to create user billing record' },
            { status: 500 }
          );
        }
        userBilling = newBilling;
      } else {
        billingError = error;
      }
    }
    
    if (billingError || !userBilling) {
      const errorMessage = billingError?.message || 'No data returned';
      console.error('❌ Failed to fetch user credits:', errorMessage);
      return NextResponse.json(
        { detail: `Failed to fetch user credits: ${errorMessage}` },
        { status: 500 }
      );
    }
    
    if (userBilling.credits < 1) {
      console.error('❌ Insufficient credits:', { credits: userBilling.credits });
      return NextResponse.json(
        { detail: 'Insufficient credits to start generation' },
        { status: 402 }
      );
    }
    
    // Deduct 1 credit for this generation
    console.log('💳 Deducting 1 credit from user:', model.user_id);
    const { error: deductError } = await supabaseServer
      .from('user_billing')
      .update({ credits: userBilling.credits - 1 })
      .eq('id', model.user_id);
    
    if (deductError) {
      console.error('❌ Failed to deduct credits:', deductError.message);
      return NextResponse.json(
        { detail: 'Failed to deduct credits' },
        { status: 500 }
      );
    }
    
    // Store original credits for potential rollback
    originalCredits = userBilling.credits;
    
    // Prepare Firtoz-Trellis input
    const input = {
      images: imageUrls,
      texture_size: textureSize,
      mesh_simplify: meshSimplify,
      generate_model: true,
      save_gaussian_ply: false,
      ss_sampling_steps: 38
    };
    
    // Call Firtoz-Trellis service
    console.log('🚀 Starting Firtoz-Trellis prediction');
    const predictionId = await firtozService.createPrediction(input);
    console.log('✅ Prediction created with ID:', predictionId);
    
    // Create job record to track the generation process
    console.log('📝 Creating job record with data:', {
      external_job_id: predictionId,
      user_id: model.user_id,
      api_status: 'queued',
      api_stage: 'queued',
      progress: 0
    });
    const job = await jobService.createJob({
      external_job_id: predictionId,
      user_id: model.user_id,
      api_status: 'queued',
      api_stage: 'queued',
      progress: 0,
      expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString() // 1 hour expiration
    } as any);
    console.log('✅ Job created successfully:', { id: job.id, external_job_id: job.external_job_id });
    
    // Update model record with INTERNAL job ID and set status to generating
    await modelService.updateModel(modelId, {
      job_id: job.id,  // Using internal job UUID
      model_status: 'generating_3d_model'
    });
    
    // On success, increment total models generated
    console.log('📈 Incrementing total models generated for user:', model.user_id);
    await supabaseServer
      .from('user_billing')
      .update({ total_models_generated: userBilling.total_models_generated + 1 })
      .eq('id', model.user_id);
    
    return NextResponse.json({
      job_id: predictionId,
      status: 'queued'
    }, { status: 200 });
    
  } catch (error) {
    // Refund credit if deduction occurred and generation failed
    if (typeof originalCredits !== 'undefined' && model) {
      console.log('🔄 Refunding credit due to generation failure');
      await supabaseServer
        .from('user_billing')
        .update({ credits: originalCredits })
        .eq('id', model.user_id);
    }
    
    // Enhanced error logging
    console.error('❌ Model generation error in API route:', error);
    
    if (error instanceof Error) {
      console.error('❌ Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
    } else {
      console.error('❌ Non-Error object:', JSON.stringify(error));
    }
    
    // Log environment configuration for debugging
    console.error('⚠️ Environment configuration:', {
      NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL,
      REPLICATE_API_TOKEN: process.env.REPLICATE_API_TOKEN ? '***' : 'MISSING',
      SUPABASE_URL: process.env.SUPABASE_URL,
      NODE_ENV: process.env.NODE_ENV
    });
    
    // Log user billing information if available
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
    
    return NextResponse.json(
      { detail: error instanceof Error ? error.message : 'Model generation failed' },
      { status: 500 }
    );
  }
}
