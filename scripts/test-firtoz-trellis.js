import dotenv from 'dotenv';
import { FirtozTrellisService } from '../lib/firtoz-trellis/service.ts';

dotenv.config();

async function testFirtozTrellis() {
  try {
    console.log('Starting Firtoz-Trellis integration test...');
    
    const service = new FirtozTrellisService();
    console.log('Service initialized');
    
    // Test prediction creation
    console.log('Creating test prediction...');
    const input = {
      images: [
        'https://replicate.delivery/pbxt/MJaYRxQMgIzPsALScNadsZFCXR2h1n97xBzhRinmUQw9aw25/ephemeros_a_dune_sandworm_with_black_background_de398ce7-2276-4634-8f1d-c4ed2423cda4.png'
      ],
      texture_size: 2048,
      mesh_simplify: 0.9,
      generate_model: true,
      save_gaussian_ply: true,
      ss_sampling_steps: 38
    };
    
    const predictionId = await service.createPrediction(input);
    console.log(`✅ Prediction created with ID: ${predictionId}`);
    
    // Test getting prediction status
    console.log('Checking prediction status...');
    const status = await service.getPredictionStatus(predictionId);
    console.log('Prediction status:', status);
    
    console.log('✅ Integration test completed successfully');
  } catch (error) {
    console.error('❌ Integration test failed:');
    console.error(error);
    process.exit(1);
  }
}

testFirtozTrellis();
