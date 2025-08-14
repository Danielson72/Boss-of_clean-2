import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';

export class AuthService {
  private supabase = createClient();

  async signUp(email: string, password: string, fullName: string, role: 'customer' | 'cleaner' | 'admin' = 'customer') {
    try {
      // Sign up the user
      const { data, error } = await this.supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role: role
          }
        }
      });

      if (error) throw error;

      return { user: data.user, error: null };
    } catch (error: any) {
      return { user: null, error };
    }
  }

  async signIn(email: string, password: string) {
    try {
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      return { user: data.user, session: data.session, error: null };
    } catch (error: any) {
      return { user: null, session: null, error };
    }
  }

  async signOut() {
    try {
      const { error } = await this.supabase.auth.signOut();
      if (error) throw error;
      return { error: null };
    } catch (error: any) {
      return { error };
    }
  }

  async resetPassword(email: string) {
    try {
      const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`
      });
      
      if (error) throw error;
      
      return { error: null };
    } catch (error: any) {
      return { error };
    }
  }

  async updatePassword(newPassword: string) {
    try {
      const { error } = await this.supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      return { error: null };
    } catch (error: any) {
      return { error };
    }
  }

  async getUser() {
    try {
      const { data: { user }, error } = await this.supabase.auth.getUser();
      
      if (error) throw error;
      
      return { user, error: null };
    } catch (error: any) {
      return { user: null, error };
    }
  }

  async getSession() {
    try {
      const { data: { session }, error } = await this.supabase.auth.getSession();
      
      if (error) throw error;
      
      return { session, error: null };
    } catch (error: any) {
      return { session: null, error };
    }
  }

  async getUserProfile(userId: string) {
    try {
      const { data, error } = await this.supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;

      return { profile: data, error: null };
    } catch (error: any) {
      return { profile: null, error };
    }
  }

  async updateUserProfile(userId: string, updates: any) {
    try {
      const { data, error } = await this.supabase
        .from('users')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;

      return { profile: data, error: null };
    } catch (error: any) {
      return { profile: null, error };
    }
  }

  async getCleanerProfile(userId: string) {
    try {
      const { data, error } = await this.supabase
        .from('cleaners')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // Ignore not found error

      return { cleaner: data, error: null };
    } catch (error: any) {
      return { cleaner: null, error };
    }
  }

  onAuthStateChange(callback: (user: User | null) => void) {
    return this.supabase.auth.onAuthStateChange((_event, session) => {
      callback(session?.user ?? null);
    });
  }
}

export const authService = new AuthService();