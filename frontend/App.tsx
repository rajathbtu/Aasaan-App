import React from 'react';
import 'react-native-get-random-values'; 
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { View, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';

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
import WorkRequestsScreen from './src/screens/WorkRequestsScreen';
import NotificationsScreen from './src/screens/NotificationsScreen';
import SubscriptionScreen from './src/screens/SubscriptionScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import SPSelectServicesScreen from './src/screens/SPSelectServicesScreen';
import SPSelectLocationScreen from './src/screens/SPSelectLocationScreen';
import SPWorkRequestsScreen from './src/screens/SPWorkRequestsScreen';

// Define stack navigators
const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

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
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {user ? (
        <>
          {/* Main tab navigator */}
          <Stack.Screen name="Main" component={MainTabs} />
          {/* Screens accessible post-auth */}
          <Stack.Screen name="WorkRequestAddDetails" component={WorkRequestAddDetailsScreen} />
          <Stack.Screen name="WorkRequestCreated" component={WorkRequestCreatedScreen} />
          <Stack.Screen name="BoostRequest" component={BoostRequestScreen} />
          <Stack.Screen name="WorkRequestDetails" component={WorkRequestDetailsScreen} />
          <Stack.Screen name="Notifications" component={NotificationsScreen} />
          <Stack.Screen name="Subscription" component={SubscriptionScreen} />
          {/* Provider edit/onboarding tools available from Profile */}
          <Stack.Screen name="SPSelectServices" component={SPSelectServicesScreen} />
          <Stack.Screen name="SPSelectLocation" component={SPSelectLocationScreen} />
        </>
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

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer>
        <StatusBar style="dark" />
        <RootNavigator />
      </NavigationContainer>
    </AuthProvider>
  );
}