import getConfig from 'next/config';
import type { NextConfig } from 'next';

/**
 * Centralized configuration module with validation
 * Provides safe access to runtime environment variables
 */

// Extend NextConfig to include our custom runtime configuration
interface AppRuntimeConfig extends NextConfig {
  publicRuntimeConfig: {
    NEXT_PUBLIC_R2_PUBLIC_PHOTOS_URL: string;
    NEXT_PUBLIC_R2_PUBLIC_MODELS_URL: string;
    NEXT_PUBLIC_SUPABASE_URL: string;
    NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
    NEXT_PUBLIC_HUNYUAN3D_API_URL: string;
  };
  serverRuntimeConfig: {
    R2_ACCOUNT_ID: string;
    R2_ACCESS_KEY_ID: string;
    R2_SECRET_ACCESS_KEY: string;
    R2_PHOTOS_BUCKET: string;
    R2_MODELS_BUCKET: string;
    SUPABASE_URL: string;
    SUPABASE_ANON_KEY: string;
    HUNYUAN3D_API_URL: string;
  };
}

// Initialize with safe defaults
let publicRuntimeConfig: AppRuntimeConfig['publicRuntimeConfig'] = {
  NEXT_PUBLIC_R2_PUBLIC_PHOTOS_URL: '',
  NEXT_PUBLIC_R2_PUBLIC_MODELS_URL: '',
  NEXT_PUBLIC_SUPABASE_URL: '',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: '',
  NEXT_PUBLIC_HUNYUAN3D_API_URL: '',
};

let serverRuntimeConfig: AppRuntimeConfig['serverRuntimeConfig'] = {
  R2_ACCOUNT_ID: '',
  R2_ACCESS_KEY_ID: '',
  R2_SECRET_ACCESS_KEY: '',
  R2_PHOTOS_BUCKET: '',
  R2_MODELS_BUCKET: '',
  SUPABASE_URL: '',
  SUPABASE_ANON_KEY: '',
  HUNYUAN3D_API_URL: '',
};

// Only attempt to get runtime config if we're on the server side
if (typeof window === 'undefined') {
  try {
    const config = getConfig() as AppRuntimeConfig;
    publicRuntimeConfig = config.publicRuntimeConfig;
    serverRuntimeConfig = config.serverRuntimeConfig;
  } catch (error) {
    console.error('Failed to load runtime configuration:', error);
  }
} else {
  // Client-side fallback - use environment variables directly
  publicRuntimeConfig = {
    NEXT_PUBLIC_R2_PUBLIC_PHOTOS_URL: process.env.NEXT_PUBLIC_R2_PUBLIC_PHOTOS_URL || '',
    NEXT_PUBLIC_R2_PUBLIC_MODELS_URL: process.env.NEXT_PUBLIC_R2_PUBLIC_MODELS_URL || '',
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    NEXT_PUBLIC_HUNYUAN3D_API_URL: process.env.NEXT_PUBLIC_HUNYUAN3D_API_URL || '',
  };
}

// Validate server configuration on startup
function validateServerConfig() {
  const requiredServerVars: (keyof AppRuntimeConfig['serverRuntimeConfig'])[] = [
    'R2_ACCOUNT_ID',
    'R2_ACCESS_KEY_ID',
    'R2_SECRET_ACCESS_KEY',
    'R2_PHOTOS_BUCKET',
    'R2_MODELS_BUCKET',
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'HUNYUAN3D_API_URL'
  ];
  
  for (const varName of requiredServerVars) {
    if (!serverRuntimeConfig[varName]) {
      throw new Error(`Missing required server environment variable: ${varName}`);
    }
  }
}

// Validate client configuration on startup
function validateClientConfig() {
  const requiredClientVars: (keyof AppRuntimeConfig['publicRuntimeConfig'])[] = [
    'NEXT_PUBLIC_R2_PUBLIC_PHOTOS_URL',
    'NEXT_PUBLIC_R2_PUBLIC_MODELS_URL',
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'NEXT_PUBLIC_HUNYUAN3D_API_URL'
  ];
  
  for (const varName of requiredClientVars) {
    if (!publicRuntimeConfig[varName]) {
      throw new Error(`Missing required client environment variable: ${varName}`);
    }
  }
}

// Perform validation on module load (server-side only)
if (typeof window === 'undefined') {
  validateServerConfig();
  validateClientConfig();
}

// Export validated configuration
export const config = {
  server: serverRuntimeConfig,
  client: publicRuntimeConfig
};

// Helper function for server-side access
export function getServerConfig<T extends keyof AppRuntimeConfig['serverRuntimeConfig']>(
  key: T
): AppRuntimeConfig['serverRuntimeConfig'][T] {
  return serverRuntimeConfig[key];
}

// Helper function for client-side access
export function getClientConfig<T extends keyof AppRuntimeConfig['publicRuntimeConfig']>(
  key: T
): AppRuntimeConfig['publicRuntimeConfig'][T] {
  return publicRuntimeConfig[key];
}
