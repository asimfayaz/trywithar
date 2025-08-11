"use client"

import React, { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { supabase } from '@/lib/supabase'
// Add environment variable for base URL
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [tokenExpired, setTokenExpired] = useState(false)
  const [redirectSeconds, setRedirectSeconds] = useState(10)
  const router = useRouter()
  const searchParams = useSearchParams()
  // Accept both 'token' and 'code' parameters for compatibility
  const token = searchParams.get('token') || searchParams.get('code')
  const type = searchParams.get('type')
  const errorParam = searchParams.get('error')
  const errorCode = searchParams.get('error_code')
  const errorDescription = searchParams.get('error_description')

  // Enhanced debugging for token validation
  React.useEffect(() => {
    console.group('Password Reset Debugging');
    console.log('URL Parameters:', { token, type, errorParam, errorCode, errorDescription });
    
    // Check if we have error parameters indicating an expired token
    if (errorCode === 'otp_expired' || errorParam === 'access_denied') {
      console.warn('Detected expired token from URL parameters');
      setTokenExpired(true);
      setError('Your password reset link has expired. You will be redirected to the forgot password page to request a new link.');
    }
    // If no error parameters but we have a token, verify it
    else if (token && type === 'recovery') {
      // For PKCE flow with a token like pkce_4a4d84bc30322cc62522e67cb7c7cea4997ca5a389cc73a5d94a7051
      const handleToken = async () => {
        try {
          // First, try to get the current session
          const { data: sessionData } = await supabase.auth.getSession();
          
          // If we don't have a session, we need to verify the OTP token
          if (!sessionData?.session) {
            console.log('No active session, attempting to verify OTP token');
            
            // Extract and log token details
            const isPkce = token.startsWith('pkce_');
            const tokenValue = isPkce ? token.substring(5) : token;
            
            console.log('Token details:', {
              original: token,
              isPkce,
              processed: tokenValue,
              length: tokenValue.length
            });
            
            // Verify the OTP token with the correct parameter structure
            console.log('Verifying token with Supabase...');
            const { data, error: verifyError } = await supabase.auth.verifyOtp({
              type: 'recovery',
              token_hash: tokenValue
            });
            
            console.log('Verify OTP response:', { data, error: verifyError });
            
            if (verifyError) {
              console.error('Token verification error:', verifyError);
              setTokenExpired(true);
              setError('Invalid or expired reset token. You will be redirected to the forgot password page to request a new link.');
            } else {
              // Store the session after successful token verification
              if (data.session) {
                await supabase.auth.setSession(data.session);
                console.log('Session established after token verification');
              }
            }
          }
        } catch (err) {
          console.error('Token handling error:', err);
          setError('Failed to process reset token');
        }
      };
      
      handleToken();
    }
  }, [token, type, errorCode, errorParam]);

  // Handle redirect countdown when token is expired
  React.useEffect(() => {
    if (tokenExpired && redirectSeconds > 0) {
      const timer = setTimeout(() => {
        setRedirectSeconds(prev => prev - 1);
      }, 1000);
      
      return () => clearTimeout(timer);
    } else if (tokenExpired && redirectSeconds === 0) {
      // Redirect to homepage with auth modal parameters
      window.location.href = `${BASE_URL}?showAuth=true&authMode=forgotPassword`;
    }
  }, [tokenExpired, redirectSeconds]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!token) {
      setError('Invalid reset token')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long')
      return
    }

    setIsLoading(true)

    try {
      // For PKCE flow, we need to use updateUser directly with the token
      console.log('Attempting password update...');
      const { data: updateData, error } = await supabase.auth.updateUser({
        password: password
      })
      
      console.log('Update user response:', { updateData, error });
      
      if (error) throw error

      setSuccess(true)
      // Redirect to the base URL after successful password reset
      setTimeout(() => window.location.href = BASE_URL, 2000)
    } catch (err) {
      console.error('Password reset error:', err)
      console.log('Current session state:', await supabase.auth.getSession());
      setError(err instanceof Error ? err.message : 'Password reset failed')
    } finally {
      setIsLoading(false)
      console.groupEnd();
    }
  }

  if (success) {
    return (
      <div className="max-w-md mx-auto p-6">
        <h1 className="text-2xl font-bold mb-4">Password Reset Successful</h1>
        <p className="mb-4">Your password has been updated successfully. Redirecting to homepage...</p>
      </div>
    )
  }

  // If token is expired, show the expired token UI
  if (tokenExpired) {
    return (
      <div className="max-w-md mx-auto p-6">
        <h1 className="text-2xl font-bold mb-4">Password Reset Link Expired</h1>
        
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>
            Your password reset link has expired or is invalid. You will be redirected to the forgot password page in {redirectSeconds} seconds to request a new link.
          </AlertDescription>
        </Alert>
        
        <Button 
          onClick={() => window.location.href = `${BASE_URL}?showAuth=true&authMode=forgotPassword`}
          className="w-full"
        >
          Go to Homepage Now
        </Button>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Reset Your Password</h1>
      
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="password">New Password</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <div>
          <Label htmlFor="confirmPassword">Confirm Password</Label>
          <Input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
        </div>

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? 'Resetting password...' : 'Reset Password'}
        </Button>
      </form>
    </div>
  )
}
