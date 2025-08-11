# Google Login Implementation Plan

## Overview
Add Google OAuth login to the existing 3D Model Generator app using Supabase Auth. The app already has sign in/sign up screens with buttons that we'll modify to support Google login.

## Current Implementation Status
- [x] Frontend UI implementation complete (auth modal)
- [x] Google Cloud Console configuration (Completed by user)
- [x] Supabase Dashboard configuration (Completed by user)
- [ ] Backend verification
- [ ] Testing

## Implementation Checklist

### 1. Google Cloud Console Setup (COMPLETED)
- [x] Create or access Google Cloud Project
- [x] Enable Google+ API (if not already enabled)
- [x] Create OAuth 2.0 credentials
- [x] Configure authorized redirect URIs:
  - `https://[PROJECT_REF].supabase.co/auth/v1/callback`
- [x] Note down Client ID and Client Secret

### 2. Supabase Configuration (COMPLETED)
- [x] Access Supabase Dashboard
- [x] Navigate to Authentication > Providers
- [x] Enable Google provider
- [x] Add Google Client ID and Client Secret
- [x] Save configuration

### 3. Environment Setup
- [ ] Add Google Client ID to `.env.local`:
  ```env
  NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_client_id_here
  ```

### 4. Backend Verification
- [ ] Test Google sign-in flow locally
- [ ] Verify user creation in Supabase `auth.users` table
- [ ] Verify automatic creation of `user_billing` records
- [ ] Test email conflict handling
- [ ] Verify profile data sync from Google

### 5. Testing & Deployment
- [ ] Test user session management
- [ ] Test billing record initialization
- [ ] Prepare production deployment:
  - Add production redirect URI to Google Cloud Console
  - Add production Google Client ID to environment
- [ ] Deploy to production
- [ ] Test Google login on production
- [ ] Update deployment documentation

## Technical Details

### Google Console Configuration
- **Authorized JavaScript origins**: 
  - `http://localhost:3000` (development)
  - `https://your-production-domain.com` (production)
- **Authorized redirect URIs**:
  - `https://[PROJECT_REF].supabase.co/auth/v1/callback`

### Supabase Auth URLs
- Redirect URL format: `https://[PROJECT_REF].supabase.co/auth/v1/callback`
- Where PROJECT_REF is your Supabase project reference ID

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

## Notes
- Google OAuth requires HTTPS in production
- Make sure your production domain is added to Google Console
- Test thoroughly as OAuth flows can be sensitive to configuration
- Consider handling edge cases like existing users signing in with Google

## Troubleshooting
### Common Errors
- **"Unsupported provider: missing OAuth secret"**:
  - Verify both Client ID and Client Secret are entered in Supabase
  - Ensure credentials are saved after entry
  - Double-check Google Cloud Console for correct secret
  - Confirm OAuth consent screen is configured
