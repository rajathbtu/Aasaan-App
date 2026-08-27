import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import LocationSearch from '../components/LocationSearch';
import { useI18n } from '../i18n';
import Header from '../components/Header';
import ErrorBanner from '../components/ErrorBanner';
import { colors, spacing, radius } from '../theme';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const LocationSelectScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { user, updateUser } = useAuth();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();

  // Modes: 'edit' for profile updates, 'onboarding' for SP onboarding, 'requestcreation' for work request creation
  const mode: 'edit' | 'onboarding' | 'requestcreation' =
    (route.params?.mode as 'edit' | 'onboarding' | 'requestcreation') === 'edit'
      ? 'edit' : (route.params?.mode as 'edit' | 'onboarding' | 'requestcreation') === 'requestcreation'
        ? 'requestcreation' : 'onboarding';

  const isRequestCreationMode = mode === 'requestcreation';
  const serviceId = route.params?.serviceId as string | undefined;
  const serviceName = route.params?.serviceName as string | undefined;
  const serviceTags = (route.params?.serviceTags as string[] | undefined) || [];

  const initialLoc = isRequestCreationMode
    ? (route.params?.selectedLocation ?? null)
    : user?.serviceProviderInfo?.location || null;
  const initialRadius = (user?.serviceProviderInfo?.radius as number | undefined) ?? 20;

  const [selectedLocation, setSelectedLocation] = useState<any>(initialLoc);
  const [radius, setRadius] = useState<number>(initialRadius);
  const [isRadiusExpanded, setIsRadiusExpanded] = useState(false);
  const [saveError, setSaveError] = useState<unknown | null>(null);

  if (isRequestCreationMode && (!serviceId || !serviceName)) {
    return (
      <View style={styles.screen}>
        <Header title={t('sp.selectLocation.pageTitle')} showNotification={false} showBackButton={true} />
        <View style={styles.guardBody}>
          <View style={styles.guardIconWrap}>
            <Ionicons name="alert-circle-outline" size={28} color={colors.primary} />
          </View>
          <Text style={styles.guardText}>{t('createRequest.addDetails.unknownService')}</Text>
        </View>
      </View>
    );
  }

  const handleSave = async () => {
    if (!selectedLocation || !selectedLocation.lat || !selectedLocation.lng) {
      if (isRequestCreationMode) 
          Alert.alert(t('createRequest.addDetails.locationRequiredTitle'), t('createRequest.addDetails.locationRequiredDesc'));
      else 
          Alert.alert(t('common.error'), t('sp.selectLocation.selectLocation'));
      return;
    }

    if (isRequestCreationMode) {
      navigation.navigate('WorkRequestSelectTags', {serviceId, serviceName, serviceTags, selectedLocation, });
      return;
    }

    try {
      const locPayload = selectedLocation?.place_id || selectedLocation?.placeId
        ? {
            name: selectedLocation.description || selectedLocation.name,
            lat: selectedLocation.lat,
            lng: selectedLocation.lng,
            placeId: selectedLocation.place_id || selectedLocation.placeId,
          }
        : {
            name: selectedLocation.name,
            lat: selectedLocation.lat,
            lng: selectedLocation.lng,
            placeId: selectedLocation.placeId,
          };
      await updateUser({ location: locPayload as any, radius });
      setSaveError(null);
      navigation.navigate(user?.role === 'serviceProvider' ? 'SPAvailable' : 'Main');
    } catch (err: any) {
      setSaveError(err);
    }
  };

  const radiusOptions = [5, 10, 15, 20];

  const displayLocationName = selectedLocation?.name || selectedLocation?.description || '';
  const hasSelection = !!displayLocationName;


  return (
    <View style={styles.screen}>
      <Header
        title={isRequestCreationMode ? (serviceName || t('createRequest.addDetails.headerTitle')) : (t('sp.selectLocation.pageTitle'))}
        subheader={isRequestCreationMode ? t('createRequest.addDetails.headerSubTitle') : undefined}
        showBackButton={true}
        showNotification={false}
      />

      <View style={styles.flex}>
        <LocationSearch
          onSelect={(loc) => {
            setSelectedLocation(!loc ? null : { name: loc.description || loc.name, place_id: loc.place_id || loc.placeId, lat: loc.lat, lng: loc.lng });
          }}
          enableMap={true}
          initialValue={displayLocationName || ''}
          initialLocation={selectedLocation}
        />
      </View>

      {/* Bottom panel: selection summary, service radius and CTA */}
      <View style={[styles.bottomPanel, { paddingBottom: insets.bottom + spacing.md }]}>
        {hasSelection && (
          <View style={[styles.locationCard, styles.cardShadow]}>
            <View style={styles.locIconCircle}>
              <Ionicons name="location" size={16} color={colors.primary} />
            </View>
            <View style={styles.flex}>
              <Text style={styles.locationName} numberOfLines={2}>
                {displayLocationName}
              </Text>
              {isRequestCreationMode && (
                <Text style={styles.privacyNote}>{t('createRequest.addDetails.locationNote')}</Text>
              )}
            </View>
            <Ionicons name="checkmark-circle" size={20} color={colors.success} />
          </View>
        )}

        {!isRequestCreationMode && (
          <View style={[styles.radiusCard, styles.cardShadow]}>
            {/* Collapsible summary row */}
            <TouchableOpacity
              style={styles.radiusSummaryRow}
              onPress={() => setIsRadiusExpanded((prev) => !prev)}
              activeOpacity={0.7}
            >
              <Ionicons name="compass-outline" size={18} color={colors.primary} />
              <Text style={styles.radiusSummaryText} numberOfLines={2} ellipsizeMode="tail">
                {`You'll see work requests within ${radius} kms of ${selectedLocation?.name || selectedLocation?.description || 'your selected location'}`}
              </Text>
              <Ionicons name={isRadiusExpanded ? 'chevron-up' : 'chevron-down'} size={16} color={colors.grey} />
            </TouchableOpacity>

            {isRadiusExpanded && (
              <>
                <Text style={styles.radiusQuestion}>
                  {t('sp.selectLocation.radiusQuestion') || 'How far can you travel for work?'}
                </Text>
                <View style={styles.radiusGrid}>
                  {radiusOptions.map((value) => {
                    const active = radius === value;
                    return (
                      <TouchableOpacity
                        key={value}
                        style={[styles.radiusCell, active ? styles.radiusCellActive : styles.radiusCellInactive]}
                        onPress={() => setRadius(value)}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.radiusCellText, active && styles.radiusCellTextActive]}>{value} km</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </>
            )}
          </View>
        )}

        <TouchableOpacity style={[styles.saveButton, styles.ctaShadow]} onPress={handleSave} activeOpacity={0.85}>
          <Text style={styles.saveText}>
            {isRequestCreationMode ? t('createRequest.addDetails.confirmLocationButton') : t('sp.selectLocation.saveButton')}
          </Text>
          <Ionicons name="arrow-forward" size={18} color={colors.white} style={{ marginLeft: spacing.sm }} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.light,
  },
  flex: {
    flex: 1,
  },
  cardShadow: {
    shadowColor: colors.black,
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  bottomPanel: {
    backgroundColor: colors.white,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.greyLight,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  locIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  locationName: {
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '700',
    color: colors.dark,
  },
  privacyNote: {
    fontSize: 11,
    lineHeight: 15,
    color: colors.grey,
    marginTop: 2,
  },
  guardBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
  },
  guardIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  guardText: {
    fontSize: 15,
    lineHeight: 21,
    color: colors.grey,
    textAlign: 'center',
  },
  radiusCard: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.greyLight,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  radiusSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  radiusSummaryText: {
    flex: 1,
    flexShrink: 1,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
    color: colors.dark,
    marginHorizontal: spacing.sm,
  },
  radiusQuestion: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.grey,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  radiusGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  radiusCell: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radiusCellInactive: {
    backgroundColor: colors.white,
    borderColor: colors.greyBorder,
  },
  radiusCellActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOpacity: 0.35,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  radiusCellText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.dark,
  },
  radiusCellTextActive: {
    color: colors.white,
    fontWeight: '700',
  },
  saveButton: {
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
  },
  ctaShadow: {
    shadowColor: colors.black,
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  saveText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default LocationSelectScreen;