/**
 * A work request is created by an end user and can be accepted by one or
 * more service providers.  Requests remain active for seven days (unless
 * manually closed) and can be boosted to improve visibility.  Accepted
 * providers are tracked along with the acceptance timestamp. The end user
 * selects one provider at closure, and both parties may rate each other.
 */
export interface WorkRequest {
  id: string;
  userId: string;
  service: string;
  locationName: string;
  locationLat: number;
  locationLng: number;
  tags: string[];
  createdAt: Date;
  status: 'active' | 'closed';
  boosted: boolean;
  selectedProviderId?: string | null;
  acceptedProviders: {
    providerId: string;
    acceptedAt: Date;
  }[];
  ratings?: {
    ratedUserId: string;
    submittedByUserId: string;
    stars: number;
    review?: string;
  }[];
  closedAt?: Date;
}