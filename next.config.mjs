/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Use runtime configuration instead of build-time environment variables
  publicRuntimeConfig: {
    // Client-safe environment variables
    NEXT_PUBLIC_R2_PUBLIC_PHOTOS_URL: process.env.NEXT_PUBLIC_R2_PUBLIC_PHOTOS_URL,
    NEXT_PUBLIC_R2_PUBLIC_MODELS_URL: process.env.NEXT_PUBLIC_R2_PUBLIC_MODELS_URL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_HUNYUAN3D_API_URL: process.env.NEXT_PUBLIC_HUNYUAN3D_API_URL,
  },
  serverRuntimeConfig: {
    // Server-only environment variables
    R2_ACCOUNT_ID: process.env.R2_ACCOUNT_ID,
    R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID,
    R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY,
    R2_PHOTOS_BUCKET: process.env.R2_PHOTOS_BUCKET,
    R2_MODELS_BUCKET: process.env.R2_MODELS_BUCKET,
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
    HUNYUAN3D_API_URL: process.env.HUNYUAN3D_API_URL,
  }
}

export default nextConfig
