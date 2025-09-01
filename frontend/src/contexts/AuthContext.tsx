import React, { createContext, useContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import { getProfile, updateProfile, registerDevice, unregisterDevice } from '../api';
import { USE_MOCK_API } from '../config';
import * as mock from '../api/mock';
import { AuthStackNavigationProp } from '../../App';
import { Platform } from 'react-native';
import { 
  requestNotificationPermission, 
  getFCMToken, 
  setupForegroundMessageHandler,
  setupNotificationOpenedHandler 
} from '../services/notificationService';

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
  // const navigation = useNavigation<AuthStackNavigationProp>();
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [deviceToken, setDeviceToken] = useState<string | null>(null);

  async function setupPushNotifications(authToken: string) {
    if (Platform.OS === 'web') return;

    try {
      // Request permission
      const hasPermission = await requestNotificationPermission();
      if (!hasPermission) {
        console.log('Push notification permission denied');
        return;
      }

      // Get FCM token
      const fcmToken = await getFCMToken();
      if (fcmToken) {
        setDeviceToken(fcmToken);
        await registerDevice(authToken, {
          token: fcmToken,
          platform: Platform.OS,
        });
        console.log('FCM token registered successfully');
      }

      // Set up message handlers
      const unsubscribeForeground = setupForegroundMessageHandler((message) => {
        console.log('Foreground message received:', message);
        // Handle in-app notification display here
      });

      const unsubscribeOpened = setupNotificationOpenedHandler((notification) => {
        console.log('Notification opened app:', notification);
        // Handle navigation based on notification data here
      });

      return () => {
        unsubscribeForeground?.();
        unsubscribeOpened?.();
      };
    } catch (error) {
      console.warn('Push notification setup failed:', error);
    }
  }

  // Attempt to load token/user from secure storage on mount
  useEffect(() => {
    (async () => {
      try {
        const storedToken = await SecureStore.getItemAsync('aasaan_token');
        const storedUser = await SecureStore.getItemAsync('aasaan_user');
        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
          // Setup push notifications in background
          setupPushNotifications(storedToken);
        }
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = async (tok: string, usr: User, navigation?: AuthStackNavigationProp) => {
    setToken(tok);
    setUser(usr);
    await SecureStore.setItemAsync('aasaan_token', tok);
    await SecureStore.setItemAsync('aasaan_user', JSON.stringify(usr));

    // Setup push notifications
    setupPushNotifications(tok);

    // Redirect to role selection page if role is null
    if (!usr.role && navigation) {
      navigation.navigate('RoleSelect');
    }
  };

  const logout = async () => {
    // Unregister device token on server
    try {
      if (token && deviceToken) {
        await unregisterDevice(token, deviceToken);
        console.log('Device token unregistered successfully');
      }
    } catch (error) {
      console.warn('Failed to unregister device token:', error);
    }

    setToken(null);
    setUser(null);
    setDeviceToken(null);
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