'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { UserResponse, LoginRequest } from '@/types/auth';
import { authService } from '@/services/authService';

interface AuthContextType {
  user: UserResponse | null;
  loading: boolean;
  login: (data: LoginRequest) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const userData = await authService.getMe();
          setUser(userData);
        } catch (error) {
          console.error('Failed to fetch user', error);
          localStorage.removeItem('token');
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (data: LoginRequest) => {
    const { access_token, refresh_token, role, id, email } = await authService.login(data);
    localStorage.setItem('token', access_token);
    localStorage.setItem('refresh_token', refresh_token);

    const userData: UserResponse = { id, email, role, is_active: true, created_at: new Date().toISOString() };
    setUser(userData);
    
    // Redirect based on role
    if (role === 'admin') router.push('/admin');
    else if (role === 'instructor') router.push('/instructor');
    else router.push('/student');
  };

  const logout = () => {
    authService.logout();
    setUser(null);
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
