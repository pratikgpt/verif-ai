'use client'

import { useState, useEffect, useCallback } from 'react'
import { User, Session, AuthError } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

/**
 * Auth States:
 * - loading: Checking authentication status
 * - authenticated: User is logged in
 * - unauthenticated: User is not logged in
 */
export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated'

export interface UseAuthReturn {
  status: AuthStatus
  user: User | null
  session: Session | null
  accessToken: string | null
  error: string | null
  signIn: (email: string, password: string) => Promise<boolean>
  signUp: (email: string, password: string) => Promise<boolean>
  signOut: () => Promise<void>
  clearError: () => void
}

/**
 * useAuth Hook
 *
 * Manages Supabase authentication for the admin dashboard.
 * Provides login, signup, logout, and session management.
 */
export function useAuth(): UseAuthReturn {
  const [status, setStatus] = useState<AuthStatus>('loading')
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Initialize auth state on mount
  useEffect(() => {
    // Get initial session
    const initAuth = async () => {
      try {
        const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession()

        if (sessionError) {
          console.error('Session error:', sessionError)
          setStatus('unauthenticated')
          return
        }

        if (currentSession) {
          setSession(currentSession)
          setUser(currentSession.user)
          setStatus('authenticated')
        } else {
          setStatus('unauthenticated')
        }
      } catch (err) {
        console.error('Auth init error:', err)
        setStatus('unauthenticated')
      }
    }

    initAuth()

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, currentSession) => {
        if (currentSession) {
          setSession(currentSession)
          setUser(currentSession.user)
          setStatus('authenticated')
        } else {
          setSession(null)
          setUser(null)
          setStatus('unauthenticated')
        }
      }
    )

    // Cleanup subscription on unmount
    return () => {
      subscription.unsubscribe()
    }
  }, [])

  /**
   * Sign in with email and password
   */
  const signIn = useCallback(async (email: string, password: string): Promise<boolean> => {
    setError(null)

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) {
        setError(getAuthErrorMessage(signInError))
        return false
      }

      if (data.session) {
        setSession(data.session)
        setUser(data.user)
        setStatus('authenticated')
        return true
      }

      return false
    } catch (err) {
      setError('An unexpected error occurred. Please try again.')
      return false
    }
  }, [])

  /**
   * Sign up with email and password
   */
  const signUp = useCallback(async (email: string, password: string): Promise<boolean> => {
    setError(null)

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      })

      if (signUpError) {
        setError(getAuthErrorMessage(signUpError))
        return false
      }

      // Check if email confirmation is required
      if (data.user && !data.session) {
        setError('Please check your email to confirm your account.')
        return false
      }

      if (data.session) {
        setSession(data.session)
        setUser(data.user)
        setStatus('authenticated')
        return true
      }

      return false
    } catch (err) {
      setError('An unexpected error occurred. Please try again.')
      return false
    }
  }, [])

  /**
   * Sign out
   */
  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut()
      setSession(null)
      setUser(null)
      setStatus('unauthenticated')
      setError(null)
    } catch (err) {
      console.error('Sign out error:', err)
    }
  }, [])

  /**
   * Clear error message
   */
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  return {
    status,
    user,
    session,
    accessToken: session?.access_token || null,
    error,
    signIn,
    signUp,
    signOut,
    clearError,
  }
}

/**
 * Convert Supabase auth errors to user-friendly messages
 */
function getAuthErrorMessage(error: AuthError): string {
  const message = error.message.toLowerCase()

  if (message.includes('invalid login credentials')) {
    return 'Invalid email or password. Please try again.'
  }
  if (message.includes('email not confirmed')) {
    return 'Please confirm your email address before signing in.'
  }
  if (message.includes('user already registered')) {
    return 'An account with this email already exists.'
  }
  if (message.includes('password')) {
    return 'Password must be at least 6 characters long.'
  }
  if (message.includes('rate limit')) {
    return 'Too many attempts. Please wait a moment and try again.'
  }
  if (message.includes('network')) {
    return 'Network error. Please check your connection.'
  }

  return error.message || 'Authentication failed. Please try again.'
}
