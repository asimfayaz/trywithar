/**
 * Centralized environment variable validation
 * Throws errors immediately if required variables are missing
 */

function getEnvVar(name: string, isPublic = false): string {
  let value: string | undefined;
  
  if (isPublic) {
    // First try public version (NEXT_PUBLIC_ prefix)
    value = process.env[`NEXT_PUBLIC_${name}`];
    
    // Fallback to non-prefixed version
    if (!value) value = process.env[name];
  } else {
    // Private variables use exact name
    value = process.env[name];
  }
  
  // Throw error if missing
  if (!value) {
    const varNames = isPublic 
      ? [`NEXT_PUBLIC_${name}`, name] 
      : [name];
      
    throw new Error(
      `Missing required environment variable: ${varNames.join(' or ')}\n` +
      'Please check your .env.local file and restart the server.'
    );
  }
  
  return value;
}

// Server-side environment variables
export const R2_ACCOUNT_ID = getEnvVar('R2_ACCOUNT_ID');
export const R2_ACCESS_KEY_ID = getEnvVar('R2_ACCESS_KEY_ID');
export const R2_SECRET_ACCESS_KEY = getEnvVar('R2_SECRET_ACCESS_KEY');
export const R2_PHOTOS_BUCKET = getEnvVar('R2_PHOTOS_BUCKET');
export const R2_MODELS_BUCKET = getEnvVar('R2_MODELS_BUCKET');

// Client-side environment variables
export const NEXT_PUBLIC_R2_ACCOUNT_ID = getEnvVar('NEXT_PUBLIC_R2_ACCOUNT_ID', true);
export const NEXT_PUBLIC_R2_ACCESS_KEY_ID = getEnvVar('NEXT_PUBLIC_R2_ACCESS_KEY_ID', true);
export const NEXT_PUBLIC_R2_SECRET_ACCESS_KEY = getEnvVar('NEXT_PUBLIC_R2_SECRET_ACCESS_KEY', true);
export const NEXT_PUBLIC_R2_PHOTOS_BUCKET = getEnvVar('NEXT_PUBLIC_R2_PHOTOS_BUCKET', true);
export const NEXT_PUBLIC_R2_MODELS_BUCKET = getEnvVar('NEXT_PUBLIC_R2_MODELS_BUCKET', true);
export const NEXT_PUBLIC_R2_PUBLIC_PHOTOS_URL = getEnvVar('NEXT_PUBLIC_R2_PUBLIC_PHOTOS_URL', true);
export const NEXT_PUBLIC_R2_PUBLIC_MODELS_URL = getEnvVar('NEXT_PUBLIC_R2_PUBLIC_MODELS_URL', true);

// Other environment variables
export const SUPABASE_URL = getEnvVar('SUPABASE_URL');
export const SUPABASE_ANON_KEY = getEnvVar('SUPABASE_ANON_KEY');
export const NEXT_PUBLIC_SUPABASE_URL = getEnvVar('NEXT_PUBLIC_SUPABASE_URL', true);
export const NEXT_PUBLIC_SUPABASE_ANON_KEY = getEnvVar('NEXT_PUBLIC_SUPABASE_ANON_KEY', true);
export const HUNYUAN3D_API_URL = getEnvVar('HUNYUAN3D_API_URL');
export const NEXT_PUBLIC_HUNYUAN3D_API_URL = getEnvVar('NEXT_PUBLIC_HUNYUAN3D_API_URL', true);

// Validate on import
console.log('[env] Validating environment variables...');
