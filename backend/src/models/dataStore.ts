import { User, Role } from './User';
import { WorkRequest } from './WorkRequest';
import { Notification } from './Notification';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

/*
 * Simple in‑memory data store.  In a real deployment the following
 * collections would be replaced with calls to a database.  All data
 * persists only for the lifetime of the running process.
 */
export const users: User[] = [];
export const workRequests: WorkRequest[] = [];
export const notifications: Notification[] = [];

/**
 * Find a user by their phone number.  Returns undefined if the user does
 * not exist.
 */
export function findUserByPhone(phoneNumber: string): User | undefined {
  return users.find(u => u.phoneNumber === phoneNumber);
}

/**
 * Find a user by id.
 */
export function findUserById(id: string): User | undefined {
  return users.find(u => u.id === id);
}

/**
 * Create a new user.  Generates a UUID and stores the user in memory.
 */
export function createUser(params: Omit<User, 'id' | 'createdAt'>): User {
  const user: User = {
    id: uuidv4(),
    createdAt: new Date(),
    ...params,
  };
  users.push(user);
  return user;
}

/**
 * Create a new work request.  Applies a simple 7‑day expiry and default
 * values.
 */
export function createWorkRequest(params: Omit<WorkRequest, 'id' | 'createdAt' | 'status' | 'boosted' | 'acceptedProviders'>): WorkRequest {
  const wr: WorkRequest = {
    id: uuidv4(),
    createdAt: new Date(),
    status: 'active',
    boosted: false,
    acceptedProviders: [],
    ...params,
  };
  workRequests.push(wr);
  return wr;
}

/**
 * Push a notification for a user.
 */
export function pushNotification(notification: Omit<Notification, 'id' | 'createdAt' | 'read'>): Notification {
  const n: Notification = {
    id: uuidv4(),
    createdAt: new Date(),
    read: false,
    ...notification,
  };
  notifications.push(n);
  return n;
}

/**
 * Generate and return a numeric OTP.  In production you would send this
 * code via SMS using a third‑party provider.  Here we simply return it
 * directly.
 */
export function generateOTP(): number {
  return Math.floor(1000 + Math.random() * 9000);
}