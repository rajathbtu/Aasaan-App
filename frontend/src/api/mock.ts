/*
 * Mock API implementation for offline development.  The functions in this
 * module mirror the real API in `index.ts` but operate purely in
 * memory, simulating network latency via `setTimeout`.  When
 * `USE_MOCK_API` in `src/config.ts` is set to true the frontend will use
 * these implementations instead of making HTTP calls.
 */


import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

interface User {
  id: string;
  name: string;
  phone: string;
  language: string;
  role: 'endUser' | 'serviceProvider';
  serviceProviderInfo?: {
    services: string[];
    location?: { name: string; lat: number; lng: number };
    radius?: number;
  };
  creditPoints: number;
  plan: 'free' | 'basic' | 'pro';
}

interface WorkRequest {
  id: string;
  userId: string;
  service: string;
  location: { name: string; lat: number; lng: number };
  tags: string[];
  createdAt: Date;
  status: 'active' | 'closed';
  boosted: boolean;
  acceptedProviders: string[];
}

interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: Date;
}

let currentOtp: number | null = null;
const pendingPhones: Set<string> = new Set();
const users: User[] = [];
const workRequests: WorkRequest[] = [];
const notifications: Notification[] = [];

function timeout<T>(result: T, ms = 300): Promise<T> {
  return new Promise(resolve => setTimeout(() => resolve(result), ms));
}

export async function sendOtp(phone: string) {
  currentOtp = 1234;
  pendingPhones.add(phone);
  console.log(`Mock OTP for ${phone}: ${currentOtp}`);
  return timeout({ message: 'OTP sent' });
}

export async function verifyOtp(phone: string, otp: number) {
  if (!pendingPhones.has(phone) || otp !== currentOtp) {
    return timeout({ message: 'Incorrect OTP', error: true });
  }
  const existing = users.find(u => u.phone === phone);
  if (existing) {
    return timeout({ token: existing.id, user: existing });
  }
  return timeout({ needsRegistration: true });
}

export async function registerUser(
  phone: string,
  name: string,
  language: string,
  role: 'endUser' | 'serviceProvider'
) {
  const user: User = {
    id: uuidv4(),
    name,
    phone,
    language,
    role,
    creditPoints: 0,
    plan: 'free',
  };
  if (role === 'serviceProvider') {
    user.serviceProviderInfo = { services: [], location: undefined, radius: undefined };
  }
  users.push(user);
  pendingPhones.delete(phone);
  return timeout({ token: user.id, user });
}

export async function getProfile(token: string) {
  const user = users.find(u => u.id === token);
  if (!user) throw new Error('Unauthenticated');
  return timeout(user);
}

export async function updateProfile(token: string, updates: Partial<User>) {
  const user = users.find(u => u.id === token);
  if (!user) throw new Error('Unauthenticated');
  Object.assign(user, updates);
  return timeout(user);
}

export async function createWorkRequest(
  token: string,
  payload: { service: string; location: any; tags: string[]; force?: boolean }
) {
  const user = users.find(u => u.id === token);
  if (!user) throw new Error('Unauthenticated');
  const wr: WorkRequest = {
    id: uuidv4(),
    userId: user.id,
    service: payload.service,
    location: payload.location,
    tags: payload.tags,
    createdAt: new Date(),
    status: 'active',
    boosted: false,
    acceptedProviders: [],
  };
  workRequests.push(wr);
  return timeout(wr);
}

export async function listWorkRequests(token: string) {
  const user = users.find(u => u.id === token);
  if (!user) throw new Error('Unauthenticated');
  if (user.role === 'endUser') {
    return timeout(workRequests.filter(wr => wr.userId === user.id));
  }
  // provider: show all active
  return timeout(workRequests.filter(wr => wr.status === 'active'));
}

export async function getWorkRequest(token: string, id: string) {
  const wr = workRequests.find(w => w.id === id);
  return timeout(wr || null);
}

export async function acceptWorkRequest(token: string, id: string) {
  const user = users.find(u => u.id === token);
  const wr = workRequests.find(w => w.id === id);
  if (!user || !wr) throw new Error('Not found');
  if (!wr.acceptedProviders.includes(user.id)) {
    wr.acceptedProviders.push(user.id);
  }
  return timeout(wr);
}

export async function closeWorkRequest(
  token: string,
  id: string,
  payload: { providerId?: string; stars?: number; review?: string }
) {
  const wr = workRequests.find(w => w.id === id);
  if (!wr) throw new Error('Not found');
  wr.status = 'closed';
  return timeout(wr);
}

export async function boostWorkRequest(token: string, requestId: string, useCredits?: boolean) {
  const wr = workRequests.find(w => w.id === requestId);
  if (!wr) throw new Error('Not found');
  wr.boosted = true;
  return timeout(wr);
}

export async function subscribePlan(token: string, plan: 'basic' | 'pro', useCredits?: boolean) {
  const user = users.find(u => u.id === token);
  if (!user) throw new Error('Unauthenticated');
  user.plan = plan;
  return timeout(user);
}

export async function getNotifications(token: string, unreadOnly?: boolean) {
  const user = users.find(u => u.id === token);
  if (!user) throw new Error('Unauthenticated');
  let list = notifications.filter(n => n.userId === user.id);
  if (unreadOnly) {
    list = list.filter(n => !n.read);
  }
  return timeout(list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()));
}

export async function markAllNotificationsRead(token: string) {
  const user = users.find(u => u.id === token);
  if (!user) throw new Error('Unauthenticated');
  notifications.forEach(n => {
    if (n.userId === user.id) n.read = true;
  });
  return timeout({ count: 0 });
}