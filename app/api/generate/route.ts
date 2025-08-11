import { NextRequest, NextResponse } from 'next/server';
import { photoService, jobService, supabase, type Photo } from '@/lib/supabase';

/**
 * 3D Model Generation endpoint
 * POST /api/generate
 * 
 * Proxies requests to external Hunyuan3D API with exact same format
 */
export async function POST(request: NextRequest) {
  // Declare variables that need to be accessed in try and catch blocks
  let originalCredits: number | undefined;
  let photo: Photo | null = null;
  
  try {
    // Parse form data
    const formData = await request.formData();
    
    // Get photo ID from form data (internal use only)
    const photoId = formData.get('photoId') as string;
    if (!photoId) {
      return NextResponse.json(
        { detail: 'Photo ID is required' },
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
    
    // Get photo record to get user_id
    console.log('🔍 Looking up photo with ID:', photoId);
    photo = await photoService.getPhotoById(photoId);
    console.log('✅ Found photo:', { id: photo.id, user_id: photo.user_id });
    
    // Check user credits before proceeding
    console.log('🔍 Checking user credits for user:', photo.user_id);
    const { data: userBilling, error: billingError } = await supabase
      .from('user_billing')
      .select('credits, total_models_generated')
      .eq('id', photo.user_id)
      .single();
    
    if (billingError || !userBilling) {
      console.error('❌ Failed to fetch user credits:', billingError?.message || 'No data returned');
      return NextResponse.json(
        { detail: 'Failed to fetch user credits' },
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
    console.log('💳 Deducting 1 credit from user:', photo.user_id);
    const { error: deductError } = await supabase
      .from('user_billing')
      .update({ credits: userBilling.credits - 1 })
      .eq('id', photo.user_id);
    
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
    
    // Get source photo ID if this is a generation job
    const sourcePhotoId = photo.source_photo_id || null;

    // Create job record to track the generation process
    console.log('📝 Creating job record with data:', {
      external_job_id: response.job_id,
      user_id: photo.user_id,
      photo_id: photoId,
      source_photo_id: sourcePhotoId,
      api_status: response.status,
      api_stage: 'queued',
      progress: 0
    });
    const job = await jobService.createJob({
      external_job_id: response.job_id,
      user_id: photo.user_id,
      photo_id: photoId,
      source_photo_id: sourcePhotoId,
      api_status: response.status,
      api_stage: 'queued',
      progress: 0
    });
    console.log('✅ Job created successfully:', { id: job.id, external_job_id: job.external_job_id });
    
    // Update photo record with job ID and set status to job_created
    await photoService.updatePhoto(photoId, {
      job_id: response.job_id,
      generation_status: 'job_created'
    });
    
    // On success, increment total models generated
    console.log('📈 Incrementing total models generated for user:', photo.user_id);
    await supabase
      .from('user_billing')
      .update({ total_models_generated: userBilling.total_models_generated + 1 })
      .eq('id', photo.user_id);

    // Update photo status to model_generated
    await photoService.updatePhoto(photoId, {
      generation_status: 'model_generated'
    });
    
    return NextResponse.json({
      job_id: response.job_id,
      status: response.status
    }, { status: 200 });
    
  } catch (error) {
    // Refund credit if deduction occurred and generation failed
    if (typeof originalCredits !== 'undefined' && photo) {
      console.log('🔄 Refunding credit due to generation failure');
      await supabase
        .from('user_billing')
        .update({ credits: originalCredits })
        .eq('id', photo.user_id);
    }
    
    console.error('❌ Model generation error in API route:', error);
    console.error('❌ Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : 'Unknown',
      error: error
    });
    
    // Update photo status to job_creation_failed or model_generation_failed
    if (photo) {
      try {
        // If we have a job ID, it means job creation succeeded but model generation failed
        if (photo.job_id) {
          await photoService.updatePhoto(photo.id, {
            generation_status: 'model_generation_failed'
          });
          console.log('📝 Updated photo status to model_generation_failed');
        } else {
          // Otherwise, job creation failed
          await photoService.updatePhoto(photo.id, {
            generation_status: 'job_creation_failed'
          });
          console.log('📝 Updated photo status to job_creation_failed');
        }
      } catch (statusError) {
        console.error('❌ Failed to update photo status:', statusError);
      }
    }
    
    return NextResponse.json(
      { detail: error instanceof Error ? error.message : 'Model generation failed' },
      { status: 500 }
    );
  }
}
