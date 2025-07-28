import { supabase, userService, type AuthUser } from './supabase'

// Re-export AuthUser type for use in other modules
export type { AuthUser }

export interface SignUpData {
  email: string
  password: string
  name: string
}

export interface SignInData {
  email: string
  password: string
}

export const authService = {
  // Sign up a new user
  async signUp({ email, password, name }: SignUpData): Promise<AuthUser> {
    try {
      // 1. Create auth user in Supabase Auth (trigger will create user record automatically)
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name
          }
        }
      })

      if (authError) throw authError
      if (!authData.user) throw new Error('Failed to create user')

      // 2. Wait a moment for the trigger to create the billing record, then fetch user data
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      try {
        // Try to get user data using the authenticated user object
        const userData = await userService.getUserDataFromAuthUser(authData.user)
        return userData
      } catch (getUserError) {
        // If user doesn't exist in our user_billing table, the trigger may not have fired
        // Create the user billing record manually
        console.log('Trigger may not have fired, creating user billing record manually')
        await userService.createUserBilling(authData.user.id, {
          free_models_used: 0,
          credits: 0.0
        })
        // Now get the complete user data
        const userData = await userService.getUserDataFromAuthUser(authData.user)
        return userData
      }
    } catch (error) {
      console.error('Sign up error:', error)
      throw error
    }
  },

  // Sign in an existing user
  async signIn({ email, password }: SignInData): Promise<AuthUser> {
    try {
      // 1. Sign in with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (authError) throw authError
      if (!authData.user) throw new Error('Failed to sign in')

      // 2. Get user data from our billing table using the authenticated user object
      const userData = await userService.getUserDataFromAuthUser(authData.user)
      return userData
    } catch (error) {
      console.error('Sign in error:', error)
      throw error
    }
  },

  // Sign out
  async signOut(): Promise<void> {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
    } catch (error) {
      console.error('Sign out error:', error)
      throw error
    }
  },

  // Get current user session
  async getCurrentUser(): Promise<AuthUser | null> {
    try {
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error) throw error
      if (!session?.user) return null

      // Get user data from our billing table
      const userData = await userService.getUserById(session.user.id)
      return userData
    } catch (error) {
      console.error('Get current user error:', error)
      return null
    }
  },

  // Listen to auth state changes
  onAuthStateChange(callback: (user: AuthUser | null) => void) {
    return supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        try {
          const userData = await userService.getUserById(session.user.id)
          callback(userData)
        } catch (error) {
          console.error('Error getting user data on auth change:', error)
          callback(null)
        }
      } else {
        callback(null)
      }
    })
  },

  // Reset password
  async resetPassword(email: string): Promise<void> {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      })
      if (error) throw error
    } catch (error) {
      console.error('Reset password error:', error)
      throw error
    }
  },

  // Sign in with Google
  async signInWithGoogle(): Promise<void> {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      })
      if (error) throw error
    } catch (error) {
      console.error('Google sign in error:', error)
      throw error
    }
  },

  // Sign in with GitHub
  async signInWithGitHub(): Promise<void> {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      })
      if (error) throw error
    } catch (error) {
      console.error('GitHub sign in error:', error)
      throw error
    }
  },

  // Update password with current password validation
  async updatePassword(currentPassword: string, newPassword: string): Promise<void> {
    try {
      // Get current user session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError) throw sessionError
      if (!session?.user) throw new Error('No authenticated user found')

      // Validate current password by attempting to sign in with it
      const { error: validateError } = await supabase.auth.signInWithPassword({
        email: session.user.email!,
        password: currentPassword
      })

      if (validateError) {
        throw new Error('Current password is incorrect')
      }

      // Update to new password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (updateError) throw updateError
    } catch (error) {
      console.error('Update password error:', error)
      throw error
    }
  }
}
