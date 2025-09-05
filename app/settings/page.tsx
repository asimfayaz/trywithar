"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import Link from "next/link"
import { userService, type AuthUser } from "@/lib/supabase"
import { supabase } from "@/lib/supabase"

export default function SettingsPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [passwordRequirements, setPasswordRequirements] = useState({
    hasLength: false,
    hasUppercase: false,
    hasLowercase: false,
    hasNumber: false,
    hasSpecialChar: false
  })
  const [showPasswordMeter, setShowPasswordMeter] = useState(false)

  // Get session and load user data
  useEffect(() => {
    const loadSessionAndUser = async () => {
      setIsLoadingData(true)
      
      try {
        // Get current session
        const { data: session, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError || !session.session) {
          throw sessionError || new Error("No active session")
        }

        // Get user data
        const userData = await userService.getUserById(session.session.user.id)
        setUser(userData)
      } catch (error) {
        console.error('Failed to load user data:', error)
      } finally {
        setIsLoadingData(false)
      }
    }

    loadSessionAndUser()
  }, [])

  // Check password strength requirements
  useEffect(() => {
    setPasswordRequirements({
      hasLength: newPassword.length >= 8,
      hasUppercase: /[A-Z]/.test(newPassword),
      hasLowercase: /[a-z]/.test(newPassword),
      hasNumber: /[0-9]/.test(newPassword),
      hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(newPassword)
    })
    
    // Show meter only when user starts typing
    if (newPassword.length > 0 && !showPasswordMeter) {
      setShowPasswordMeter(true)
    } else if (newPassword.length === 0 && showPasswordMeter) {
      setShowPasswordMeter(false)
    }
  }, [newPassword, showPasswordMeter])

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()

    if (newPassword !== confirmPassword) {
      toast.error("New passwords don't match!")
      return
    }

    // Check password strength
    const isPasswordStrong = Object.values(passwordRequirements).every(Boolean)
    if (!isPasswordStrong) {
      toast.error("Password must be at least 8 characters with uppercase, lowercase, number, and special character")
      return
    }

    if (!currentPassword) {
      toast.error("Please enter your current password!")
      return
    }

    setIsLoading(true)
    try {
      // Verify current password
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: user?.email || '',
        password: currentPassword
      })
      
      if (verifyError) {
        throw new Error("Current password is incorrect")
      }

      // Update password using Supabase Auth
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (error) throw error
      
      toast.success("Password updated successfully!")
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
    } catch (error) {
      console.error('Password update failed:', error)
      if (error instanceof Error) {
        toast.error(`Failed to update password: ${error.message}`)
      } else {
        toast.error('Failed to update password. Please try again.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (!user) return
    
    try {
      setIsLoading(true)
      // In a real app, you'd call a delete API endpoint
      // For now, just show a confirmation
      alert("Account deletion requested. This is a demo - no actual deletion occurred.")
    } catch (error) {
      console.error('Failed to delete account:', error)
      alert('Failed to delete account. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoadingData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading settings...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Failed to load user data</p>
          <Link href="/" className="text-blue-600 hover:text-blue-800">Return to Home</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/" className="text-blue-600 hover:text-blue-800">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto p-6 space-y-8">
        {/* Profile Information */}
        <Card>
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
            <CardDescription>Your account details and profile settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center space-x-4">
              <Avatar className="w-20 h-20">
                <AvatarImage src={user.avatar_url || "/placeholder.svg"} alt={user.name || 'User'} />
                <AvatarFallback className="text-lg">{(user.name || 'U').charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div>
                <h3 className="text-lg font-medium">{user.name}</h3>
                <p className="text-sm text-gray-600">{user.email}</p>
                <p className="text-sm text-gray-500">Member since {new Date(user.created_at).toLocaleDateString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Change Password */}
        <Card>
          <CardHeader>
            <CardTitle>Change Password</CardTitle>
            <CardDescription>Update your password to keep your account secure</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div>
                <Label htmlFor="currentPassword">Current Password</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center">
                  <Label htmlFor="newPassword">New Password</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button 
                          type="button" 
                          className="ml-1 text-gray-400 hover:text-gray-600 focus:outline-none"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </button>
                      </TooltipTrigger>
                      <TooltipContent className="bg-white shadow-lg p-3 rounded-md">
                        <div className="space-y-1 text-sm">
                          <div className="flex items-center">
                            <span className={`mr-1 ${passwordRequirements.hasLength ? 'text-green-500' : 'text-gray-400'}`}>
                              {passwordRequirements.hasLength ? '✓' : '•'}
                            </span>
                            <span>At least 8 characters</span>
                          </div>
                          <div className="flex items-center">
                            <span className={`mr-1 ${passwordRequirements.hasUppercase ? 'text-green-500' : 'text-gray-400'}`}>
                              {passwordRequirements.hasUppercase ? '✓' : '•'}
                            </span>
                            <span>Uppercase letter</span>
                          </div>
                          <div className="flex items-center">
                            <span className={`mr-1 ${passwordRequirements.hasLowercase ? 'text-green-500' : 'text-gray-400'}`}>
                              {passwordRequirements.hasLowercase ? '✓' : '•'}
                            </span>
                            <span>Lowercase letter</span>
                          </div>
                          <div className="flex items-center">
                            <span className={`mr-1 ${passwordRequirements.hasNumber ? 'text-green-500' : 'text-gray-400'}`}>
                              {passwordRequirements.hasNumber ? '✓' : '•'}
                            </span>
                            <span>Number</span>
                          </div>
                          <div className="flex items-center">
                            <span className={`mr-1 ${passwordRequirements.hasSpecialChar ? 'text-green-500' : 'text-gray-400'}`}>
                              {passwordRequirements.hasSpecialChar ? '✓' : '•'}
                            </span>
                            <span>Special character</span>
                          </div>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
                
                {/* Password strength meter - only shown when typing */}
                {showPasswordMeter && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="mt-1">
                          <div className="flex items-center">
                            <div className="w-full bg-gray-200 rounded-full h-2.5">
                              <div 
                                className={`h-2.5 rounded-full ${
                                  Object.values(passwordRequirements).filter(Boolean).length > 3 
                                    ? 'bg-green-500' 
                                    : Object.values(passwordRequirements).filter(Boolean).length > 2 
                                      ? 'bg-yellow-500' 
                                      : 'bg-red-500'
                                }`}
                                style={{ 
                                  width: `${(Object.values(passwordRequirements).filter(Boolean).length / 5) * 100}%` 
                                }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent className="bg-white shadow-lg p-3 rounded-md">
                        <div className="space-y-1 text-sm">
                          <div className="flex items-center">
                            <span className={`mr-1 ${passwordRequirements.hasLength ? 'text-green-500' : 'text-gray-400'}`}>
                              {passwordRequirements.hasLength ? '✓' : '•'}
                            </span>
                            <span>At least 8 characters</span>
                          </div>
                          <div className="flex items-center">
                            <span className={`mr-1 ${passwordRequirements.hasUppercase ? 'text-green-500' : 'text-gray-400'}`}>
                              {passwordRequirements.hasUppercase ? '✓' : '•'}
                            </span>
                            <span>Uppercase letter</span>
                          </div>
                          <div className="flex items-center">
                            <span className={`mr-1 ${passwordRequirements.hasLowercase ? 'text-green-500' : 'text-gray-400'}`}>
                              {passwordRequirements.hasLowercase ? '✓' : '•'}
                            </span>
                            <span>Lowercase letter</span>
                          </div>
                          <div className="flex items-center">
                            <span className={`mr-1 ${passwordRequirements.hasNumber ? 'text-green-500' : 'text-gray-400'}`}>
                              {passwordRequirements.hasNumber ? '✓' : '•'}
                            </span>
                            <span>Number</span>
                          </div>
                          <div className="flex items-center">
                            <span className={`mr-1 ${passwordRequirements.hasSpecialChar ? 'text-green-500' : 'text-gray-400'}`}>
                              {passwordRequirements.hasSpecialChar ? '✓' : '•'}
                            </span>
                            <span>Special character</span>
                          </div>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
              <div>
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Updating...
                  </>
                ) : "Update Password"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-red-600">Danger Zone</CardTitle>
            <CardDescription>Irreversible and destructive actions</CardDescription>
          </CardHeader>
          <CardContent>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="inline-block">
                        <Button variant="destructive" disabled>
                          Delete Account
                        </Button>
                      </span>
                    </TooltipTrigger>
                    <TooltipContent className="bg-white shadow-lg p-3 rounded-md">
                      <p>Coming soon</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete your account and remove all your data
                    from our servers, including all your 3D models.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteAccount} className="bg-red-600 hover:bg-red-700">
                    Yes, delete my account
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
