'use client';

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { AuthUser } from '@/types';
import * as authService from '@/services/auth';

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => { success: boolean; error?: string };
  register: (email: string, password: string) => { success: boolean; error?: string };
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    authService.seedAdmin();
    const current = authService.getCurrentUser();
    setUser(current);
    setIsLoading(false);
  }, []);

  const login = useCallback((email: string, password: string) => {
    const result = authService.login(email, password);
    if (result.success) {
      setUser(result.user);
      return { success: true };
    }
    return { success: false, error: result.error };
  }, []);

  const register = useCallback((email: string, password: string) => {
    const result = authService.register(email, password);
    if (result.success) {
      setUser(result.user);
      return { success: true };
    }
    return { success: false, error: result.error };
  }, []);

  const logout = useCallback(() => {
    authService.logout();
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
