import { Location } from './User';

/**
 * A work request is created by an end user and can be accepted by one or
 * more service providers.  Requests remain active for seven days (unless
 * manually closed) and can be boosted to improve visibility.  Accepted
 * providers are tracked along with the acceptance timestamp.  Ratings and
 * reviews are recorded when the request is closed.
 */
export interface WorkRequest {
  id: string;
  userId: string;
  service: string;
  location: Location;
  tags: string[];
  createdAt: Date;
  status: 'active' | 'closed';
  boosted: boolean;
  acceptedProviders: {
    providerId: string;
    acceptedAt: Date;
  }[];
  rating?: {
    providerId: string;
    stars: number;
    review?: string;
  };
  closedAt?: Date;
}