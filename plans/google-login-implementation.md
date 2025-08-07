# Google Login Implementation Plan

## Overview
Add Google OAuth login to the existing 3D Model Generator app using Supabase Auth. The app already has sign in/sign up screens with buttons that we'll modify to support Google login.

## Prerequisites Checklist

### 1. Google Cloud Console Setup
- [ ] Create or access Google Cloud Project
- [ ] Enable Google+ API (if not already enabled)
- [ ] Create OAuth 2.0 credentials
- [ ] Configure authorized redirect URIs in Google Console
- [ ] Note down Client ID and Client Secret

### 2. Supabase Configuration
- [ ] Access Supabase Dashboard for your project
- [ ] Navigate to Authentication > Providers
- [ ] Enable Google provider
- [ ] Add Google Client ID and Client Secret
- [ ] Configure redirect URLs
- [ ] Test provider configuration

### 3. Code Implementation
- [ ] Examine current auth service implementation
- [ ] Add Google sign-in method to auth service
- [ ] Update sign-in page to include Google login
- [ ] Update sign-up page to include Google login
- [ ] Handle Google auth callback
- [ ] Test user profile creation for Google users
- [ ] Ensure user_billing record creation works with Google auth

### 4. Environment Variables
- [ ] Add Google Client ID to environment variables (if needed client-side)
- [ ] Update .env.local and production environment
- [ ] Verify all required environment variables are set

### 5. Testing & Deployment
- [ ] Test Google login flow locally
- [ ] Test user creation and billing record creation
- [ ] Test existing functionality still works
- [ ] Deploy to production
- [ ] Test Google login on production
- [ ] Update any deployment documentation

## Technical Details

### Google Console Configuration
- **Authorized JavaScript origins**: 
  - `http://localhost:3000` (development)
  - `https://your-production-domain.com` (production)
- **Authorized redirect URIs**:
  - `https://your-supabase-project.supabase.co/auth/v1/callback`

### Supabase Auth URLs
- Redirect URL format: `https://[PROJECT_REF].supabase.co/auth/v1/callback`
- Where PROJECT_REF is your Supabase project reference ID

### Code Changes Required
1. Update `lib/auth.ts` or auth service to add `signInWithGoogle()` method
2. Modify sign-in and sign-up components to call Google auth
3. Ensure user profile/billing creation trigger works for OAuth users
4. Handle potential email conflicts between email/password and Google auth

## Manual Steps Required

### Step 1: Google Cloud Console
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create new project or select existing project
3. Navigate to "APIs & Services" > "Credentials"
4. Click "Create Credentials" > "OAuth 2.0 Client IDs"
5. Configure consent screen if not already done
6. Set application type to "Web application"
7. Add authorized origins and redirect URIs (see Technical Details above)
8. Save Client ID and Client Secret

### Step 2: Supabase Dashboard
1. Go to your Supabase project dashboard
2. Navigate to Authentication > Providers
3. Find Google in the list and toggle it on
4. Enter your Google Client ID and Client Secret
5. Save the configuration

### Step 3: Code Implementation
- Will be handled programmatically after manual steps are complete

## Notes
- Google OAuth requires HTTPS in production
- Make sure your production domain is added to Google Console
- Test thoroughly as OAuth flows can be sensitive to configuration
- Consider handling edge cases like existing users signing in with Google
