"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { userService } from "@/lib/supabase"
import type { User } from "@/app/page"

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface AuthContextType {
  user: User | null
  showAuthModal: boolean
  authReason: string | null
  showForgotPassword: boolean
  login: (user: User) => void
  logout: () => Promise<void>
  openAuthModal: (reason?: string) => void
  closeAuthModal: () => void
  setShowForgotPassword: (show: boolean) => void
  updateUser: (user: User) => void
}

// ============================================================================
// CONTEXT CREATION
// ============================================================================

const AuthContext = createContext<AuthContextType>({
  user: null,
  showAuthModal: false,
  authReason: null,
  showForgotPassword: false,
  login: () => {},
  logout: async () => {},
  openAuthModal: () => {},
  closeAuthModal: () => {},
  setShowForgotPassword: () => {},
  updateUser: () => {}
})

// ============================================================================
// AUTH PROVIDER COMPONENT
// ============================================================================

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // State management
  const [user, setUser] = useState<User | null>(null)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authReason, setAuthReason] = useState<string | null>(null)
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // --------------------------------------------------------------------------
  // INITIALIZATION & AUTH STATE MANAGEMENT
  // --------------------------------------------------------------------------

  useEffect(() => {
    let isInitialized = false

    /**
     * Initialize authentication by checking for existing session
     * Loads full user data from database if session exists
     */
    const initializeAuth = async () => {
      try {
        const { data } = await supabase.auth.getUser()
        const currentUser = data.user

        if (currentUser && !isInitialized) {
          const fullUser = await userService.getUserById(currentUser.id)

          setUser({
            id: fullUser.id,
            name: fullUser.name || currentUser.email || "User",
            email: fullUser.email || "",
            avatar_url: fullUser.avatar_url || 
                       currentUser.user_metadata?.avatar_url || 
                       "/placeholder.svg?height=40&width=40",
            credits: fullUser.credits || 0,
          })
        }
      } catch (error) {
        console.error('❌ Failed to initialize auth:', error)
      } finally {
        if (!isInitialized) {
          setIsLoading(false)
          isInitialized = true
        }
      }
    }

    /**
     * Subscribe to authentication state changes
     * Handles login, logout, and token refresh events
     */
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // Only process changes after initial setup
        if (!isInitialized) return

        const authUser = session?.user

        if (authUser) {
          // User is authenticated - load or update user data
          setUser(prev => {
            if (!prev) {
              // Create temporary user object for immediate UI update
              const tempUser: User = {
                id: authUser.id,
                name: authUser.user_metadata?.name || authUser.email || "User",
                email: authUser.email || "",
                avatar_url: authUser.user_metadata?.avatar_url || 
                           "/placeholder.svg?height=40&width=40",
                credits: 0,
              }

              // Asynchronously load full user data from database
              userService.getUserById(authUser.id)
                .then(fullUser => setUser(fullUser))
                .catch(error => {
                  console.error('Failed to load user data:', error)
                  // Keep temporary user if database load fails
                })

              return tempUser
            }

            // Update existing user with latest auth metadata
            return {
              ...prev,
              id: authUser.id,
              name: authUser.user_metadata?.name || authUser.email || "User",
              email: authUser.email || "",
              avatar_url: authUser.user_metadata?.avatar_url || 
                         "/placeholder.svg?height=40&width=40",
            }
          })
        } else {
          // User logged out - clear state
          setUser(null)
        }
      }
    )

    // Start initialization
    initializeAuth()

    // Cleanup subscription on unmount
    return () => {
      subscription?.unsubscribe()
    }
  }, [])

  // --------------------------------------------------------------------------
  // AUTH ACTIONS
  // --------------------------------------------------------------------------

  /**
   * Set authenticated user and close auth modal
   */
  const login = (user: User) => {
    setUser(user)
    closeAuthModal()
  }

  /**
   * Sign out user and clear all auth state
   */
  const logout = async () => {
    try {
      await supabase.auth.signOut()
      setUser(null)
    } catch (error) {
      console.error('Logout error:', error)
      // Clear state even if signOut fails
      setUser(null)
    }
  }

  /**
   * Update current user data (e.g., after profile edit)
   */
  const updateUser = (newUser: User) => {
    setUser(newUser)
  }

  // --------------------------------------------------------------------------
  // MODAL MANAGEMENT
  // --------------------------------------------------------------------------

  /**
   * Open authentication modal with optional reason message
   */
  const openAuthModal = (reason?: string) => {
    setAuthReason(reason || null)
    setShowAuthModal(true)
  }

  /**
   * Close authentication modal and reset all modal state
   */
  const closeAuthModal = () => {
    setShowAuthModal(false)
    setAuthReason(null)
    setShowForgotPassword(false)
  }

  // --------------------------------------------------------------------------
  // PROVIDER RENDER
  // --------------------------------------------------------------------------

  return (
    <AuthContext.Provider
      value={{
        user,
        showAuthModal,
        authReason,
        showForgotPassword,
        login,
        logout,
        openAuthModal,
        closeAuthModal,
        setShowForgotPassword,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

// ============================================================================
// CUSTOM HOOK
// ============================================================================

/**
 * Access authentication context
 * Must be used within AuthProvider
 */
export const useAuth = () => useContext(AuthContext)