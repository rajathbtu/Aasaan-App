import axios from 'axios';
import { BASE_URL } from '../config';

// Create an Axios instance with a base URL.  The instance will be used
// throughout the app to make HTTP requests.  Authorization headers are
// injected by each method as appropriate.
const api = axios.create({
  baseURL: BASE_URL,
});

/**
 * Sends an OTP to the specified phone number.
 */
export async function sendOtp(phone: string) {
  const res = await api.post('/auth/send-otp', { phone });
  return res.data;
}

/**
 * Verifies the OTP.  If successful, returns an object containing
 * either a token/user or a flag indicating that registration is
 * required.
 */
export async function verifyOtp(phone: string, otp: number) {
  const res = await api.post('/auth/verify-otp', { phone, otp });
  return res.data;
}

/**
 * Registers a new user.  Returns the token and user data.
 */
export async function registerUser(
  phone: string,
  name: string,
  language: string,
  role: 'endUser' | 'serviceProvider',
  otp: string // Added OTP parameter
) {
  const res = await api.post('/auth/register', { phone, name, language, role, otp });
  return res.data;
}

/**
 * Fetch the current user’s profile.  Requires a bearer token.
 */
export async function getProfile(token: string) {
  const res = await api.get('/users/me', {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
}

/**
 * Update the current user’s profile.  Accepts partial updates.
 */
export async function updateProfile(
  token: string,
  updates: any
) {
  const res = await api.put('/users/me', updates, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
}

/**
 * Create a new work request.
 */
export async function createWorkRequest(
  token: string,
  payload: { service: string; location: any; tags: string[]; force?: boolean }
) {
  const res = await api.post('/work-requests', payload, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
}

/**
 * List work requests relevant to the authenticated user.  End users see
 * their own requests and service providers see eligible requests.
 */
export async function listWorkRequests(token: string) {
  const res = await api.get('/work-requests', {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
}

/**
 * Retrieve a single work request by ID.
 */
export async function getWorkRequest(token: string, id: string) {
  const res = await api.get(`/work-requests/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
}

/**
 * Accept a work request (service provider).
 */
export async function acceptWorkRequest(token: string, id: string) {
  const res = await api.put(`/work-requests/${id}/accept`, {}, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
}

/**
 * Close a work request (end user).  Optionally include a rating.
 */
export async function closeWorkRequest(
  token: string,
  id: string,
  payload: { providerId?: string; stars?: number; review?: string }
) {
  const res = await api.put(`/work-requests/${id}/close`, payload, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
}

/**
 * Boost a work request by paying or using credits.
 */
export async function boostWorkRequest(
  token: string,
  requestId: string,
  useCredits?: boolean
) {
  const res = await api.post(
    '/payments/boost',
    { requestId, useCredits },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return res.data;
}

/**
 * Subscribe to a professional plan.
 */
export async function subscribePlan(
  token: string,
  plan: 'basic' | 'pro',
  useCredits?: boolean
) {
  const res = await api.post(
    '/payments/subscribe',
    { plan, useCredits },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return res.data;
}

/**
 * Fetch notifications for the authenticated user.
 */
export async function getNotifications(token: string, unreadOnly?: boolean) {
  const res = await api.get('/notifications', {
    params: { unread: unreadOnly ? 'true' : undefined },
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
}

/**
 * Mark all notifications as read.
 */
export async function markAllNotificationsRead(token: string) {
  const res = await api.put(
    '/notifications/mark-all-read',
    {},
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return res.data;
}

/**
 * Fetch available services.
 */
export async function getServices() {
  const res = await api.get('/services');
  return res.data as { services: Array<{ id: string; name: string; category: string; tags: string[] }>; updatedAt: string };
}

/**
 * Checks if a user is already registered based on their phone number.
 */
export async function checkUserRegistration(phone: string) {
  const res = await api.post('/auth/check-registration', { phone });
  return res.data;
}