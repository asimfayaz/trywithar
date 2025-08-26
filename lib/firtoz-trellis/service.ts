import Replicate from "replicate";

export type FirtozTrellisInput = {
  images: string[]; // Array of image URLs
  texture_size?: number; // Texture size (default 2048)
  mesh_simplify?: number; // Mesh simplification ratio (0-1)
  generate_model?: boolean; // Whether to generate GLB model
  save_gaussian_ply?: boolean; // Whether to save Gaussian PLY
  ss_sampling_steps?: number; // Sampling steps
};

export type PredictionStatus = "starting" | "processing" | "succeeded" | "failed" | "canceled";

export type FirtozTrellisOutput = {
  id: string;
  status: PredictionStatus;
  output?: {
    model_file: string; // URL to generated GLB
  };
  error?: string;
};

export class FirtozTrellisService {
  private replicate: Replicate;
  private modelVersion = "e8f6c45206993f297372f5436b90350817bd9b4a0d52d2a76df50c1c8afa2b3c";

  constructor() {
    this.replicate = new Replicate({
      auth: process.env.REPLICATE_API_TOKEN,
    });
  }

  async createPrediction(input: FirtozTrellisInput): Promise<string> {
    const options: any = {
      version: this.modelVersion,
      input
    };
    
    // Set webhook for development/production only
    if (process.env.NODE_ENV !== 'test') {
      if (process.env.NODE_ENV === 'production') {
        options.webhook = `${process.env.NEXT_PUBLIC_BASE_URL}/api/webhooks/replicate`;
      } else {
        try {
          const response = await fetch('http://localhost:4040/api/tunnels');
          const data = await response.json();
          options.webhook = `${data.tunnels[0].public_url}/api/webhooks/replicate`;
        } catch (error) {
          console.warn("Tunnel not active. Skipping webhook for development test.");
        }
      }
      // Only set events filter if webhook is provided
      if (options.webhook) {
        options.webhook_events_filter = ["completed"];
      }
    }
    
    return this.replicate.predictions.create(options).then(prediction => prediction.id);
  }

  async getPredictionStatus(id: string): Promise<FirtozTrellisOutput> {
    console.log(`Calling Replicate API for prediction: ${id}`);
    try {
      const prediction = await this.replicate.predictions.get(id);
      console.log(`Replicate response for ${id}:`, {
        status: prediction.status,
        output: prediction.output,
        error: prediction.error
      });
      
      // Handle expired successful jobs (output cleared after 1 hour)
      if (prediction.status === 'succeeded' && prediction.output === null) {
        return {
          id: prediction.id,
          status: 'failed' as PredictionStatus,
          error: 'Prediction output expired (older than 1 hour)'
        };
      }
      
      return {
        id: prediction.id,
        status: prediction.status as PredictionStatus,
        output: prediction.output,
        error: prediction.error ? String(prediction.error) : undefined
      };
    } catch (error: any) {
      console.error(`Replicate API error for ${id}:`, error);
      // Properly access the nested response status
      const status = error?.response?.status || error?.status;
      
      if (status === 404) {
        return {
          id,
          status: 'failed' as PredictionStatus,
          error: 'Prediction expired or not found on Replicate'
        };
      }
      throw error;
    }
  }
}
