import { NextRequest, NextResponse } from 'next/server';
import { photoService, jobService } from '@/lib/supabase';

/**
 * 3D Model Generation endpoint
 * POST /api/generate
 * 
 * Proxies requests to external Hunyuan3D API with exact same format
 */
export async function POST(request: NextRequest) {
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
    const photo = await photoService.getPhotoById(photoId);
    console.log('✅ Found photo:', { id: photo.id, user_id: photo.user_id });
    
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
      user_id: photo.user_id,
      photo_id: photoId,
      api_status: response.status,
      api_stage: 'queued',
      progress: 0
    });
    const job = await jobService.createJob({
      external_job_id: response.job_id,
      user_id: photo.user_id,
      photo_id: photoId,
      api_status: response.status,
      api_stage: 'queued',
      progress: 0
    });
    console.log('✅ Job created successfully:', { id: job.id, external_job_id: job.external_job_id });
    
    // Update photo record with job ID and set status to processing
    await photoService.updatePhoto(photoId, {
      job_id: response.job_id,
      generation_status: 'processing'
    });
    
    // Return response in exact same format as external API
    return NextResponse.json({
      job_id: response.job_id,
      status: response.status
    }, { status: 200 });
    
  } catch (error) {
    console.error('❌ Model generation error in API route:', error);
    console.error('❌ Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : 'Unknown',
      error: error
    });
    
    return NextResponse.json(
      { detail: error instanceof Error ? error.message : 'Model generation failed' },
      { status: 500 }
    );
  }
}
