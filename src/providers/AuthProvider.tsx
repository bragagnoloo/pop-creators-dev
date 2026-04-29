'use client';

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { AuthUser } from '@/types';
import * as authService from '@/services/auth';
import { createClient } from '@/lib/supabase/client';

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, password: string) => Promise<{ success: boolean; error?: string; needsConfirmation?: boolean }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const supabase = createClient();
    // onAuthStateChange fires INITIAL_SESSION immediately — use it as single source of truth
    // to avoid calling getCurrentUser() twice on every page load
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      // TOKEN_REFRESHED only rotates the JWT — user profile hasn't changed
      if (event === 'TOKEN_REFRESHED') return;
      if (!session) {
        setUser(null);
        setIsLoading(false);
        return;
      }
      authService.getCurrentUser().then(u => {
        if (!mounted) return;
        setUser(u);
        setIsLoading(false);
      });
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const result = await authService.login(email, password);
    if (result.success) {
      setUser(result.user);
      return { success: true };
    }
    return { success: false, error: result.error };
  }, []);

  const register = useCallback(async (email: string, password: string) => {
    const result = await authService.register(email, password);
    if (!result.success) {
      return { success: false, error: result.error };
    }
    if ('needsConfirmation' in result && result.needsConfirmation) {
      return { success: true, needsConfirmation: true };
    }
    if ('user' in result) {
      setUser(result.user);
    }
    return { success: true };
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
