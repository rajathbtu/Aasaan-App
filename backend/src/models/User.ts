export type Role = 'endUser' | 'serviceProvider';

/**
 * A geographic location.  When persisting to a real database you would store
 * longitude/latitude separately; here we include the display name as well.
 */
export interface Location {
  name: string;
  lat: number;
  lng: number;
}

/**
 * Additional information associated with a service provider.  End users do
 * not define these fields.  A service provider may offer multiple
 * services and can define one or more locations and a radius in which
 * they are willing to work.  In the MVP we support a single location.
 */
export interface ServiceProviderInfo {
  services: string[];
  location: Location | null;
  radius: number;
}

/**
 * A registered user.  The phone number serves as the unique identifier
 * when logging in; however internally each user is assigned a UUID.  In
 * production you must store phone numbers encrypted to satisfy data
 * protection requirements.
 */
export interface User {
  id: string;
  name: string;
  phoneNumber: string;
  language: string;
  role: Role;
  serviceProviderInfo?: ServiceProviderInfo;
  creditPoints: number;
  plan: 'free' | 'basic' | 'pro';
  createdAt: Date;
}