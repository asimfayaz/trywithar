import { FirtozTrellisService } from '../lib/firtoz-trellis/service';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const WEBHOOK_URL = 'http://localhost:3000/api/webhooks/replicate';

async function testWebhook() {
  const service = new FirtozTrellisService();
  
  console.log("Testing webhook integration...");
  
  try {
    // Create prediction with webhook URL
    const predictionId = await service.createPrediction(
      {
        images: [
          'https://replicate.delivery/pbxt/MJaYRxQMgIzPsALScNadsZFCXR2h1n97xBzhRinmUQw9aw25/ephemeros_a_dune_sandworm_with_black_background_de398ce7-2276-4634-8f1d-c4ed2423cda4.png'
        ],
        texture_size: 2048,
        mesh_simplify: 0.9,
        generate_model: true,
        save_gaussian_ply: true,
        ss_sampling_steps: 38
      }
    );
    
    console.log("✅ Prediction created with webhook. ID:", predictionId);
    console.log("Webhook URL:", WEBHOOK_URL);
    console.log("Please check your server logs for incoming webhook requests");
    
  } catch (error) {
    console.error("❌ Webhook test failed:", error);
  }
}

testWebhook();
