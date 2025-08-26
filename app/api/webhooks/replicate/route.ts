import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { PredictionStatus } from '@/lib/firtoz-trellis/service';
import crypto from 'crypto';
import { r2Service } from '@/lib/r2';
import { mapReplicateStatus } from '@/lib/utils/mapReplicateStatus';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Verify HMAC signature
    const secret = process.env.REPLICATE_WEBHOOK_SECRET;
    if (!secret) {
      return NextResponse.json(
        { error: 'REPLICATE_WEBHOOK_SECRET not configured' },
        { status: 500 }
      );
    }

    const body = await request.text();
    const signature = request.headers.get('X-Signature') || '';
    const computedSignature = crypto
      .createHmac('sha256', secret)
      .update(body)
      .digest('hex');
    
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(computedSignature))) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // Parse and validate payload
    const payload = JSON.parse(body);
    const { id, status, output, error } = payload;
    
    if (!id || !status) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    // Map Replicate status to internal status
    const internalStatus = mapReplicateStatus(status) as PredictionStatus;
    
    // Store model file in R2 if available
    let storedModelUrl = null;
    if (output?.model_file) {
      try {
        // Download model from Replicate
        const response = await fetch(output.model_file);
        const buffer = await response.arrayBuffer();
        
        // Upload to our R2 storage
        const fileName = output.model_file.split('/').pop() || 'model.glb';
        const result = await r2Service.uploadModel(
          Buffer.from(buffer),
          fileName
        );
        
        storedModelUrl = result.url;
      } catch (error) {
        console.error('Failed to store model file:', error);
        storedModelUrl = output.model_file; // Fallback to original URL
      }
    }

    // Update job status in database
    const { data, error: dbError } = await supabaseServer
      .from('jobs')
      .update({
        api_status: internalStatus,
        ...(storedModelUrl && { model_url: storedModelUrl }),
        ...(error && { error_message: error }),
        updated_at: new Date().toISOString()
      })
      .eq('external_job_id', id);
    
    if (dbError) {
      throw dbError;
    }

    // Find and update linked model
    const job = data?.[0] as { id: string } | undefined;
    if (job) {
        const { data: modelData, error: modelError } = await supabaseServer
          .from('models')
          .update({
            model_status: status === 'succeeded' ? 'completed' : 'failed',
            ...(storedModelUrl && { model_url: storedModelUrl })
          })
          .eq('job_id', job.id);
      
      if (modelError) {
        console.error('Model update error:', modelError);
      }
    }
    
    if (dbError) {
      throw dbError;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
