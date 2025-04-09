import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../services/supabase';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signOut: () => Promise<void>;
  error: string | null;
}

// Create context with default values
const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  signIn: async () => {},
  signUp: async () => {},
  signOut: async () => {},
  error: null,
});

// Provider component that wraps your app and makes auth object available
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('AuthProvider initializing...');
    
    // Get session on load
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('Initial session:', session ? 'Session exists' : 'No session');
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('Auth state change detected:', event);
        console.log('New session:', session ? 'Session exists' : 'No session');
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // Cleanup on unmount
    return () => {
      console.log('Unsubscribing from auth changes');
      subscription.unsubscribe();
    };
  }, []);

  // Sign in method
  const signIn = async (email: string, password: string) => {
    try {
      console.log('Attempting to sign in with email:', email);
      setError(null);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        console.error('Sign in error from Supabase:', error);
        setError(error.message);
      } else {
        console.log('Sign in successful, session:', data.session ? 'Session exists' : 'No session');
        console.log('User data:', data.user);
      }
    } catch (error) {
      console.error('Unexpected sign in error:', error);
      setError('An unexpected error occurred');
    }
  };

  // Sign up method
  const signUp = async (email: string, password: string, name: string) => {
    try {
      setError(null);
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
          },
        },
      });

      if (error) {
        setError(error.message);
      } else if (data.user) {
        // Create user profile in users table
        const { error: profileError } = await supabase
          .from('users')
          .insert({
            id: data.user.id,
            display_name: name,
          });

        if (profileError) {
          setError(profileError.message);
        }
      }
    } catch (error) {
      setError('An unexpected error occurred');
      console.error('Sign up error:', error);
    }
  };

  // Sign out method
  const signOut = async () => {
    try {
      setError(null);
      const { error } = await supabase.auth.signOut();
      if (error) setError(error.message);
    } catch (error) {
      setError('An unexpected error occurred');
      console.error('Sign out error:', error);
    }
  };

  const value = {
    session,
    user,
    loading,
    signIn,
    signUp,
    signOut,
    error,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Hook for child components to get the auth object
export const useAuth = () => useContext(AuthContext); 