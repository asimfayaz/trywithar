import { NextRequest, NextResponse } from 'next/server';
import { jobService } from '@/lib/supabase';
import { ModelService } from '@/lib/supabase/model.service';
import { supabaseServer } from '@/lib/supabase-server';

const modelService = new ModelService();

/**
 * 3D Model Generation endpoint
 * POST /api/generate
 * 
 * Proxies requests to external Hunyuan3D API with exact same format
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
    
    // Get front image (required) - matches external API
    const front = formData.get('front') as File;
    if (!front) {
      return NextResponse.json(
        { detail: 'Front view image is required' },
        { status: 400 }
      );
    }
    
    // Get optional views - matches external API field names
    const back = formData.get('back') as File | null;
    const left = formData.get('left') as File | null;
    const right = formData.get('right') as File | null;
    const options = formData.get('options') as string | null;
    
    // Create new form data for external API (without photoId)
    const externalFormData = new FormData();
    externalFormData.append('front', front);
    if (back) externalFormData.append('back', back);
    if (left) externalFormData.append('left', left);
    if (right) externalFormData.append('right', right);
    if (options) externalFormData.append('options', options);
    
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
      if (error?.code === 'PGRST116') { // No rows found error code
        console.log('ℹ️ No billing record found, creating one with default credits');
        
        // Create new billing record with default credits
    const { data: newBilling, error: createError } = await supabaseServer
      .from('user_billing')
      .insert([{ 
        id: model.user_id, 
        credits: 2, // Default credits
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
    
    // Call external Hunyuan3D API directly
    const externalApiUrl = process.env.HUNYUAN3D_API_URL || 'https://asimfayaz-hunyuan3d-2-1.hf.space';
    const apiKey = process.env.HUNYUAN3D_API_KEY;
    
    // Prepare headers
    const headers: HeadersInit = {};
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }
    
    const apiResponse = await fetch(`${externalApiUrl}/api/generate`, {
      method: 'POST',
      headers,
      body: externalFormData,
    });
    
    if (!apiResponse.ok) {
      const errorData: any = await apiResponse.json();
      throw new Error(errorData.detail || errorData.message || 'External API call failed');
    }
    
    const response = await apiResponse.json();
    
    // Create job record to track the generation process
    console.log('📝 Creating job record with data:', {
      external_job_id: response.job_id,
      user_id: model.user_id,
      api_status: response.status,
      api_stage: 'queued',
      progress: 0
    });
    const job = await jobService.createJob({
      external_job_id: response.job_id,
      user_id: model.user_id,
      api_status: response.status,
      api_stage: 'queued',
      progress: 0
    });
    console.log('✅ Job created successfully:', { id: job.id, external_job_id: job.external_job_id });
    
    // Update model record with job ID and set status to generating
    await modelService.updateModel(modelId, {
      job_id: response.job_id,
      model_status: 'generating_3d_model'
    });
    
    // On success, increment total models generated
    console.log('📈 Incrementing total models generated for user:', model.user_id);
    await supabaseServer
      .from('user_billing')
      .update({ total_models_generated: userBilling.total_models_generated + 1 })
      .eq('id', model.user_id);
    
    return NextResponse.json({
      job_id: response.job_id,
      status: response.status
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
    
    // Enhanced error logging with Supabase and environment details
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
      HUNYUAN3D_API_URL: process.env.HUNYUAN3D_API_URL,
      HUNYUAN3D_API_KEY: process.env.HUNYUAN3D_API_KEY ? '***' : 'MISSING',
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
