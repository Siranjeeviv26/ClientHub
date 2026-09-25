import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { User } from '../types';
import { authApi } from '../api/auth';
import api from '../services/api';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { email: string; password: string; firstName: string; lastName: string; organizationName?: string }) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateUser: (updates: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadStoredAuth = useCallback(async () => {
    // User profile cached in localStorage (non-sensitive); tokens are httpOnly cookies
    let storedUser = null;
    try {
      const raw = localStorage.getItem('user');
      if (raw) storedUser = JSON.parse(raw);
    } catch { /* corrupted storage */ }

    if (storedUser) {
      setUser(storedUser);
    }

    // Always try profile fetch — cookie or in-memory token authenticates
    try {
      await refreshUser();
      window.dispatchEvent(new Event('auth:login'));
    } catch {
      api.logout();
      setUser(null);
    }
    setIsLoading(false);
  }, []);

  const refreshUser = useCallback(async (): Promise<void> => {
    try {
      const response = await authApi.getProfile();
      if (response.success && response.data) {
        const userData = response.data;
        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));
        return;
      }
      throw new Error(response.message || 'Failed to refresh user');
    } catch (error) {
      console.error('Failed to refresh user:', error);
      throw error;
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const response = await authApi.login({ email, password });
    if (response.success && response.data) {
      api.setAuth(response.data);
      await refreshUser();
      window.dispatchEvent(new Event('auth:login'));
    } else {
      throw new Error(response.message || 'Login failed');
    }
  }, [refreshUser]);

  const register = useCallback(async (data: { email: string; password: string; firstName: string; lastName: string; organizationName?: string }) => {
    const response = await authApi.register(data);
    if (response.success && response.data) {
      // After registration, user needs to verify email
      // Don't auto-login, redirect to verification page
    } else {
      throw new Error(response.message || 'Registration failed');
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      api.logout();
      setUser(null);
    }
  }, []);

  const updateUser = useCallback((updates: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return null;
      const updated = { ...prev, ...updates };
      localStorage.setItem('user', JSON.stringify(updated));
      return updated;
    });
  }, []);

  useEffect(() => {
    loadStoredAuth();
  }, [loadStoredAuth]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        refreshUser,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}