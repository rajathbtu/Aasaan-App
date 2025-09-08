import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius } from '../theme';
import { useI18n } from '../i18n';

interface RatingCardProps {
  rating: number;
  totalReviews: number;
  positivePercentage?: number;
  showBreakdown?: boolean;
  breakdown?: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
  stats?: {
    totalReviews: number;
    jobsCompleted: number;
    timeActive: string;
  };
}

const RatingCard: React.FC<RatingCardProps> = ({
  rating,
  totalReviews,
  positivePercentage,
  showBreakdown = true,
  breakdown,
  stats,
}) => {
  const { t } = useI18n();
  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <Ionicons key={i} name="star" size={16} color="#FFD700" />
      );
    }

    if (hasHalfStar) {
      stars.push(
        <Ionicons key="half" name="star-half" size={16} color="#FFD700" />
      );
    }

    const remainingStars = 5 - Math.ceil(rating);
    for (let i = 0; i < remainingStars; i++) {
      stars.push(
        <Ionicons key={`empty-${i}`} name="star-outline" size={16} color="#FFD700" />
      );
    }

    return stars;
  };

  const renderRatingBar = (stars: number, count: number) => {
    if (!breakdown) return null;
    const maxCount = Math.max(...Object.values(breakdown));
    const percentage = maxCount > 0 ? (count / maxCount) * 100 : 0;

    return (
      <View key={stars} style={styles.ratingRow}>
        <Text style={styles.starNumber}>{stars}★</Text>
        <View style={styles.barContainer}>
          <View style={[styles.barFill, { width: `${percentage}%` }]} />
        </View>
        <Text style={styles.count}>{count}</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Main Rating */}
      <View style={styles.mainRatingSection}>
                <Text style={styles.mainRating}>{rating.toFixed(1)}</Text>
        <View style={styles.starsContainer}>
          {renderStars(rating)}
        </View>
        {positivePercentage && (
          <Text style={styles.ratingSubtext}>
            <Text style={styles.positivePercentage}>{positivePercentage}% </Text>
            <Text style={styles.ratingBase}>{t('serviceProviderProfile.positiveRating')}</Text>
          </Text>
        )}
        <Text style={styles.reviewsBase}>{t('serviceProviderProfile.basedOnReviews', { count: totalReviews })}</Text>
      </View>

      {/* Rating Breakdown */}
      {showBreakdown && breakdown && (
        <View style={styles.breakdownSection}>
          {[5, 4, 3, 2, 1].map(stars => renderRatingBar(stars, breakdown[stars as keyof typeof breakdown]))}
        </View>
      )}

      {/* Stats */}
      {stats && (
        <View style={styles.statsSection}>
          <View style={styles.statItem}>
            <Ionicons name="star" size={20} color={colors.primary} />
            <Text style={styles.statNumber}>{stats.totalReviews}</Text>
            <Text style={styles.statLabel}>{t('serviceProviderProfile.totalReviews')}</Text>
          </View>
          
          <View style={styles.statItem}>
            <Ionicons name="checkmark-circle" size={20} color={colors.secondary} />
            <Text style={styles.statNumber}>{stats.jobsCompleted}</Text>
            <Text style={styles.statLabel}>{t('serviceProviderProfile.jobsCompleted')}</Text>
          </View>
          
          <View style={styles.statItem}>
            <Ionicons name="time" size={20} color={colors.accent} />
            <Text style={styles.statNumber}>{stats.timeActive}</Text>
            <Text style={styles.statLabel}>{t('serviceProviderProfile.active')}</Text>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
    marginHorizontal: spacing.lg,
    marginVertical: spacing.sm,
    padding: spacing.lg,
    borderRadius: radius.lg,
    shadowColor: colors.black,
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  mainRatingSection: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  mainRating: {
    fontSize: 48,
    fontWeight: '700',
    color: colors.dark,
    marginBottom: spacing.xs,
  },
  starsContainer: {
    flexDirection: 'row',
    marginBottom: spacing.xs,
  },
  ratingSubtext: {
    marginBottom: 2,
  },
  positivePercentage: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.secondary,
  },
  ratingBase: {
    fontSize: 14,
    color: colors.grey,
  },
  reviewsBase: {
    fontSize: 12,
    color: colors.grey,
  },
  breakdownSection: {
    marginBottom: spacing.lg,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  starNumber: {
    width: 24,
    fontSize: 12,
    color: colors.grey,
    fontWeight: '500',
  },
  barContainer: {
    flex: 1,
    height: 6,
    backgroundColor: colors.greyLight,
    borderRadius: 3,
    marginHorizontal: spacing.sm,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: colors.warning,
    borderRadius: 3,
  },
  count: {
    width: 16,
    fontSize: 12,
    color: colors.grey,
    textAlign: 'right',
    fontWeight: '500',
  },
  statsSection: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: colors.greyLight,
    paddingTop: spacing.lg,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.dark,
    marginTop: spacing.xs,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    color: colors.grey,
    textAlign: 'center',
    fontWeight: '500',
  },
});

export default RatingCard;