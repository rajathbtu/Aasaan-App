import { Request, Response } from 'express';
import { isValidName, isValidPhoneNumber, isValidRadius } from '../utils/validation';
import { findUserById } from '../models/dataStore';
import { ServiceProviderInfo, Role } from '../models/User';

/**
 * Return the authenticated user’s profile.  The authentication middleware
 * attaches `user` to the request object.
 */
export function getProfile(req: Request, res: Response): void {
  const user = (req as any).user;
  res.json(user);
}

/**
 * Update the authenticated user’s profile.  Accepts partial updates
 * including name, language, role, service provider info and plan.  Basic
 * validations are performed here; you can extend this to enforce
 * restrictions (e.g. name change frequency).
 */
export function updateProfile(req: Request, res: Response): void {
  const user = (req as any).user;
  const {
    name,
    language,
    role,
    services,
    location,
    radius,
    plan,
  } = req.body as {
    name?: string;
    language?: string;
    role?: Role;
    services?: string[];
    location?: { name: string; lat: number; lng: number } | null;
    radius?: number;
    plan?: 'free' | 'basic' | 'pro';
  };
  if (name !== undefined) {
    if (!isValidName(name)) {
      return res.status(400).json({ message: 'Invalid name' });
    }
    user.name = name.trim();
  }
  if (language !== undefined) {
    user.language = language;
  }
  if (role !== undefined && role !== user.role) {
    user.role = role;
    // Initialise service provider info if switching to provider
    if (role === 'serviceProvider' && !user.serviceProviderInfo) {
      user.serviceProviderInfo = {
        services: [],
        location: null,
        radius: 5,
      };
    }
  }
  if (services !== undefined) {
    if (!Array.isArray(services) || services.length === 0) {
      return res.status(400).json({ message: 'Services must be a non‑empty array' });
    }
    if (!user.serviceProviderInfo) {
      return res.status(400).json({ message: 'User is not a service provider' });
    }
    user.serviceProviderInfo.services = services;
  }
  if (location !== undefined) {
    if (!user.serviceProviderInfo) {
      return res.status(400).json({ message: 'User is not a service provider' });
    }
    if (location === null) {
      user.serviceProviderInfo.location = null;
    } else {
      if (typeof location.name !== 'string' || typeof location.lat !== 'number' || typeof location.lng !== 'number') {
        return res.status(400).json({ message: 'Invalid location' });
      }
      user.serviceProviderInfo.location = {
        name: location.name,
        lat: location.lat,
        lng: location.lng,
      };
    }
  }
  if (radius !== undefined) {
    if (!user.serviceProviderInfo) {
      return res.status(400).json({ message: 'User is not a service provider' });
    }
    if (!isValidRadius(radius)) {
      return res.status(400).json({ message: 'Invalid radius value' });
    }
    user.serviceProviderInfo.radius = radius;
  }
  if (plan !== undefined) {
    user.plan = plan;
  }
  res.json(user);
}