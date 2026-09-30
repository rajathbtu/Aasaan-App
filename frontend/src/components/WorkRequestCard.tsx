import React from 'react';
import {
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useI18n } from '../i18n';
import { colors, radius, spacing } from '../theme';
import { buildTimeAgo } from '../utils/commonUtils';
import ServiceIcon from './ServiceIcon';
import ActionButton from './ActionButton';

/** Accent orange used by the "boost" affordance on this card. */
const BOOST_ORANGE = '#fb923c';

type WorkRequestCardProps = {
  request: any;
  showExpanded?: boolean;
  showResponseStatus?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
  onPress?: () => void;
  onBoostPress?: () => void;
};

const WorkRequestCard: React.FC<WorkRequestCardProps> = ({
  request,
  showExpanded = false,
  showResponseStatus = false,
  containerStyle,
  onPress,
  onBoostPress,
}) => {
  const { t } = useI18n();
  const timeAgo = buildTimeAgo(t);
  const isClosed = request.status === 'closed' || request.status === 'completed';
  const responseCount = request.responseCount ?? 0;
  const hasResponses = responseCount > 0;
  const tags: string[] = Array.isArray(request.tags) ? request.tags : [];
  const visibleTags = showExpanded ? tags : tags.slice(0, 3);
  const extraTags = tags.length - visibleTags.length;
  const responseTitleKey = responseCount === 1
    ? 'userRequests.providerRespondedTitle'
    : 'userRequests.providersRespondedTitle';
  const responseSubtitleKey = responseCount === 1
    ? 'userRequests.providerRespondedSubtitle'
    : 'userRequests.providersRespondedSubtitle';

  return (
    <TouchableOpacity
      style={[styles.card, containerStyle]}
      activeOpacity={onPress ? 0.8 : 1}
      disabled={!onPress}
      onPress={onPress}
    >
      <View style={styles.cardHeader}>
        <ServiceIcon
          icon={request.serviceIcon}
          color={request.serviceColor}
          circleSize={46}
          iconSize={20}
          style={styles.cardIcon}
        />
        <View style={styles.cardHeaderText}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {request.serviceName || request.service}
          </Text>
          <View style={styles.metaRow}>
            <Text style={styles.cardSubtitle} 
                  numberOfLines={showExpanded ? undefined : 1}>
              {timeAgo(request.createdAt)}
              {' • '}
              <Ionicons name="location-outline" size={12} color={colors.greyMuted} />
              {request.locationName || t('userRequests.locationFallback')}
            </Text>
          </View>
        </View>
        
        <View style={[styles.statusBadge, isClosed ? styles.statusBadgeCompleted : styles.statusBadgeActive]}>
          <Text style={styles.statusText}>
            {isClosed ? t('userRequests.statusCompleted') : t('userRequests.statusActive')}
          </Text>
        </View>
      
      </View>

      {visibleTags.length > 0 && (
        <View style={styles.tagContainer}>
          {visibleTags.map((tag: string, index: number) => (
            <Text key={`${tag}-${index}`} style={styles.tag}>{tag}</Text>
          ))}
          {extraTags > 0 && (
            <Text style={styles.tag}>{t('userRequests.moreItems', { count: extraTags })}</Text>
          )}
        </View>
      )}

      {showResponseStatus && (
        <View style={[styles.statusBand, hasResponses ? styles.statusBandResponded : styles.statusBandEmpty]}>
          {hasResponses ? (
            <>
              <View style={styles.responseBadge}>
                <Ionicons name="people-outline" size={18} color={colors.primary} />
              </View>
              <View style={styles.statusBandText}>
                <Text style={[styles.statusBandTitle, styles.statusBandTitleResponded]}>
                  {t(responseTitleKey, { count: responseCount })}
                </Text>
                <Text style={styles.statusBandSubtitle} numberOfLines={1}>
                  {t(responseSubtitleKey)}
                </Text>
              </View>
            </>
          ) : (
            <>
              <View style={styles.clockCircle}>
                <Ionicons name="time" size={17} color={colors.white} />
              </View>
              <View style={styles.statusBandText}>
                <Text style={styles.statusBandTitle}>{t('userRequests.noResponsesTitle')}</Text>
                <Text style={styles.statusBandSubtitle} numberOfLines={1}>
                  {t('userRequests.noResponsesSubtitle')}
                </Text>
              </View>
              {onBoostPress && (
                <ActionButton
                  buttonIcon="flash"
                  buttonTitle={t('userRequests.boost')}
                  buttonTitleColor={BOOST_ORANGE}
                  backgroundColor={colors.white}
                  onPress={onBoostPress}
                  style={styles.boostButton}
                />
              )}
            </>
          )}
          <View style={[styles.bandChevron, !hasResponses && styles.bandChevronEmpty]}>
            <Ionicons name="chevron-forward" size={17} color={hasResponses ? colors.primary : BOOST_ORANGE} />
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    padding: spacing.md,
    borderRadius: radius.xl + 4,
    borderWidth: 1,
    borderColor: colors.greyLight,
    boxShadow: '0px 2px 6px rgba(0, 0, 0, 0.025)',
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardIcon: {
    marginBottom: 0,
    marginRight: spacing.md,
  },
  cardHeaderText: {
    flex: 1,
    marginRight: spacing.sm,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.dark,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  cardSubtitle: {
    fontSize: 12,
    color: colors.greyMuted,
    flexShrink: 1,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.xl,
  },
  statusBadgeActive: {
    backgroundColor: '#d9f9e8',
  },
  statusBadgeCompleted: {
    backgroundColor: colors.successLight,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.success,
  },
  tagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginTop: spacing.md,
    gap: 6 as any,
  },
  tag: {
    backgroundColor: colors.primarySoft,
    color: colors.dark,
    fontSize: 12,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: radius.xl,
    overflow: 'hidden',
  },
  statusBand: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    borderRadius: radius.xl,
    paddingVertical: spacing.md,
    paddingLeft: spacing.md,
    paddingRight: spacing.sm,
  },
  statusBandResponded: {
    backgroundColor: '#e8edff',
  },
  statusBandEmpty: {
    backgroundColor: '#fff7ed',
  },
  statusBandText: {
    flex: 1,
    marginLeft: spacing.md,
    marginRight: spacing.sm,
  },
  statusBandTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.dark,
  },
  statusBandTitleResponded: {
    color: colors.primary,
  },
  statusBandSubtitle: {
    fontSize: 12,
    color: colors.grey,
    marginTop: 1,
  },
  responseBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 42,
    height: 30,
    paddingHorizontal: 10,
    borderRadius: 15,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: '#c7d2fe',
  },
  clockCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: BOOST_ORANGE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boostButton: {
    // Outline pill: keep the orange edge, tinted background and tighter
    // padding this card has always used rather than ActionButton's defaults.
    borderColor: BOOST_ORANGE,
    borderRadius: radius.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  bandChevron: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
  },
  bandChevronEmpty: {
    backgroundColor: '#fff7ed',
  },
});

export default WorkRequestCard;