import {
  getPathFromState as defaultGetPathFromState,
  getStateFromPath as defaultGetStateFromPath,
} from '@react-navigation/native';
import { Platform } from 'react-native';

/**
 * Deep-linking / browser-URL configuration for React Navigation.
 *
 * On web this makes the browser URL update on every screen change and lets
 * users land directly on a specific page by opening a URL (also usable for
 * refresh/back/forward).  On native devices the custom URL scheme declared in
 * app.json ("aasaan") is used, e.g. aasaan://select-services?phone=...&otp=...
 */

// URL scheme from app.json ("scheme": "aasaan") used by native deep links.
const NATIVE_SCHEME_PREFIX = 'aasaan://';

// On web the app is served from the current origin (localhost in dev, the
// production domain in deployment), so it must be accepted as a prefix too.
const webOriginPrefix =
  Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.origin
    ? window.location.origin
    : null;

export const linkingPrefixes: string[] = [
  NATIVE_SCHEME_PREFIX,
  ...(webOriginPrefix ? [webOriginPrefix] : []),
];

// These screens use transient workflow state that should stay in navigation
// memory rather than becoming shareable query parameters.
const HIDDEN_PARAM_SCREENS = new Set([
  'LocationSelect',
  'WorkRequestAddDetails',
  'WorkRequestSelectTags',
]);

const removeHiddenScreenParams = (state: any): any => ({
  ...state,
  routes: state.routes?.map((route: any) => ({
    ...route,
    ...(HIDDEN_PARAM_SCREENS.has(route.name) ? { params: undefined } : {}),
    ...(route.state ? { state: removeHiddenScreenParams(route.state) } : {}),
  })),
});

const getPathFromState = (state: any, options?: any): string =>
  defaultGetPathFromState(removeHiddenScreenParams(state), options);

const getStateFromPath = (path: string, options?: any): any =>
  removeHiddenScreenParams(defaultGetStateFromPath(path, options));

/**
 * Screen name -> URL path mapping.  The structure mirrors the navigators in
 * App.tsx:
 *
 *  - "Auth" holds the unauthenticated onboarding stack (Launch, language,
 *    mobile input, OTP, registration, role and provider onboarding steps).
 *  - "Main" holds the end-user bottom tabs.
 *  - The remaining entries are root-level screens reachable post-auth.
 *
 * A nested navigator without a `path` is transparent, so the onboarding
 * screens above resolve at the top level of the site (e.g. /select-services).
 */
const screens: Record<string, unknown> = {
  // ---- Onboarding / auth flow (unauthenticated users) ----
  Auth: {
    screens: {
      Launch: '',
      LanguageSelection: 'select-language',
      MobileInput: 'mobile-input',
      OTPVerification: 'verify-otp',
      NameOTPValidation: 'name-otp-validation',
    },
  },
  // ---- Main bottom tabs (end users) ----
  Main: {
    screens: {
      Create: 'create-request',
      MyRequests: 'my-requests',
      Available: 'available-requests',
      Profile: 'profile',
    },
  },
  // ---- Root-level screens (also registered post-auth in App.tsx) ----
  RoleSelect: 'select-role',
  SPOnboardSimple: 'sp-onboard-simple',
  SPSelectServices: 'select-services',
  LocationSelect: 'select-location',
  // Work-request creation funnel. Workflow params remain in navigation state
  // and are intentionally excluded from browser/native deep-link URLs.
  WorkRequestAddDetails: 'request/location',
  WorkRequestSelectTags: 'request/tags',
  WorkRequestCreated: 'request/created',
  BoostRequest: 'boost',
  WorkRequestDetails: 'requests/:id',
  Notifications: 'notifications',
  Subscription: 'subscription',
};

export const linking = {
  prefixes: linkingPrefixes,
  getPathFromState,
  getStateFromPath,
  config: {
    screens,
  },
};

/**
 * Browser tab titles per screen.  Screens that don't set a `title` option
 * fall back to this map, and finally to the app name.
 */
const SCREEN_TITLES: Record<string, string> = {
  Launch: 'Aasaan',
  LanguageSelection: 'Select Language',
  MobileInput: 'Enter Mobile Number',
  OTPVerification: 'Verify OTP',
  NameOTPValidation: 'Create Account',
  RoleSelect: 'Choose your Role',
  SPOnboardSimple: 'Service Provider Onboarding',
  SPSelectServices: 'Select Services',
  LocationSelect: 'Select Location',
  WorkRequestAddDetails: 'Select Location',
  WorkRequestSelectTags: 'Select Details',
  WorkRequestCreated: 'Request Created',
  BoostRequest: 'Boost Request',
  WorkRequestDetails: 'Request Details',
  Notifications: 'Notifications',
  Subscription: 'Subscription',
  Profile: 'Profile',
  SPAvailable: 'Available Requests',
  Create: 'Create Request',
  MyRequests: 'My Requests',
  Available: 'Available Requests',
};

export const documentTitle = {
  enabled: Platform.OS === 'web',
  formatter: (
    options: { title?: string } | undefined,
    route: { name?: string } | undefined
  ): string => options?.title || (route?.name ? SCREEN_TITLES[route.name] : undefined) || 'Aasaan',
};
