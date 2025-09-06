import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius } from '../theme';
import Header from '../components/Header';
import BottomCTA from '../components/BottomCTA';
import RatingCard from '../components/RatingCard';
import ReviewCard, { Review } from '../components/ReviewCard';
import { getServiceProviderProfile } from '../api/index';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../i18n';

interface ServiceProvider {
  id: string;
  name: string;
  phone?: string;
  profession: string;
  services: string[]; // Add services array
  location: string;
  isOnline: boolean;
  profileImage?: string;
  rating: number;
  totalReviews: number;
  positivePercentage: number;
  ratingBreakdown: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
  stats: {
    totalReviews: number;
    jobsCompleted: number;
    timeActive: string;
  };
  serviceTypes: Array<{
    name: string;
    reviews: number;
    rating: number;
  }>;
  trustBadges: Array<{
    type: string;
    description: string;
    verified: boolean;
  }>;
  reviews: Review[];
}

interface ServiceProviderProfileProps {}

const ServiceProviderProfileScreen: React.FC<ServiceProviderProfileProps> = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { token } = useAuth();
  const { t } = useI18n();
  const { providerId, providerData } = route.params || {};

  const [providerProfile, setProviderProfile] = useState<ServiceProvider | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Memoize transformation to avoid recalculation on re-renders
  const transformReviews = useCallback((reviewsData: any[]): Review[] => {
    return reviewsData.map((review: any) => ({
      id: review.id,
      name: review.name,
      avatar: review.avatar,
      rating: review.rating,
      date: review.date,
      content: review.content || `Rated ${review.rating} star${review.rating > 1 ? 's' : ''}`,
      serviceType: review.serviceType,
      helpful: review.helpful || 0,
    }));
  }, []);

  // Memoize fallback data creation
  const createFallbackProfile = useCallback((providerData: any): ServiceProvider => ({
    ...providerData,
    services: providerData.services || [],
    rating: 0,
    totalReviews: 0,
    positivePercentage: 0,
    ratingBreakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
    stats: { totalReviews: 0, jobsCompleted: 0, timeActive: '0 days' },
    serviceTypes: [],
    trustBadges: []
  }), []);

  useEffect(() => {
    const fetchProviderData = async () => {
      if (!providerId || !token) {
        setError('Provider ID or authentication token missing');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const data = await getServiceProviderProfile(token, providerId);
        setProviderProfile(data);
        setReviews(transformReviews(data.reviews));
        setError(null);
      } catch (err: any) {
        console.error('Error fetching provider profile:', err);
        setError(err.message || 'Failed to load provider profile');
        // Fallback to provided data if available
        if (providerData) {
          setProviderProfile(createFallbackProfile(providerData));
        }
      } finally {
        setLoading(false);
      }
    };

    fetchProviderData();
  }, [providerId, token, transformReviews, createFallbackProfile, providerData]);

  const handleBackPress = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleContactProvider = useCallback(() => {
    if (providerProfile?.phone) {
      Linking.openURL(`tel:${providerProfile.phone}`).catch(() => 
        Alert.alert(t('serviceProviderProfile.callFailed'), t('serviceProviderProfile.callFailedDesc'))
      );
    } else {
      Alert.alert(t('serviceProviderProfile.callUnavailable'), t('serviceProviderProfile.callUnavailableDesc'));
    }
  }, [providerProfile?.phone, t]);

  const handleLikeReview = useCallback((reviewId: string) => {
    // Handle like review
    console.log('Liked review:', reviewId);
  }, []);

  const handleReportReview = useCallback((reviewId: string) => {
    // Handle report review
    console.log('Reported review:', reviewId);
  }, []);

  // Memoize the header right component to avoid recreating on every render
  const headerRightComponent = useMemo(() => (
    <TouchableOpacity onPress={() => {}}>
      <Ionicons name="ellipsis-vertical" size={20} color={colors.dark} />
    </TouchableOpacity>
  ), []);

  if (loading) {
    return (
      <View style={styles.container}>
        <Header
          title={t('serviceProviderProfile.title')}
          showNotification={true}
          notificationCount={1}
          customRightComponent={headerRightComponent}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>{t('serviceProviderProfile.loadingProfile')}</Text>
        </View>
      </View>
    );
  }

  if (error && !providerProfile) {
    return (
      <View style={styles.container}>
        <Header
          title={t('serviceProviderProfile.title')}
          showNotification={true}
          notificationCount={1}
          customRightComponent={headerRightComponent}
        />
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color={colors.error} />
          <Text style={styles.errorTitle}>{t('serviceProviderProfile.unableToLoad')}</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => {
              setError(null);
              setLoading(true);
              // Trigger refetch by changing a dependency
            }}
          >
            <Text style={styles.retryButtonText}>{t('serviceProviderProfile.tryAgain')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!providerProfile) {
    return (
      <View style={styles.container}>
        <Header title={t('serviceProviderProfile.title')} />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{t('serviceProviderProfile.profileNotFound')}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <Header
        title={t('serviceProviderProfile.title')}
        showNotification={true}
        notificationCount={1}
        customRightComponent={headerRightComponent}
      />

      {/* Small spacer to match other screens */}
      <View style={{ height: spacing.sm }} />

      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollViewContent}
      >
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.profileInfo}>
            {providerProfile.profileImage ? (
              <Image source={{ uri: providerProfile.profileImage }} style={styles.profileImage} />
            ) : (
              <View style={[styles.profileImage, styles.profileImagePlaceholder]}>
                <Text style={styles.profileImageText}>
                  {providerProfile.name.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                </Text>
              </View>
            )}
            <View style={styles.profileDetails}>
              <View style={styles.nameRow}>
                <Text style={styles.providerName}>{providerProfile.name}</Text>
                {providerProfile.isOnline && (
                  <View style={styles.onlineIndicator}>
                    <View style={styles.onlineDot} />
                    <Text style={styles.onlineText}>{t('serviceProviderProfile.online')}</Text>
                  </View>
                )}
              </View>
              {/* Display all services */}
              {providerProfile.services && providerProfile.services.length > 0 && (
                <View style={styles.servicesContainer}>
                  {providerProfile.services.map((service, index) => (
                    <View key={index} style={styles.serviceChip}>
                      <Text style={styles.serviceChipText}>{service}</Text>
                    </View>
                  ))}
                </View>
              )}
              <View style={styles.locationRow}>
                <Ionicons name="location-outline" size={14} color={colors.grey} />
                <Text style={styles.location}>{providerProfile.location}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Rating Card */}
        <RatingCard
          rating={providerProfile.rating}
          totalReviews={providerProfile.totalReviews}
          positivePercentage={providerProfile.positivePercentage}
          breakdown={providerProfile.ratingBreakdown}
          stats={providerProfile.stats}
        />

        {/* Filter Section */}
        <View style={styles.filterSection}>
          <TouchableOpacity style={styles.filterButton}>
            <Ionicons name="funnel" size={16} color={colors.primary} />
            <Text style={styles.filterText}>{t('serviceProviderProfile.allReviews')}</Text>
            <Ionicons name="chevron-down" size={16} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.filterButton}>
            <Ionicons name="swap-vertical" size={16} color={colors.primary} />
            <Text style={styles.filterText}>{t('serviceProviderProfile.recent')}</Text>
            <Ionicons name="chevron-down" size={16} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.searchButton}>
            <Ionicons name="search" size={16} color={colors.dark} />
          </TouchableOpacity>
        </View>

        {/* Reviews */}
        <View style={styles.reviewsSection}>
          <Text style={styles.sectionTitle}>
            {t('serviceProviderProfile.reviewsCount', { count: reviews.length })}
          </Text>
          {reviews.length > 0 ? (
            reviews.map((review) => (
              <ReviewCard
                key={review.id}
                review={review}
                onLike={handleLikeReview}
                onReport={handleReportReview}
              />
            ))
          ) : (
            <View style={styles.noReviewsContainer}>
              <Ionicons name="star-outline" size={48} color={colors.greyMuted} />
              <Text style={styles.noReviewsTitle}>{t('serviceProviderProfile.noReviewsTitle')}</Text>
              <Text style={styles.noReviewsText}>
                {t('serviceProviderProfile.noReviewsText', { name: providerProfile.name })}
              </Text>
            </View>
          )}
        </View>

        {/* Load More - only show if there are reviews */}
        {reviews.length > 0 && (
          <TouchableOpacity style={styles.loadMoreButton}>
            <Ionicons name="reload" size={16} color={colors.primary} />
            <Text style={styles.loadMoreText}>
              {t('serviceProviderProfile.loadMore', { count: Math.max(0, providerProfile.totalReviews - reviews.length) })}
            </Text>
          </TouchableOpacity>
        )}

        {/* Service Types */}
        <View style={styles.serviceTypesSection}>
          <Text style={styles.sectionTitle}>{t('serviceProviderProfile.serviceTypes')}</Text>
          {providerProfile.serviceTypes && providerProfile.serviceTypes.length > 0 ? (
            providerProfile.serviceTypes.map((service: any, index: number) => (
              <View key={index} style={styles.serviceTypeCard}>
                <View style={styles.serviceTypeHeader}>
                  <Text style={styles.serviceTypeName}>{service.name}</Text>
                  <View style={styles.serviceTypeRating}>
                    <Ionicons name="star" size={14} color="#FFD700" />
                    <Text style={styles.serviceTypeRatingText}>{service.rating}</Text>
                    <Text style={styles.serviceTypeReviews}>({service.reviews})</Text>
                  </View>
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.noDataText}>{t('serviceProviderProfile.noServiceTypes')}</Text>
          )}
        </View>

        {/* Trust & Safety */}
        <View style={styles.trustSection}>
          <Text style={styles.sectionTitle}>{t('serviceProviderProfile.trustSafety')}</Text>
          {providerProfile.trustBadges && providerProfile.trustBadges.length > 0 ? (
            providerProfile.trustBadges.map((badge: any, index: number) => (
              <View key={index} style={styles.trustBadge}>
                <View style={styles.trustIcon}>
                  <Ionicons 
                    name={badge.verified ? "checkmark-circle" : "close-circle"} 
                    size={20} 
                    color={badge.verified ? colors.secondary : colors.error} 
                  />
                </View>
                <View style={styles.trustContent}>
                  <Text style={styles.trustTitle}>{badge.type}</Text>
                  <Text style={styles.trustDescription}>{badge.description}</Text>
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.noDataText}>{t('serviceProviderProfile.noTrustBadges')}</Text>
          )}
        </View>

        <View style={styles.bottomSpace} />
      </ScrollView>

      {/* Bottom CTA */}
      <BottomCTA
        buttonText={t('serviceProviderProfile.contactProvider')}
        onPress={handleContactProvider}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.paper,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingTop: 0, // Remove extra padding since we have the spacer
  },
  profileHeader: {
    backgroundColor: colors.white,
    marginHorizontal: spacing.lg,
    padding: spacing.lg,
    borderRadius: radius.lg,
    shadowColor: colors.black,
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  profileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: spacing.md,
  },
  profileImagePlaceholder: {
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileImageText: {
    color: colors.white,
    fontSize: 24,
    fontWeight: '700',
  },
  profileDetails: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  providerName: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.dark,
    marginRight: spacing.sm,
  },
  onlineIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.successLight,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: 12,
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.secondary,
    marginRight: 4,
  },
  onlineText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.secondary,
  },
  servicesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: spacing.sm,
    gap: spacing.xs,
  },
  serviceChip: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.md,
  },
  serviceChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  location: {
    fontSize: 14,
    color: colors.grey,
    marginLeft: 4,
  },
  filterSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 20,
    gap: 4,
  },
  filterText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500',
  },
  searchButton: {
    padding: spacing.xs,
    marginLeft: 'auto',
  },
  reviewsSection: {
    marginTop: spacing.sm,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.dark,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  loadMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    marginHorizontal: spacing.lg,
    marginVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.greyLight,
    borderRadius: radius.md,
    gap: spacing.xs,
  },
  loadMoreText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500',
  },
  serviceTypesSection: {
    marginTop: spacing.lg,
    marginHorizontal: spacing.lg,
  },
  serviceTypeCard: {
    backgroundColor: colors.white,
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
    shadowColor: colors.black,
    shadowOpacity: 0.03,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  serviceTypeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  serviceTypeName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.dark,
  },
  serviceTypeRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  serviceTypeRatingText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.dark,
  },
  serviceTypeReviews: {
    fontSize: 12,
    color: colors.grey,
  },
  trustSection: {
    marginTop: spacing.lg,
    marginHorizontal: spacing.lg,
  },
  trustBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
    shadowColor: colors.black,
    shadowOpacity: 0.03,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  trustIcon: {
    marginRight: spacing.sm,
  },
  trustContent: {
    flex: 1,
  },
  trustTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.dark,
    marginBottom: 2,
  },
  trustDescription: {
    fontSize: 12,
    color: colors.grey,
  },
  bottomSpace: {
    height: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.paper,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: 16,
    color: colors.grey,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.paper,
    paddingHorizontal: spacing.lg,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.dark,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  errorText: {
    fontSize: 14,
    color: colors.grey,
    textAlign: 'center',
    lineHeight: 20,
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    marginTop: spacing.lg,
  },
  retryButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  noReviewsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    marginHorizontal: spacing.lg,
  },
  noReviewsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.dark,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  noReviewsText: {
    fontSize: 14,
    color: colors.grey,
    textAlign: 'center',
    lineHeight: 20,
  },
  noDataText: {
    fontSize: 14,
    color: colors.grey,
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: spacing.md,
  },
});

export default ServiceProviderProfileScreen;