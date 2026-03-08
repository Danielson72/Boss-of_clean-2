'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, AuthError } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';

type UserRole = 'customer' | 'cleaner' | 'admin';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  dbRole: UserRole | null;
  signUp: (email: string, password: string, fullName: string, role: 'customer' | 'cleaner') => Promise<{ error: AuthError | null }>;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
  isCustomer: boolean;
  isCleaner: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  dbRole: null,
  signUp: async () => ({ error: null }),
  signIn: async () => ({ error: null }),
  signOut: async () => {},
  isCustomer: false,
  isCleaner: false,
  isAdmin: false,
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [dbRole, setDbRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  // Fetch role from public.users table (source of truth — NOT user_metadata)
  const fetchDbRole = async (userId: string) => {
    const { data, error } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();

    if (error) {
      console.error(`[AuthContext] Failed to fetch role for user ${userId}:`, error.message);
      return null;
    }

    if (!data?.role) {
      console.error(`[AuthContext] No role found in public.users for user ${userId}`);
      return null;
    }

    return data.role as UserRole;
  };

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const currentUser = session?.user || null;
        console.log('[AuthContext] getInitialSession:', currentUser?.email || 'no user');
        setUser(currentUser);

        if (currentUser) {
          try {
            const role = await fetchDbRole(currentUser.id);
            console.log('[AuthContext] role resolved:', role);
            setDbRole(role);
          } catch (err) {
            console.error('[AuthContext] fetchDbRole error:', err);
          }
        }
      } catch (err) {
        console.error('[AuthContext] getInitialSession error:', err);
      } finally {
        console.log('[AuthContext] loading set to false');
        setLoading(false);
      }
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[AuthContext] onAuthStateChange:', event, session?.user?.email || 'no user');
        const currentUser = session?.user || null;
        setUser(currentUser);

        if (currentUser) {
          try {
            const role = await fetchDbRole(currentUser.id);
            setDbRole(role);
          } catch (err) {
            console.error('[AuthContext] fetchDbRole error in onAuthStateChange:', err);
          }
        } else {
          setDbRole(null);
        }

        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, fullName: string, role: 'customer' | 'cleaner') => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role: role,
        },
      },
    });
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setDbRole(null);
    setLoading(false);
  };

  const isAdmin = dbRole === 'admin';
  const isCleaner = dbRole === 'cleaner';
  const isCustomer = dbRole === 'customer' || (!dbRole && !!user);

  const value = {
    user,
    loading,
    dbRole,
    signUp,
    signIn,
    signOut,
    isCustomer,
    isCleaner,
    isAdmin,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
