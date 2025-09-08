import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius } from '../theme';

export interface Review {
  id: string;
  name: string;
  avatar?: string;
  rating: number;
  date: string;
  content: string;
  serviceType?: string;
  helpful?: number;
  images?: string[];
}

interface ReviewCardProps {
  review: Review;
  onLike?: (reviewId: string) => void;
  onReport?: (reviewId: string) => void;
  showImages?: boolean;
  compact?: boolean;
}

const ReviewCard: React.FC<ReviewCardProps> = ({
  review,
  onLike,
  onReport,
  showImages = true,
  compact = false,
}) => {
  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);

    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <Ionicons key={i} name="star" size={compact ? 12 : 14} color="#FFD700" />
      );
    }

    const remainingStars = 5 - fullStars;
    for (let i = 0; i < remainingStars; i++) {
      stars.push(
        <Ionicons key={`empty-${i}`} name="star-outline" size={compact ? 12 : 14} color="#FFD700" />
      );
    }

    return stars;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return '1 day ago';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.ceil(diffDays / 7)} week${Math.ceil(diffDays / 7) > 1 ? 's' : ''} ago`;
    if (diffDays < 365) return `${Math.ceil(diffDays / 30)} month${Math.ceil(diffDays / 30) > 1 ? 's' : ''} ago`;
    return `${Math.ceil(diffDays / 365)} year${Math.ceil(diffDays / 365) > 1 ? 's' : ''} ago`;
  };

  return (
    <View style={[styles.container, compact && styles.compactContainer]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.userInfo}>
          {review.avatar ? (
            <Image source={{ uri: review.avatar }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarText}>
                {review.name.split(' ').map(n => n[0]).join('').toUpperCase()}
              </Text>
            </View>
          )}
          
          <View style={styles.userDetails}>
            <Text style={[styles.userName, compact && styles.compactUserName]}>
              {review.name}
            </Text>
            <View style={styles.ratingDateContainer}>
              <View style={styles.starsContainer}>
                {renderStars(review.rating)}
              </View>
              <Text style={[styles.date, compact && styles.compactDate]}>
                • {formatDate(review.date)}
              </Text>
            </View>
          </View>
        </View>

        {onReport && (
          <TouchableOpacity
            style={styles.moreButton}
            onPress={() => onReport(review.id)}
          >
            <Ionicons name="ellipsis-horizontal" size={16} color={colors.grey} />
          </TouchableOpacity>
        )}
      </View>

      {/* Service Type */}
      {review.serviceType && !compact && (
        <View style={styles.serviceTypeBadge}>
          <Text style={styles.serviceTypeText}>{review.serviceType}</Text>
        </View>
      )}

      {/* Review Content */}
      <Text style={[styles.reviewContent, compact && styles.compactContent]}>
        {review.content}
      </Text>

      {/* Review Images */}
      {showImages && review.images && review.images.length > 0 && !compact && (
        <View style={styles.imagesContainer}>
          {review.images.slice(0, 3).map((image, index) => (
            <View key={index} style={styles.imageWrapper}>
              <Image source={{ uri: image }} style={styles.reviewImage} />
              {index === 2 && review.images!.length > 3 && (
                <View style={styles.imageOverlay}>
                  <Text style={styles.imageOverlayText}>
                    +{review.images!.length - 3}
                  </Text>
                </View>
              )}
            </View>
          ))}
        </View>
      )}

      {/* Actions */}
      {!compact && (
        <View style={styles.actions}>
          {onLike && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => onLike(review.id)}
            >
              <Ionicons name="thumbs-up-outline" size={16} color={colors.grey} />
              <Text style={styles.actionText}>
                Helpful {review.helpful ? `(${review.helpful})` : ''}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    shadowColor: colors.black,
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  compactContainer: {
    marginHorizontal: 0,
    marginBottom: spacing.sm,
    padding: spacing.md,
    shadowOpacity: 0.02,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  userInfo: {
    flexDirection: 'row',
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: spacing.sm,
  },
  avatarPlaceholder: {
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.dark,
    marginBottom: 2,
  },
  compactUserName: {
    fontSize: 14,
  },
  ratingDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  starsContainer: {
    flexDirection: 'row',
    marginRight: spacing.xs,
  },
  date: {
    fontSize: 12,
    color: colors.grey,
    marginLeft: 4,
  },
  compactDate: {
    fontSize: 11,
  },
  moreButton: {
    padding: 4,
  },
  serviceTypeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
  },
  serviceTypeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary,
  },
  reviewContent: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.dark,
    marginBottom: spacing.md,
  },
  compactContent: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: spacing.sm,
  },
  imagesContainer: {
    flexDirection: 'row',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  imageWrapper: {
    position: 'relative',
  },
  reviewImage: {
    width: 60,
    height: 60,
    borderRadius: radius.md,
    backgroundColor: colors.greyLight,
  },
  imageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageOverlayText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.greyLight,
    paddingTop: spacing.sm,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingRight: spacing.lg,
  },
  actionText: {
    fontSize: 12,
    color: colors.grey,
    marginLeft: spacing.xs,
    fontWeight: '500',
  },
});

export default ReviewCard;