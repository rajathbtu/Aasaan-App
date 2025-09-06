import React from 'react';
import 'react-native-get-random-values'; 
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { View, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Notifications from 'expo-notifications';
import { registerForPushNotificationsAsync } from './src/utils/notifications';

// Import screens
import LaunchScreen from './src/screens/LaunchScreen';
import LanguageSelectionScreen from './src/screens/LanguageSelectionScreen';
import MobileInputScreen from './src/screens/MobileInputScreen';
import OTPVerificationScreen from './src/screens/OTPVerificationScreen';
import NameOTPValidationScreen from './src/screens/NameOTPValidationScreen';
import RoleSelectScreen from './src/screens/RoleSelectScreen';
import WorkRequestSelectServiceScreen from './src/screens/WorkRequestSelectServiceScreen';
import WorkRequestAddDetailsScreen from './src/screens/WorkRequestAddDetailsScreen';
import WorkRequestCreatedScreen from './src/screens/WorkRequestCreatedScreen';
import BoostRequestScreen from './src/screens/BoostRequestScreen';
import WorkRequestDetailsScreen from './src/screens/WorkRequestDetailsScreen';
import NotificationsScreen from './src/screens/NotificationsScreen';
import SubscriptionScreen from './src/screens/SubscriptionScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import SPSelectServicesScreen from './src/screens/SPSelectServicesScreen';
import SPSelectLocationScreen from './src/screens/SPSelectLocationScreen';
import WorkRequestsScreen from './src/screens/WorkRequestsScreen';
import SPWorkRequestsScreen from './src/screens/SPWorkRequestsScreen';
import ServiceProviderProfileScreen from './src/screens/ServiceProviderProfileScreen';

// Navigation ref for programmatic navigation on notification taps
export const navigationRef = createNavigationContainerRef<any>();

// Define stack navigators
const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Splash/launch screen wrapper.  We show a spinner while the auth context
// finishes loading the current user from secure storage.
function RootNavigator() {
  const { user, loading, token } = useAuth();

  React.useEffect(() => {
    if (user && token) {
      registerForPushNotificationsAsync(token).catch(() => {});
    }
    const sub = Notifications.addNotificationResponseReceivedListener((response: Notifications.NotificationResponse) => {
      try {
        const data: any = response.notification.request.content.data;
        const reqId = data?.requestId;
        if (reqId && navigationRef.isReady()) {
          navigationRef.navigate('WorkRequestDetails', { id: reqId });
        }
      } catch {}
    });
    return () => {
      sub.remove();
    };
  }, [user, token]);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }
  const needsRole = !!user && !user.role;
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {user ? (
        needsRole ? (
          // Force role selection before accessing the app
          <>
            <Stack.Screen name="RoleSelect" component={RoleSelectScreen} />
            {/* Allow SP onboarding steps directly after role selection */}
            <Stack.Screen name="SPSelectServices" component={SPSelectServicesScreen} />
            <Stack.Screen name="SPSelectLocation" component={SPSelectLocationScreen} />
            {/* Language change if needed */}
            <Stack.Screen name="LanguageSelection" component={LanguageSelectionScreen} />
          </>
        ) : (
          <>
            {/* Main tab navigator */}
            <Stack.Screen name="Main" component={MainTabs} />
            {/* Screens accessible post-auth */}
            <Stack.Screen name="WorkRequestAddDetails" component={WorkRequestAddDetailsScreen} />
            <Stack.Screen name="WorkRequestCreated" component={WorkRequestCreatedScreen} />
            <Stack.Screen name="BoostRequest" component={BoostRequestScreen} />
            <Stack.Screen name="WorkRequestDetails" component={WorkRequestDetailsScreen} />
            <Stack.Screen name="ServiceProviderProfile" component={ServiceProviderProfileScreen} />
            <Stack.Screen name="Notifications" component={NotificationsScreen} />
            <Stack.Screen name="Subscription" component={SubscriptionScreen} />
            {/* Provider tools */}
            <Stack.Screen name="SPSelectServices" component={SPSelectServicesScreen} />
            <Stack.Screen name="SPSelectLocation" component={SPSelectLocationScreen} />
            {/* Language change from Profile */}
            <Stack.Screen name="LanguageSelection" component={LanguageSelectionScreen} />
          </>
        )
      ) : (
        <>
          <Stack.Screen name="Auth" component={AuthStack} />
        </>
      )}
    </Stack.Navigator>
  );
}

// Authentication and onboarding flow
function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Launch" component={LaunchScreen} />
      <Stack.Screen name="LanguageSelection" component={LanguageSelectionScreen} />
      <Stack.Screen name="MobileInput" component={MobileInputScreen} />
      <Stack.Screen name="OTPVerification" component={OTPVerificationScreen} />
      <Stack.Screen name="NameOTPValidation" component={NameOTPValidationScreen} />
      <Stack.Screen name="RoleSelect" component={RoleSelectScreen} />
      <Stack.Screen name="SPSelectServices" component={SPSelectServicesScreen} />
      <Stack.Screen name="SPSelectLocation" component={SPSelectLocationScreen} />
    </Stack.Navigator>
  );
}

// Main application tabs differ based on the user role
function MainTabs() {
  const { user } = useAuth();
  if (!user) return null;
  const isProvider = user.role === 'serviceProvider';
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;
          if (route.name === 'Create') {
            iconName = focused ? 'add-circle' : 'add-circle-outline';
          } else if (route.name === 'MyRequests' || route.name === 'Available') {
            iconName = focused ? 'list' : 'list-outline';
          } else {
            iconName = focused ? 'person' : 'person-outline';
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      {isProvider ? (
        <>
          <Tab.Screen name="Available" component={SPWorkRequestsScreen} />
          <Tab.Screen name="Profile" component={ProfileScreen} />
        </>
      ) : (
        <>
          <Tab.Screen name="Create" component={WorkRequestSelectServiceScreen} />
          <Tab.Screen name="MyRequests" component={WorkRequestsScreen} />
          <Tab.Screen name="Profile" component={ProfileScreen} />
        </>
      )}
    </Tab.Navigator>
  );
}

// Navigation stack type definitions
type AuthStackParamList = {
  Launch: undefined;
  LanguageSelection: undefined;
  MobileInput: undefined;
  OTPVerification: undefined;
  NameOTPValidation: undefined;
  RoleSelect: undefined;
  SPSelectServices: undefined;
  SPSelectLocation: undefined;
};

type RootStackParamList = {
  Main: undefined;
  WorkRequestAddDetails: undefined;
  WorkRequestCreated: undefined;
  BoostRequest: undefined;
  WorkRequestDetails: undefined;
  ServiceProviderProfile: { providerId?: string; providerData?: any };
  Notifications: undefined;
  Subscription: undefined;
  SPSelectServices: undefined;
  SPSelectLocation: undefined;
  LanguageSelection: undefined;
  Auth: undefined;
};

export type AuthStackNavigationProp = NativeStackNavigationProp<AuthStackParamList>;
export type RootStackNavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function App() {
  return (
    <AuthProvider>
      <SafeAreaProvider>
        <NavigationContainer ref={navigationRef}>
          <StatusBar style="dark" />
          <RootNavigator />
        </NavigationContainer>
      </SafeAreaProvider>
    </AuthProvider>
  );
}