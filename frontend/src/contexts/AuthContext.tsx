import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import * as SecureStore from 'expo-secure-store';
import { getProfile, updateProfile, registerPushToken, removePushToken } from '../api';
import { getPushToken } from '../services/pushNotifications';
import { AuthStackNavigationProp } from '../../App';

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
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateUser: (updates: UpdatePayload) => Promise<void>;
  setLanguage: (lang: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // const navigation = useNavigation<AuthStackNavigationProp>();
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const authVersion = useRef(0);

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

  useEffect(() => {
    if (!token || !user) return;

    void getPushToken().then((pushToken) => {
      if (!pushToken) {
        return undefined;
      }
      return registerPushToken(token, pushToken.token, pushToken.platform);
    }).catch((error) => console.warn('Push notification registration failed:', error));
  }, [token, user?.id]);

  const login = async (tok: string, usr: User, navigation?: AuthStackNavigationProp) => {
    authVersion.current += 1;
    setToken(tok);
    setUser(usr);
    await SecureStore.setItemAsync('aasaan_token', tok);
    await SecureStore.setItemAsync('aasaan_user', JSON.stringify(usr));

    // Redirect to role selection page if role is null
    if (!usr.role && navigation) {
      navigation.navigate('RoleSelect');
    }
  };

  const logout = async () => {
    const currentToken = token;
    authVersion.current += 1;
    if (currentToken) {
      try {
        await removePushToken(currentToken);
      } catch (error) {
        console.warn('Push notification cleanup failed:', error);
      }
    }
    setToken(null);
    setUser(null);
    await SecureStore.deleteItemAsync('aasaan_token');
    await SecureStore.deleteItemAsync('aasaan_user');
  };

  const refreshUser = async () => {
    if (!token) return;
    const requestVersion = authVersion.current;
    const requestToken = token;
    try {
      let updated: any;
      updated = await getProfile(requestToken);
      if (requestVersion !== authVersion.current) return;
      setUser(updated);
      await SecureStore.setItemAsync('aasaan_user', JSON.stringify(updated));
    } catch (err) {
      throw err;
    }
  };

  const updateUser = async (updates: UpdatePayload) => {
    if (!token || !user) return;
    try {
      let updated: any;
      updated = await updateProfile(token, updates as any);
      setUser(updated);
      await SecureStore.setItemAsync('aasaan_user', JSON.stringify(updated));
    } catch (err) {
      throw err;
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