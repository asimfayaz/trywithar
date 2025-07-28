import { NextRequest, NextResponse } from 'next/server';
import { r2Service } from '@/lib/r2';
import { photoService } from '@/lib/supabase';

/**
 * Download Model endpoint
 * POST /api/download-model
 * 
 * Downloads a completed 3D model from Hunyuan3D and uploads it to R2 storage
 * Body: { photoId: string, modelUrl: string }
 */
export async function POST(request: NextRequest) {
  try {
    const { photoId, modelUrl } = await request.json();
    
    if (!photoId || !modelUrl) {
      return NextResponse.json(
        { error: 'Missing required fields', message: 'photoId and modelUrl are required' },
        { status: 400 }
      );
    }

    console.log(`📥 Downloading model for photo ${photoId} from ${modelUrl}`);

    // Download the model file from Hunyuan3D
    const modelResponse = await fetch(modelUrl);
    if (!modelResponse.ok) {
      console.error(`Failed to download model: ${modelResponse.status} ${modelResponse.statusText}`);
      return NextResponse.json(
        { error: 'Model download failed', message: `Failed to download model: ${modelResponse.statusText}` },
        { status: 500 }
      );
    }

    // Convert response to buffer
    const modelBuffer = Buffer.from(await modelResponse.arrayBuffer());
    console.log(`📦 Downloaded model file, size: ${modelBuffer.length} bytes`);

    // Generate a filename for the model
    const filename = `model-${photoId}.glb`;

    // Upload to R2 storage
    console.log(`☁️ Uploading model to R2 storage...`);
    const uploadResult = await r2Service.uploadModel(modelBuffer, filename);
    console.log(`✅ Model uploaded to R2: ${uploadResult.url}`);

    // Update the photo record with the permanent R2 URL
    await photoService.updatePhoto(photoId, {
      model_url: uploadResult.url,
      generation_status: 'completed'
    });

    console.log(`💾 Updated photo record with permanent model URL`);

    return NextResponse.json({
      success: true,
      modelUrl: uploadResult.url,
      key: uploadResult.key
    }, { status: 200 });

  } catch (error) {
    console.error('Error downloading and uploading model:', error);
    return NextResponse.json(
      { 
        error: 'Model processing failed', 
        message: (error as Error).message,
        stack: (error as Error).stack 
      },
      { status: 500 }
    );
  }
}
