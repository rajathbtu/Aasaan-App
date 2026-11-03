import React, { useMemo } from 'react';
import { StyleProp, StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import { useI18n } from '../i18n';
import { useTheme } from '../contexts/ThemeContext';
import type { BasePalette } from '../theme/palette';
import { buildTimeAgo } from '../utils/commonUtils';
import SvgIcon from '../assets/icons';
import { AirConditioner } from '../assets/images';

type WorkRequestCardProps = {
  request: any;
  showExpanded?: boolean;
  showResponseStatus?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
  onPress?: () => void;
  onBoostPress?: () => void;
};

const TAG_CONFIG: Record<string, { icon: string; label: string }> = {
  'AC Servicing': { icon: 'snowflake', label: 'AC Servicing' },
  Repair: { icon: 'wrench', label: 'Repair' },
  'Noise Issue': { icon: 'sound', label: 'Noise Issue' },
  'Cooling Issue': { icon: 'sound', label: 'Cooling Issue' },
  Installation: { icon: 'wrench', label: 'Installation' },
  Maintenance: { icon: 'sliders', label: 'Maintenance' },
  Cleaning: { icon: 'sliders', label: 'Cleaning' },
  Plumbing: { icon: 'wrench', label: 'Plumbing' },
  Electrical: { icon: 'bolt', label: 'Electrical' },
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
  const { base: C } = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  const timeAgo = buildTimeAgo(t);
  const isClosed = request.status === 'closed' || request.status === 'completed';
  const accepted = request.acceptedByProvider;
  const canCallCustomer = !request.callDisabledReason && request.phoneConsent === true && !!request.endUserPhone;
  const tags: string[] = Array.isArray(request.tags) ? request.tags : [];
  const visibleTags = tags.slice(0, 3);
  const requestTitle = typeof request.title === 'string' && request.title.trim() ? request.title.trim() : null;
  const serviceName = request.serviceName || request.service;
  const locationName = request.locationName || t('userRequests.locationFallback');
  const distanceLabel = request.distanceKm != null && request.distanceKm <= 1
    ? t('spRequests.withinOneKm')
    : request.distanceKm != null ? t('spRequests.distanceAway', { distance: request.distanceKm.toFixed(1) }) : null;
  const timeLabel = timeAgo(request.createdAt);
  const customerName = request.endUserName || t('requestDetails.endUser');

  return (
    <TouchableOpacity
      style={[styles.card, containerStyle]}
      activeOpacity={0.95}
      disabled={!onPress}
      onPress={onPress}>
      <View style={styles.cardContent}>
        <View style={styles.cardTop}>
          <View style={styles.serviceImage}>
            <AirConditioner size={96} />
          </View>
          <View style={styles.titleWrap}>
            <Text style={styles.requestTitle} numberOfLines={2}>
              {requestTitle || serviceName}
            </Text>
            <Text style={styles.category}>{serviceName}</Text>
            <View style={styles.metaRow}>
              {distanceLabel && (
                <View style={styles.metaItem}>
                  <SvgIcon name="pin" size={13} color={C.brand} />
                  <Text style={styles.metaText}>{distanceLabel}</Text>
                </View>
              )}
              <View style={styles.metaBar} />
              <View style={styles.metaItem}>
                <SvgIcon name="clock" size={13} color={C.greyMuted} />
                <Text style={styles.metaText}>{timeLabel}</Text>
              </View>
            </View>
          </View>
          {accepted && (
            <View style={styles.interestedBadge}>
              <SvgIcon name="check" size={10} color={C.brand} />
              <Text style={styles.interestedBadgeText}>{t('spRequests.acceptedChip')}</Text>
            </View>
          )}
        </View>

        <View style={styles.locationBar}>
          <SvgIcon name="pin" size={15} color={C.brand} style={{ marginRight: 4 }} />
          <Text style={styles.locationText}>{locationName}</Text>
          <TouchableOpacity style={styles.navigateBtn} accessibilityLabel="Navigate">
            <SvgIcon name="navigation" size={16} color={C.brand} />
          </TouchableOpacity>
        </View>

        {visibleTags.length > 0 && (
          <View style={styles.tagContainer}>
            {visibleTags.map((tag) => {
              const config = TAG_CONFIG[tag];
              return (
                <View key={tag} style={styles.tagChip}>
                  <SvgIcon name={config?.icon as any} size={12} color={C.brand} style={{ marginRight: 5 }} />
                  <Text style={styles.tagText}>{config ? config.label : tag}</Text>
                </View>
              );
            })}
          </View>
        )}

        <View style={styles.cardDivider} />

        <View style={styles.customerActions}>
          <View style={styles.customer}>
            <View style={styles.customerAvatar}>
              <SvgIcon name="user" size={24} color={C.greyMuted} />
            </View>
            <View style={styles.customerInfo}>
              <Text style={styles.customerNameText}>{customerName}</Text>
              <Text style={styles.customerRoleText}>{t('requestDetails.customerLabel') || 'Customer'}</Text>
            </View>
          </View>
          <View style={styles.verticalDivider} />
          <TouchableOpacity style={[styles.actionButton, styles.callButton]} disabled={!canCallCustomer} activeOpacity={0.7}>
            <SvgIcon name={canCallCustomer ? 'phone' : 'x'} size={16} color={canCallCustomer ? C.brand : C.greyMuted} />
            <Text style={[styles.actionText, { color: canCallCustomer ? C.brand : C.greyMuted }]}>{t('spRequests.call')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionButton, styles.interestButton]} activeOpacity={0.9}>
            <SvgIcon name="check" size={14} color={C.onPrimary} style={{ marginRight: 6 }} />
            <Text style={styles.interestText}>{accepted ? t('spRequests.acceptedChip') : t('spRequests.accept')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
};
const makeStyles = (C: BasePalette) => StyleSheet.create({
  card: {
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.greyLight,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 11,
    marginBottom: 12,
    shadowColor: '#1b2a38',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  cardContent: {
    flex: 1,
  },
  cardTop: {
    flexDirection: 'row',
    gap: 11,
    minHeight: 96,
    position: 'relative',
  },
  serviceImage: {
    width: 96,
    height: 96,
    borderRadius: 17,
    backgroundColor: C.infoLight,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
    flexShrink: 0,
  },
  titleWrap: {
    flex: 1,
    minWidth: 0,
    paddingTop: 2,
  },
  requestTitle: {
    fontSize: 17,
    fontFamily: 'Inter-Bold',
    color: C.dark,
    lineHeight: 20,
    marginBottom: 6,
    letterSpacing: -0.35,
  },
  category: {
    fontSize: 13,
    fontFamily: 'Inter',
    color: C.grey,
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    color: C.dark,
    fontSize: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  metaText: {
    fontSize: 12,
    fontFamily: 'Inter',
    color: C.dark,
  },
  metaBar: {
    width: 1,
    height: 17,
    backgroundColor: C.greyBorder,
    marginHorizontal: 2,
  },
  interestedBadge: {
    position: 'absolute',
    right: 0,
    top: 0,
    transform: [{ translateY: -1 }],
    backgroundColor: C.greenSoft,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  interestedBadgeText: {
    fontSize: 11,
    fontFamily: 'Inter-Bold',
    fontWeight: '800',
    color: C.labelGreen,
  },
  locationBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: C.backBg,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginTop: 16,
  },
  locationText: {
    fontSize: 15,
    fontFamily: 'Inter-Bold',
    fontWeight: '800',
    color: C.dark,
    flexShrink: 1,
  },
  navigateBtn: {
    padding: 4,
  },
  tagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 16,
    gap: 8,
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.light,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  tagText: {
    fontSize: 12,
    fontFamily: 'Inter',
    color: C.dark,
  },
  cardDivider: {
    height: 1,
    backgroundColor: C.greyLight,
    marginVertical: 8,
  },
  customerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  customer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  customerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.greyLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customerInfo: {
    marginLeft: 8,
  },
  customerNameText: {
    fontSize: 15,
    fontFamily: 'Inter-Bold',
    fontWeight: '700',
    color: C.dark,
  },
  customerRoleText: {
    fontSize: 11,
    fontFamily: 'Inter',
    color: C.grey,
    marginTop: 1,
  },
  verticalDivider: {
    width: 1,
    height: 20,
    backgroundColor: C.greyBorder,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    minWidth: 90,
  },
  callButton: {
    borderWidth: 1,
    borderColor: C.greyLight,
    backgroundColor: C.white,
    boxShadow: '0 2px 5px #00000010',
  },
  interestButton: {
    backgroundColor: C.brand,
    borderColor: C.brandDark,
  },
  actionText: {
    fontSize: 13,
    fontFamily: 'Inter-Bold',
    fontWeight: '600',
    marginLeft: 8,
  },
  interestText: {
    fontSize: 13,
    fontFamily: 'Inter-Bold',
    fontWeight: '700',
    color: C.onPrimary,
    marginLeft: 6,
  },
});

export default WorkRequestCard;
