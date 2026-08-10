import React, { useEffect, useState } from 'react';
import * as Location from 'expo-location';

export type LocationStatus =
  | 'idle'
  | 'fetching'
  | 'available'
  | 'permission_required'
  | 'permission_denied'
  | 'location_disabled'
  | 'error';

export type LocationSource = 'gps' | 'ip';

export type LocationRecord = {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  timestamp: number;
  source: LocationSource;
  name?: string | null;
};

export type LocationSnapshot = {
  gpsStatus: LocationStatus;
  gpsLocation: LocationRecord | null;
  ipLocation: LocationRecord | null;
  permissionStatus: Location.PermissionStatus | null;
  locationEnabled: boolean | null;
  error: string | null;
};

class LocationManager {
  private listeners = new Set<(snapshot: LocationSnapshot) => void>();
  private gpsLocation: LocationRecord | null = null;
  private ipLocation: LocationRecord | null = null;
  private gpsStatus: LocationStatus = 'idle';
  private permissionStatus: Location.PermissionStatus | null = null;
  private locationEnabled: boolean | null = null;
  private error: string | null = null;
  private gpsRequest: Promise<LocationRecord | null> | null = null;
  private ipRequest: Promise<LocationRecord | null> | null = null;
  private initialized = false;

  subscribe(listener: (snapshot: LocationSnapshot) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getSnapshot(): LocationSnapshot {
    return {
      gpsStatus: this.gpsStatus,
      gpsLocation: this.gpsLocation,
      ipLocation: this.ipLocation,
      permissionStatus: this.permissionStatus,
      locationEnabled: this.locationEnabled,
      error: this.error,
    };
  }

  private notify() {
    const snapshot = this.getSnapshot();
    this.listeners.forEach((listener) => listener(snapshot));
  }

  async initialize() {
    if (this.initialized) {
      return this.getSnapshot();
    }

    this.initialized = true;
    void this.refreshPermissionStatus();
    void this.loadIpLocation();
    return this.getSnapshot();
  }

  async refreshPermissionStatus() {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      this.permissionStatus = status;

      if (status === 'granted') {
        const servicesEnabled = await Location.hasServicesEnabledAsync();
        this.locationEnabled = servicesEnabled;

        if (!servicesEnabled) {
          this.gpsStatus = 'location_disabled';
          this.error = null;
        } else {
          this.gpsStatus = this.gpsLocation ? 'available' : 'idle';
          this.error = null;
          if (!this.gpsLocation && !this.gpsRequest) {
            void this.getGPSLocation();
          }
        }
      } else if (status === 'denied' || (status as string) === 'restricted') {
        this.gpsStatus = 'permission_denied';
        this.error = null;
      } else {
        this.gpsStatus = 'permission_required';
        this.error = null;
      }
    } catch (error: any) {
      this.gpsStatus = 'error';
      this.error = error?.message || 'Unable to check location permission';
    }

    this.notify();
  }

  async requestPermission(): Promise<Location.PermissionStatus> {
    const current = await Location.getForegroundPermissionsAsync();
    if (current.status === 'granted') {
      this.permissionStatus = current.status;
      this.gpsStatus = this.gpsLocation ? 'available' : 'idle';
      this.notify();
      return current.status;
    }

    const result = await Location.requestForegroundPermissionsAsync();
    this.permissionStatus = result.status;

    if (result.status === 'granted') {
      this.locationEnabled = await Location.hasServicesEnabledAsync();
      if (!this.locationEnabled) {
        this.gpsStatus = 'location_disabled';
      } else {
        this.gpsStatus = this.gpsLocation ? 'available' : 'idle';
        if (!this.gpsLocation && !this.gpsRequest) {
          void this.getGPSLocation();
        }
      }
      this.error = null;
    } else if (result.status === 'denied' || (result.status as string) === 'restricted') {
      this.gpsStatus = 'permission_denied';
      this.error = null;
    } else {
      this.gpsStatus = 'permission_required';
    }

    this.notify();
    return result.status;
  }

  async getIPLocation(): Promise<LocationRecord | null> {
    if (this.ipLocation) {
      return this.ipLocation;
    }

    if (this.ipRequest) {
      return this.ipRequest;
    }

    this.ipRequest = this.loadIpLocation();
    const result = await this.ipRequest;
    this.ipRequest = null;
    return result;
  }

  async loadIpLocation(): Promise<LocationRecord | null> {
    const endpoints = [
      'https://ipapi.co/json/',
      'https://ipinfo.io/json',
    ];

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint);
        if (!response.ok) {
          continue;
        }

        const payload = await response.json();
        const locParts = typeof payload.loc === 'string' ? payload.loc.split(',') : [];
        const latitude = Number(payload.latitude ?? locParts[0]);
        const longitude = Number(payload.longitude ?? locParts[1]);

        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
          continue;
        }

        const locationName = [
          payload.city,
          payload.region || payload.region_name,
          payload.country_name || payload.country,
        ]
          .filter(Boolean)
          .join(', ')
          .trim() || null;

        const record: LocationRecord = {
          latitude,
          longitude,
          accuracy: null,
          timestamp: Date.now(),
          source: 'ip',
          name: locationName,
        };

        this.ipLocation = record;
        this.notify();
        return record;
      } catch (error) {
        console.warn(`Unable to determine approximate IP location from ${endpoint}`, error);
      }
    }

    return null;
  }

  async getGPSLocation(): Promise<LocationRecord | null> {
    if (this.gpsLocation) {
      return this.gpsLocation;
    }

    if (this.gpsRequest) {
      return this.gpsRequest;
    }

    const permissionResponse = await Location.getForegroundPermissionsAsync();
    this.permissionStatus = permissionResponse.status;

    if (permissionResponse.status !== 'granted') {
      if (permissionResponse.status === 'denied' || (permissionResponse.status as string) === 'restricted') {
        this.gpsStatus = 'permission_denied';
        this.error = null;
      } else {
        this.gpsStatus = 'permission_required';
        this.error = null;
        this.notify();
        const permission = await this.requestPermission();
        if (permission !== 'granted') {
          return null;
        }
      }
    }

    const servicesEnabled = await Location.hasServicesEnabledAsync();
    this.locationEnabled = servicesEnabled;

    if (!servicesEnabled) {
      this.gpsStatus = 'location_disabled';
      this.error = null;
      this.notify();
      return null;
    }

    this.gpsStatus = 'fetching';
    this.notify();

    this.gpsRequest = (async (): Promise<LocationRecord | null> => {
      try {
        const position = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
          mayShowUserSettingsDialog: true,
        });

        const record: LocationRecord = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy ?? null,
          timestamp: position.timestamp ?? Date.now(),
          source: 'gps',
        };

        this.gpsLocation = record;
        this.gpsStatus = 'available';
        this.error = null;
        this.notify();
        return record;
      } catch (error: any) {
        this.gpsStatus = 'error';
        this.error = error?.message || 'Unable to fetch current location';
        this.notify();
        return null;
      } finally {
        this.gpsRequest = null;
      }
    })();

    return this.gpsRequest;
  }
}

export const locationManager = new LocationManager();

export function useLocation() {
  const [snapshot, setSnapshot] = useState<LocationSnapshot>(() => locationManager.getSnapshot());

  useEffect(() => {
    const unsubscribe = locationManager.subscribe(setSnapshot);
    return () => {
      unsubscribe();
    };
  }, []);

  return {
    ...snapshot,
    getGPSLocation: () => locationManager.getGPSLocation(),
    getIPLocation: () => locationManager.getIPLocation(),
    requestPermission: () => locationManager.requestPermission(),
    refreshPermissionStatus: () => locationManager.refreshPermissionStatus(),
  };
}
