import React, { createContext, useContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import { getProfile, updateProfile } from '../api';
import { USE_MOCK_API } from '../config';
import * as mock from '../api/mock';

interface User {
  id: string;
  name: string;
  phoneNumber?: string;
  phone?: string;
  language: string;
  role: 'endUser' | 'serviceProvider';
  serviceProviderInfo?: any;
  creditPoints: number;
  plan: 'free' | 'basic' | 'pro';
  avatarUrl?: string | null;
}

type UpdatePayload = Partial<User> & {
  services?: string[];
  location?: { name: string; lat: number; lng: number; placeId?: string } | null;
  radius?: number;
  plan?: 'free' | 'basic' | 'pro';
  role?: 'endUser' | 'serviceProvider';
  language?: string;
  avatarUrl?: string | null;
};

interface AuthContextProps {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
  updateUser: (updates: UpdatePayload) => Promise<void>;
  setLanguage: (lang: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Attempt to load token/user from secure storage on mount
  useEffect(() => {
    (async () => {
      try {
        const storedToken = await SecureStore.getItemAsync('aasaan_token');
        const storedUser = await SecureStore.getItemAsync('aasaan_user');
        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const login = async (tok: string, usr: User) => {
    setToken(tok);
    setUser(usr);
    await SecureStore.setItemAsync('aasaan_token', tok);
    await SecureStore.setItemAsync('aasaan_user', JSON.stringify(usr));
  };

  const logout = async () => {
    setToken(null);
    setUser(null);
    await SecureStore.deleteItemAsync('aasaan_token');
    await SecureStore.deleteItemAsync('aasaan_user');
  };

  const refreshUser = async () => {
    if (!token) return;
    try {
      let updated: any;
      if (USE_MOCK_API) {
        updated = await mock.getProfile(token);
      } else {
        updated = await getProfile(token);
      }
      setUser(updated);
      await SecureStore.setItemAsync('aasaan_user', JSON.stringify(updated));
    } catch (err) {
      console.error(err);
    }
  };

  const updateUser = async (updates: UpdatePayload) => {
    if (!token || !user) return;
    try {
      let updated: any;
      if (USE_MOCK_API) {
        updated = await (mock as any).updateProfile(token, updates as any);
      } else {
        updated = await updateProfile(token, updates as any);
      }
      setUser(updated);
      await SecureStore.setItemAsync('aasaan_user', JSON.stringify(updated));
    } catch (err) {
      console.error(err);
    }
  };

  const setLanguage = async (lang: string) => {
    if (!user) return;
    // optimistic local update
    const next = { ...user, language: lang } as User;
    setUser(next);
    await SecureStore.setItemAsync('aasaan_user', JSON.stringify(next));
    // persist to backend when token is present
    if (token) {
      try {
        await updateUser({ language: lang });
      } catch (e) {
        // ignore errors for now; user can retry later
      }
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, refreshUser, updateUser, setLanguage }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
};