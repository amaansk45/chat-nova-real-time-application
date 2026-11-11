import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../utils/api';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (identifier: string, password: string) => Promise<{ requires_2fa?: boolean; identifier?: string }>;
  verify2FA: (identifier: string, code: string) => Promise<void>;
  register: (data: any) => Promise<{ requires_otp?: boolean; user?: User }>;
  verifyOTP: (identifier: string, code: string, type?: string) => Promise<any>;
  resendOTP: (identifier: string, type?: string) => Promise<any>;
  forgotPassword: (identifier: string) => Promise<any>;
  resetPassword: (identifier: string, code: string, newPassword: string) => Promise<any>;
  logout: () => Promise<void>;
  updateUser: (updatedData: Partial<User>) => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('chatnova_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('chatnova_access_token');
    if (token) {
      refreshUser().finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const refreshUser = async () => {
    try {
      const res = await api.get('/auth/me/');
      setUser(res.data);
      localStorage.setItem('chatnova_user', JSON.stringify(res.data));
    } catch {
      // If unauthorized, token refresh interceptor handles or fails
    }
  };

  const login = async (identifier: string, password: string) => {
    const res = await api.post('/auth/login/', { identifier, password });
    if (res.data.requires_2fa) {
      return { requires_2fa: true, identifier: res.data.identifier };
    }

    const { tokens, user: userData } = res.data;
    localStorage.setItem('chatnova_access_token', tokens.access);
    localStorage.setItem('chatnova_refresh_token', tokens.refresh);
    localStorage.setItem('chatnova_user', JSON.stringify(userData));
    setUser(userData);
    return { requires_2fa: false };
  };

  const verify2FA = async (identifier: string, code: string) => {
    const res = await api.post('/auth/login/2fa/', { identifier, code });
    const { tokens, user: userData } = res.data;
    localStorage.setItem('chatnova_access_token', tokens.access);
    localStorage.setItem('chatnova_refresh_token', tokens.refresh);
    localStorage.setItem('chatnova_user', JSON.stringify(userData));
    setUser(userData);
  };

  const register = async (data: any) => {
    const res = await api.post('/api/auth/register/', data);
    if (res.data.requires_otp) {
      return { requires_otp: true };
    }
    const { tokens, user: userData } = res.data;
    if (tokens) {
      localStorage.setItem('chatnova_access_token', tokens.access);
      localStorage.setItem('chatnova_refresh_token', tokens.refresh);
    }
    if (userData) {
      localStorage.setItem('chatnova_user', JSON.stringify(userData));
      setUser(userData);
    }
    return { requires_otp: false, user: userData };
  };

  const verifyOTP = async (identifier: string, code: string, type: string = 'registration') => {
    const res = await api.post('/api/auth/verify-otp/', {
      identifier,
      otp_code: code,
      type,
    });
    if (res.data.tokens) {
      localStorage.setItem('chatnova_access_token', res.data.tokens.access);
      localStorage.setItem('chatnova_refresh_token', res.data.tokens.refresh);
    }
    if (res.data.user) {
      localStorage.setItem('chatnova_user', JSON.stringify(res.data.user));
      setUser(res.data.user);
    }
    return res.data;
  };

  const resendOTP = async (identifier: string, type: string = 'registration') => {
    const res = await api.post('/api/auth/resend-otp/', { identifier, type });
    return res.data;
  };

  const forgotPassword = async (identifier: string) => {
    const res = await api.post('/api/auth/forgot-password/', { identifier });
    return res.data;
  };

  const resetPassword = async (identifier: string, code: string, newPassword: string) => {
    const res = await api.post('/api/auth/reset-password/', {
      identifier,
      otp_code: code,
      new_password: newPassword,
    });
    return res.data;
  };

  const logout = async () => {
    try {
      const refresh = localStorage.getItem('chatnova_refresh_token');
      await api.post('/auth/logout/', { refresh_token: refresh });
    } catch {}
    localStorage.removeItem('chatnova_access_token');
    localStorage.removeItem('chatnova_refresh_token');
    localStorage.removeItem('chatnova_user');
    setUser(null);
  };

  const updateUser = (updatedData: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return null;
      const merged = { ...prev, ...updatedData };
      localStorage.setItem('chatnova_user', JSON.stringify(merged));
      return merged;
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        verify2FA,
        register,
        verifyOTP,
        resendOTP,
        forgotPassword,
        resetPassword,
        logout,
        updateUser,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthProvider;
