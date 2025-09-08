import { Request, Response } from 'express';
import { isValidName, isValidRadius } from '../utils/validation';
import prisma from '../utils/prisma';
import { Role } from '../models/User';
import { getReqLang, t } from '../utils/i18n';

export async function getProfile(req: Request, res: Response): Promise<void> {
  const authUser = (req as any).user as { id: string };
  const lang = getReqLang(req);
  
  
  try {
    const user = await prisma.user.findUnique({ 
      where: { id: authUser.id },
      include: {
        serviceProviderInfo: {
          include: {
            location: true
          }
        }
      }
    });
    if (!user) { 
      res.status(404).json({ message: t(lang, 'user.notFound') }); 
      return; 
    }
    
    res.json({ ...user, role: user.role ?? null, serviceProviderInfo: user.serviceProviderInfo || null });
  } catch (err: any) {
    res.status(500).json({ message: t(lang, 'user.profileFetchFailed') });
  }
}

export async function updateProfile(req: Request, res: Response): Promise<void> {
  const authUser = (req as any).user as { id: string };
  const lang = getReqLang(req);
  const { name, language, role, services, location, radius, plan, avatarUrl } = req.body as {
    name?: string;
    language?: string;
    role?: Role;
    services?: string[];
    location?: { name: string; lat: number; lng: number } | null;
    radius?: number;
    plan?: 'free' | 'basic' | 'pro';
    avatarUrl?: string | null;
  };


  const data: any = {};
  if (name !== undefined) {
    if (!isValidName(name)) { 
      res.status(400).json({ message: t(lang, 'auth.invalidName') }); 
      return; 
    }
    data.name = name.trim();
  }
  if (language !== undefined) data.language = language;
  if (plan !== undefined) data.plan = plan;
  if (role !== undefined) data.role = role;
  if (avatarUrl !== undefined) {
    if (avatarUrl !== null && typeof avatarUrl !== 'string') { res.status(400).json({ message: t(lang, 'user.invalidAvatarUrl') }); return; }
    data.avatarUrl = avatarUrl;
  }

  // Ensure services, radius, and location are properly validated and handled
  if (services !== undefined) {
    if (!Array.isArray(services) || services.some(s => typeof s !== 'string' || !s.trim())) {
      res.status(400).json({ message: t(lang, 'user.invalidServicesArray') });
      return;
    }
  }

  if (radius !== undefined) {
    if (typeof radius !== 'number' || !isValidRadius(radius)) { res.status(400).json({ message: t(lang, 'user.invalidRadius') }); return; }
  }

  if (location !== undefined) {
    if (location === null) {
      // Allow null to disconnect location
    } else if (
      typeof location.name !== 'string' || typeof location.lat !== 'number' || typeof location.lng !== 'number'
    ) {
      res.status(400).json({ message: t(lang, 'user.invalidLocation') });
      return;
    }
  }

  // Ensure services, location, and radius are handled in ServiceProviderInfo via spUpdate
  let spUpdate: any | undefined;
  if (role === 'serviceProvider' || services !== undefined || location !== undefined || radius !== undefined) {
    spUpdate = {
      upsert: {
        create: {
          services: services && services.length ? services : [],
          radius: radius ?? 5,
          location: location ? { create: { name: location.name, lat: location.lat, lng: location.lng } } : undefined,
        },
        update: {
          services: services !== undefined ? services : undefined,
          radius: radius !== undefined ? radius : undefined,
          location:
            location === null
              ? { disconnect: true }
              : location
              ? {
                  upsert: {
                    create: { name: location.name, lat: location.lat, lng: location.lng },
                    update: { name: location.name, lat: location.lat, lng: location.lng }
                  }
                }
              : undefined,
        },
      },
    };
  }

  try {
    const updated = await prisma.user.update({
      where: { id: authUser.id },
      data: { ...data, ...(spUpdate ? { serviceProviderInfo: spUpdate } : {}) },
      include: {
        serviceProviderInfo: {
          include: {
            location: true
          }
        }
      }
    });
    res.json({ ...updated, serviceProviderInfo: updated.serviceProviderInfo || null });
  } catch (e) {
    console.error('Error updating profile:', e);
    res.status(500).json({ message: t(lang, 'user.updateFailed') });
  }
}

// Helper function to calculate time active
function calculateTimeActive(createdAt: Date): string {
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - createdAt.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays < 30) {
    return `${diffDays} ${diffDays === 1 ? 'day' : 'days'}`;
  } else if (diffDays < 365) {
    const months = Math.floor(diffDays / 30);
    return `${months} ${months === 1 ? 'month' : 'months'}`;
  } else {
    const years = Math.floor(diffDays / 365);
    return `${years} ${years === 1 ? 'year' : 'years'}`;
  }
}

// Helper function to calculate rating statistics
function calculateRatingStats(ratingsData: any[]) {
  const ratingBreakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  let totalRating = 0;
  
  ratingsData.forEach(rating => {
    if (rating) {
      const stars = rating.stars;
      ratingBreakdown[stars as keyof typeof ratingBreakdown]++;
      totalRating += stars;
    }
  });

  const totalReviews = ratingsData.length;
  const averageRating = totalReviews > 0 ? totalRating / totalReviews : 0;
  const positiveReviews = ratingBreakdown[4] + ratingBreakdown[5];

  return { ratingBreakdown, averageRating, positiveReviews, totalReviews };
}

/**
 * Get service provider profile with stats and reviews
 */
export async function getServiceProviderProfile(req: Request, res: Response): Promise<void> {
  const { providerId } = req.params;
  const lang = getReqLang(req);
  
  try {
    // Parallel database queries for better performance
    const [user, acceptedProviders, allServices] = await Promise.all([
      prisma.user.findUnique({
        where: { id: providerId },
        include: {
          serviceProviderInfo: {
            include: {
              location: true
            }
          }
        }
      }),
      prisma.acceptedProvider.findMany({
        where: { providerId: providerId },
        include: {
          workRequest: {
            include: {
              rating: true,
              user: {
                select: { id: true, name: true, avatarUrl: true }
              }
            }
          }
        }
      }),
      prisma.service.findMany({
        select: { id: true, name: true }
      })
    ]);

    if (!user) {
      res.status(404).json({ message: t(lang, 'user.notFound') });
      return;
    }

    if (user.role !== 'serviceProvider') {
      res.status(400).json({ message: t(lang, 'user.notServiceProvider') });
      return;
    }

    // Create service mapping once
    const serviceMap = Object.fromEntries(allServices.map(s => [s.id, s.name]));
    
    // Calculate stats
    const totalJobs = acceptedProviders.length;
    const closedJobs = acceptedProviders.filter(ap => ap.workRequest.status === 'closed').length;
    const ratingsData = acceptedProviders
      .map(ap => ap.workRequest.rating)
      .filter(rating => rating !== null);

    // Calculate rating statistics
    const { ratingBreakdown, averageRating, positiveReviews, totalReviews } = calculateRatingStats(ratingsData);

    // Calculate time active
    const timeActive = calculateTimeActive(new Date(user.createdAt));

    // Format reviews with mapped service names
    const reviews = ratingsData.map(rating => {
      if (!rating) return null;
      const workRequest = acceptedProviders.find(ap => ap.workRequest.rating?.id === rating.id)?.workRequest;
      return {
        id: rating.id,
        name: workRequest?.user.name || 'Anonymous',
        avatar: workRequest?.user.avatarUrl,
        rating: rating.stars,
        date: workRequest?.closedAt || workRequest?.createdAt,
        content: rating.review || '',
        serviceType: serviceMap[workRequest?.service || ''] || workRequest?.service || 'Service',
        helpful: 0,
      };
    }).filter(review => review !== null);

    // Get service types with stats - optimized to avoid repeated filtering
    const serviceJobsMap = new Map<string, any[]>();
    acceptedProviders.forEach(ap => {
      const service = ap.workRequest.service;
      if (!serviceJobsMap.has(service)) {
        serviceJobsMap.set(service, []);
      }
      serviceJobsMap.get(service)!.push(ap);
    });

    const serviceTypes = user.serviceProviderInfo?.services.map(service => {
      const serviceJobs = serviceJobsMap.get(service) || [];
      const serviceRatings = serviceJobs.map(sj => sj.workRequest.rating).filter(r => r !== null);
      const serviceAvg = serviceRatings.length > 0 
        ? serviceRatings.reduce((sum, r) => sum + (r?.stars || 0), 0) / serviceRatings.length 
        : 0;
      
      return {
        name: serviceMap[service] || service,
        reviews: serviceRatings.length,
        rating: Number(serviceAvg.toFixed(1))
      };
    }) || [];

    // Trust badges
    const createdAt = new Date(user.createdAt);
    const trustBadges = [
      {
        type: 'Identity Verified',
        description: 'Government ID confirmed',
        verified: true // Could be based on actual verification status
      },
      {
        type: 'Phone Verified',
        description: 'Contact number confirmed',
        verified: !!user.phoneNumber
      },
      {
        type: 'Top Rated Provider',
        description: 'Maintains 4.6+ rating',
        verified: averageRating >= 4.6
      },
      {
        type: `Active Since ${createdAt.getFullYear()}`,
        description: `${timeActive} on platform`,
        verified: true
      }
    ];

    const responseData = {
      id: user.id,
      name: user.name,
      phone: user.phoneNumber,
      profession: serviceMap[user.serviceProviderInfo?.services[0] || ''] || user.serviceProviderInfo?.services[0] || 'Service Provider',
      services: user.serviceProviderInfo?.services.map(service => serviceMap[service] || service) || [],
      location: user.serviceProviderInfo?.location?.name || 'Location not set',
      isOnline: true, // Could be based on last activity
      avatar: user.avatarUrl,
      rating: Number(averageRating.toFixed(1)),
      totalReviews,
      completedJobs: closedJobs,
      responseTime: '15 mins', // Could be calculated from actual data
      timeActive,
      ratingBreakdown,
      positiveReviews,
      reviews,
      serviceTypes,
      trustBadges
    };

    res.json(responseData);
  } catch (error) {
    console.error('Error fetching service provider profile:', error);
    res.status(500).json({ message: t(lang, 'user.profileFetchFailed') });
  }
}