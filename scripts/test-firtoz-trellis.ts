import { FirtozTrellisService } from '../lib/firtoz-trellis/service';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function testFirtozTrellisService() {
  const service = new FirtozTrellisService();
  
  console.log("Testing Firtoz-Trellis service...");
  
  try {
    // Test creating a prediction
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
      },
      `https://example.com/webhook` // Replace with your webhook URL
    );
    
    console.log("✅ Prediction created successfully. ID:", predictionId);
    
    // Test getting prediction status
    const prediction = await service.getPredictionStatus(predictionId);
    console.log("✅ Prediction status:", prediction.status);
    
    if (prediction.output) {
      console.log("✅ Model file URL:", prediction.output.model_file);
    }
    
    return prediction;
  } catch (error) {
    console.error("❌ Test failed:", error);
    process.exit(1);
  }
}

testFirtozTrellisService();
