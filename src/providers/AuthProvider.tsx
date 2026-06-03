'use client';

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { AuthUser } from '@/types';
import * as authService from '@/services/auth';
import { createClient } from '@/lib/supabase/client';

const CACHE_KEY = 'popline_authuser_cache';
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 min

function readCachedUser(): AuthUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { user: AuthUser; ts: number };
    if (Date.now() - parsed.ts > CACHE_TTL_MS) return null;
    return parsed.user;
  } catch {
    return null;
  }
}

function writeCachedUser(user: AuthUser | null) {
  if (typeof window === 'undefined') return;
  try {
    if (!user) sessionStorage.removeItem(CACHE_KEY);
    else sessionStorage.setItem(CACHE_KEY, JSON.stringify({ user, ts: Date.now() }));
  } catch {}
}

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, password: string) => Promise<{ success: boolean; error?: string; needsConfirmation?: boolean; userId?: string; userEmail?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  // Inicializa do sessionStorage pra UI ficar pronta antes do round-trip
  const cached = readCachedUser();
  const [user, setUser] = useState<AuthUser | null>(cached);
  const [isLoading, setIsLoading] = useState(!cached);

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
        writeCachedUser(null);
        setIsLoading(false);
        return;
      }
      // Se já temos cache válido pro mesmo user.id, evita o round-trip de getCurrentUser
      const cached = readCachedUser();
      if (cached && cached.id === session.user.id) {
        setUser(cached);
        setIsLoading(false);
        return;
      }
      authService.getCurrentUser().then(u => {
        if (!mounted) return;
        setUser(u);
        writeCachedUser(u);
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
      writeCachedUser(result.user);
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
      writeCachedUser(result.user);
    }
    return { success: true };
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
    setUser(null);
    writeCachedUser(null);
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
