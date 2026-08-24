import React, { useEffect, useRef } from 'react';
import 'react-native-get-random-values'; 
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { View, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { locationManager } from './src/services/LocationManager';
import { colors, radius, spacing } from './src/theme';
import * as Notifications from 'expo-notifications';

// Import screens
import LaunchScreen from './src/screens/LaunchScreen';
import LanguageSelectionScreen from './src/screens/LanguageSelectionScreen';
import MobileInputScreen from './src/screens/MobileInputScreen';
import OTPVerificationScreen from './src/screens/OTPVerificationScreen';
import NameOTPValidationScreen from './src/screens/NameOTPValidationScreen';
import RoleSelectScreen from './src/screens/RoleSelectScreen';
import WorkRequestSelectServiceScreen from './src/screens/WorkRequestSelectServiceScreen';
import WorkRequestSelectTagsScreen from './src/screens/WorkRequestSelectTagsScreen';
import WorkRequestCreatedScreen from './src/screens/WorkRequestCreatedScreen';
import BoostRequestScreen from './src/screens/BoostRequestScreen';
import WorkRequestDetailsScreen from './src/screens/WorkRequestDetailsScreen';
import WorkRequestsScreen from './src/screens/WorkRequestsScreen';
import NotificationsScreen from './src/screens/NotificationsScreen';
import SubscriptionScreen from './src/screens/SubscriptionScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import SPSelectServicesScreen from './src/screens/SPSelectServicesScreen';
import LocationSelectScreen from './src/screens/LocationSelectScreen';
import SPWorkRequestsScreen from './src/screens/SPWorkRequestsScreen';
import { getNotificationNavigationTarget, NotificationUserRole } from './src/utils/notificationNavigation';

// Define stack navigators
const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const navigationRef = React.createRef<any>();
const pendingNotification = { value: null as { type: string; requestId: string } | null };

function navigateToNotificationTarget(role: NotificationUserRole, type: string, requestId: string): boolean {
  const target = getNotificationNavigationTarget(role, type, requestId);
  if (!target) return true;
  navigationRef.current?.navigate(target.screen, target.params);
  return true;
}

function NotificationHandler({ navigationReady }: { navigationReady: boolean }) {
  const { user } = useAuth();
  const responseListener = useRef<Notifications.EventSubscription | null>(null);
  const navigationReadyRef = useRef(navigationReady);

  navigationReadyRef.current = navigationReady;

  useEffect(() => {
    void locationManager.initialize();
    const handleNotificationResponse = (response: Notifications.NotificationResponse) => {
      const data = response.notification.request.content.data;
      const requestId = data?.requestId;
      const type = data?.type;
      if (typeof requestId !== 'string' || typeof type !== 'string') return;
      if (!user?.role || !navigationReadyRef.current || !navigationRef.current?.isReady()) {
        pendingNotification.value = { type, requestId };
        return;
      }
      navigateToNotificationTarget(user.role, type, requestId);
      pendingNotification.value = null;
    };

    responseListener.current = Notifications.addNotificationResponseReceivedListener(handleNotificationResponse);
    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) handleNotificationResponse(response);
    });
    return () => responseListener.current?.remove();
  }, [user?.role]);

  useEffect(() => {
    const pending = pendingNotification.value;
    if (!pending || !user?.role || !navigationReady || !navigationRef.current?.isReady()) return;
    if (navigateToNotificationTarget(user.role, pending.type, pending.requestId)) {
      pendingNotification.value = null;
    }
  }, [user?.role, navigationReady]);

  return null;
}

// Splash/launch screen wrapper.  We show a spinner while the auth context
// finishes loading the current user from secure storage.
function RootNavigator() {
  const { user, loading } = useAuth();
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
            <Stack.Screen name="LocationSelect" component={LocationSelectScreen} />
            {/* Language change if needed */}
            <Stack.Screen name="LanguageSelection" component={LanguageSelectionScreen} />
          </>
        ) : (
          <>
            {/* Main tab navigator for regular users, direct screens for providers */}
            {user.role === 'serviceProvider' ? (
              <>
                <Stack.Screen name="SPAvailable" component={SPWorkRequestsScreen} />
                <Stack.Screen name="Profile" component={ProfileScreen} />
              </>
            ) : (
              <Stack.Screen name="Main" component={MainTabs} />
            )}
            {/* Screens accessible post-auth */}
            <Stack.Screen name="RoleSelect" component={RoleSelectScreen} />
            <Stack.Screen name="WorkRequestAddDetails" component={LocationSelectScreen} />
            <Stack.Screen name="WorkRequestSelectTags" component={WorkRequestSelectTagsScreen} />
            <Stack.Screen name="WorkRequestCreated" component={WorkRequestCreatedScreen} />
            <Stack.Screen name="BoostRequest" component={BoostRequestScreen} />
            <Stack.Screen name="WorkRequestDetails" component={WorkRequestDetailsScreen} />
            <Stack.Screen name="Notifications" component={NotificationsScreen} />
            <Stack.Screen name="Subscription" component={SubscriptionScreen} />
            {/* Provider tools */}
            <Stack.Screen name="SPSelectServices" component={SPSelectServicesScreen} />
            <Stack.Screen name="LocationSelect" component={LocationSelectScreen} />
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
      <Stack.Screen name="LocationSelect" component={LocationSelectScreen} />
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
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.grey,
        tabBarStyle: {
          backgroundColor: colors.white,
          borderTopColor: colors.greyLight,
          borderTopWidth: 1,
          elevation: 8,
          shadowColor: colors.dark,
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.08,
          shadowRadius: 8,
          paddingTop: spacing.xs,
          // paddingBottom: spacing.sm,
        },
        tabBarItemStyle: {
          minHeight: 48,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '700',
        },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;
          if (route.name === 'Create') {
            iconName = focused ? 'add-circle' : 'add-circle-outline';
          } else if (route.name === 'MyRequests') {
            iconName = focused ? 'reader' : 'reader-outline';
          } else if (route.name === 'Available') {
            iconName = focused ? 'briefcase' : 'briefcase-outline';
          } else {
            iconName = focused ? 'person-circle' : 'person-circle-outline';
          }
          return (
          <View style={{
                width: 50,
                height: 28,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: radius.lg,
                backgroundColor: focused ? colors.primaryLight : 'transparent',}}>
              <Ionicons name={iconName} size={size} color={color} />
            </View>
          );
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
          <Tab.Screen name="MyRequests" component={WorkRequestsScreen} options={{ title: 'My Requests' }} />
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
  LocationSelect: undefined;
};

type RootStackParamList = {
  Main: undefined;
  RoleSelect: undefined;
  WorkRequestAddDetails: undefined;
  WorkRequestSelectTags: undefined;
  WorkRequestCreated: undefined;
  BoostRequest: undefined;
  WorkRequestDetails: undefined;
  Notifications: undefined;
  Subscription: undefined;
  SPSelectServices: undefined;
  LocationSelect: undefined;
  LanguageSelection: undefined;
  Auth: undefined;
};

export type AuthStackNavigationProp = NativeStackNavigationProp<AuthStackParamList>;
export type RootStackNavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function App() {
  const [navigationReady, setNavigationReady] = React.useState(false);

  return (
    <AuthProvider>
      <NotificationHandler navigationReady={navigationReady} />
      <SafeAreaProvider>
        <NavigationContainer ref={navigationRef} onReady={() => setNavigationReady(true)}>
          <StatusBar style="dark" />
          <RootNavigator />
        </NavigationContainer>
      </SafeAreaProvider>
    </AuthProvider>
  );
}