'use client';

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { User, AuthError } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';

type UserRole = 'customer' | 'cleaner' | 'admin';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  dbRole: UserRole | null;
  roleLoaded: boolean;
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
  roleLoaded: false,
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
  const [roleLoaded, setRoleLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();
  const resolvedForUserIdRef = useRef<string | null>(null);

  // Fetch role from public.users table (source of truth — NOT user_metadata).
  // Races a 3s timeout, retries once on failure, returns null on final failure.
  async function fetchDbRole(userId: string): Promise<string | null> {
    const attempt = async (): Promise<string | null> => {
      const queryPromise = supabase
        .from('users')
        .select('role')
        .eq('id', userId)
        .single();
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('fetchDbRole timeout after 3000ms')), 3000)
      );
      const result = await Promise.race([queryPromise, timeoutPromise]) as any;
      if (result.error) throw result.error;
      return result.data?.role ?? null;
    };
    try {
      return await attempt();
    } catch (e1) {
      console.warn('[AuthContext] fetchDbRole first attempt failed, retrying:', e1);
      try {
        return await attempt();
      } catch (e2) {
        console.error('[AuthContext] fetchDbRole retry also failed:', e2);
        return null;
      }
    }
  }

  useEffect(() => {
    let initialLoadDone = false;

    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const currentUser = session?.user || null;
        console.log('[AuthContext] getInitialSession:', currentUser?.email || 'no user');
        setUser(currentUser);

        if (currentUser) {
          if (currentUser.id !== resolvedForUserIdRef.current) {
            try {
              console.log('[AuthContext] fetchDbRole firing for user:', currentUser.id);
              const role = await fetchDbRole(currentUser.id);
              console.log('[AuthContext] role resolved:', role);
              setDbRole(role as UserRole | null);
              resolvedForUserIdRef.current = currentUser.id;
            } catch (err) {
              console.error('[AuthContext] fetchDbRole error:', err);
            }
          }
          setRoleLoaded(true);
        }
      } catch (err) {
        console.error('[AuthContext] getInitialSession error:', err);
      } finally {
        initialLoadDone = true;
        console.log('[AuthContext] loading set to false');
        setLoading(false);
      }
    };

    getInitialSession();

    // Listen for auth changes. Cache role per user.id (resolvedForUserIdRef) so we
    // only re-fetch on SIGNED_IN with a NEW user. Skip TOKEN_REFRESHED and
    // INITIAL_SESSION (the latter via initialLoadDone) to prevent re-fetch on nav.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[AuthContext] onAuthStateChange:', event, session?.user?.email || 'no user');

        // Skip the initial event — getInitialSession already handles it.
        // Processing it here causes a race: setLoading(false) fires before
        // fetchDbRole finishes, so ProtectedRoute sees dbRole=null and redirects.
        if (!initialLoadDone) {
          console.log('[AuthContext] skipping onAuthStateChange — initial load in progress');
          return;
        }

        // Token refresh doesn't change role — skip refetch.
        if (event === 'TOKEN_REFRESHED') {
          return;
        }

        if (event === 'SIGNED_OUT') {
          setUser(null);
          setDbRole(null);
          setRoleLoaded(false);
          resolvedForUserIdRef.current = null;
          setLoading(false);
          return;
        }

        if (event === 'SIGNED_IN') {
          const currentUser = session?.user || null;
          setUser(currentUser);

          if (currentUser && currentUser.id !== resolvedForUserIdRef.current) {
            setLoading(true);
            setRoleLoaded(false);
            try {
              console.log('[AuthContext] fetchDbRole firing for user:', currentUser.id);
              const role = await fetchDbRole(currentUser.id);
              setDbRole(role as UserRole | null);
              resolvedForUserIdRef.current = currentUser.id;
            } catch (err) {
              console.error('[AuthContext] fetchDbRole error in onAuthStateChange:', err);
            }
            setRoleLoaded(true);
          }

          setLoading(false);
        }
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
    setRoleLoaded(false);
    setLoading(false);
  };

  const isAdmin = dbRole === 'admin';
  const isCleaner = dbRole === 'cleaner';
  const isCustomer = dbRole === 'customer';

  const value = {
    user,
    loading,
    dbRole,
    roleLoaded,
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
