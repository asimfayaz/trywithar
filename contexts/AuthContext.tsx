"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { userService } from "@/lib/supabase"
import type { User } from "@/app/page"

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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authReason, setAuthReason] = useState<string | null>(null)
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Check for existing authentication session on app load
  useEffect(() => {
    let isInitialized = false
    
    const initializeAuth = async () => {
      try {
        const { data } = await supabase.auth.getUser();
        const currentUser = data.user;
        
        if (currentUser && !isInitialized) {
          const fullUser = await userService.getUserById(currentUser.id);
          
          setUser({
            id: fullUser.id,
            name: fullUser.name || currentUser.email || "User",
            email: fullUser.email || "",
            avatar_url: fullUser.avatar_url || currentUser.user_metadata?.avatar_url || "/placeholder.svg?height=40&width=40",
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

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (isInitialized) {
        const authUser = session?.user
        
        if (authUser) {
          setUser(prev => {
            if (!prev) {
              userService.getUserById(authUser.id).then(fullUser => {
                setUser({
                  id: fullUser.id,
                  name: fullUser.name || authUser.email || "User",
                  email: fullUser.email || "",
                  avatar_url: fullUser.avatar_url || authUser.user_metadata?.avatar_url || "/placeholder.svg?height=40&width=40",
                  credits: fullUser.credits || 0,
                })
              }).catch(error => {
                console.error('Failed to load user data in listener:', error)
              });
              
              return {
                id: authUser.id,
                name: authUser.user_metadata?.name || authUser.email || "User",
                email: authUser.email || "",
                avatar_url: authUser.user_metadata?.avatar_url || "/placeholder.svg?height=40&width=40",
                credits: 0,
              }
            }
            
            return {
              ...prev,
              id: authUser.id,
              name: authUser.user_metadata?.name || authUser.email || "User",
              email: authUser.email || "",
              avatar_url: authUser.user_metadata?.avatar_url || "/placeholder.svg?height=40&width=40",
            }
          })
        } else {
          setUser(null)
        }
      }
    })

    initializeAuth()

    return () => {
      subscription?.unsubscribe()
    }
  }, [])

  const login = (user: User) => {
    setUser(user)
    closeAuthModal()
  }

  const logout = async () => {
    try {
      await supabase.auth.signOut()
      setUser(null)
    } catch (error) {
      console.error('Logout error:', error)
      setUser(null)
    }
  }

  const openAuthModal = (reason?: string) => {
    setAuthReason(reason || null)
    setShowAuthModal(true)
  }

  const closeAuthModal = () => {
    setShowAuthModal(false)
    setAuthReason(null)
    setShowForgotPassword(false)
  }

  const updateUser = (newUser: User) => {
    setUser(newUser);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      showAuthModal, 
      authReason, 
      showForgotPassword,
      login, 
      logout, 
      openAuthModal, 
      closeAuthModal,
      setShowForgotPassword,
      updateUser
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
