import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { CommonActions, useNavigation, useRoute } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import LocationSearch from '../components/LocationSearch';
import { useI18n } from '../i18n';
import Header from '../components/Header';
import ErrorBanner from '../components/ErrorBanner';
import { spacing, radius } from '../theme';
import { Ionicons } from '@expo/vector-icons';
import SafeBottomBanner from '../components/SafeBottomBanner';
import BlockingLoader from '../components/BlockingLoader';
import BottomCTA from '../components/BottomCTA';
import { offlineCacheKey, readOfflineCache, writeOfflineCache } from '../utils/offlineCache';
import type { BasePalette } from '../theme/palette';
import { useTheme } from '../contexts/ThemeContext';

/**
 * Location selection — the pre-revamp UI (full-height search + map with the
 * shared LocationSearch, bottom summary panel, collapsible service-radius
 * card), kept dark-mode aware by styling through the base palette tokens.
 * The confirm flow keeps the revamp's functional fixes: map-picked spots are
 * de-duplicated in the saved-locations cache and the confirmed location is
 * handed back to the opener with a canonical name/description shape.
 */
const LocationSelectScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { user, updateUser } = useAuth();
  const { t } = useI18n();
  const { showToast } = useToast();
  const { base: C } = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);

  // Modes: 'edit' for profile updates, 'onboarding' for SP onboarding, 'requestcreation' for work request creation
  const mode: 'edit' | 'onboarding' | 'requestcreation' =
    (route.params?.mode as 'edit' | 'onboarding' | 'requestcreation') === 'edit'
      ? 'edit' : (route.params?.mode as 'edit' | 'onboarding' | 'requestcreation') === 'requestcreation'
        ? 'requestcreation' : 'onboarding';

  const isRequestCreationMode = mode === 'requestcreation';
  const returnToServiceSelection = isRequestCreationMode && route.params?.returnToServiceSelection === true;
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
  const [saving, setSaving] = useState(false);
  const [isLocationResolving, setIsLocationResolving] = useState(false);

  /* The map reports the picked point twice: first the bare coordinates (so
     the card can react instantly), then the resolved address. Clearing the
     search box reports null — that must never discard a confirmed spot. */
  const handleSelectLocation = (loc: any) => {
    if (!loc) return;
    const lat = typeof loc.lat === 'number' && Number.isFinite(loc.lat) ? loc.lat : undefined;
    const lng = typeof loc.lng === 'number' && Number.isFinite(loc.lng) ? loc.lng : undefined;
    const description = String(loc.description || loc.name || '').trim();
    setSelectedLocation({
      name: description,
      description,
      place_id: loc.place_id || loc.placeId,
      lat,
      lng,
    });
  };

  useEffect(() => {
    if (isRequestCreationMode) setSelectedLocation(route.params?.selectedLocation ?? null);
  }, [isRequestCreationMode, route.params?.selectedLocation]);

  if (isRequestCreationMode && !returnToServiceSelection && (!serviceId || !serviceName)) {
    return (
      <View style={styles.screen}>
        <Header title={t('sp.selectLocation.pageTitle')} showNotification={false} showBackButton={true} />
        <View style={styles.guardBody}>
          <View style={styles.guardIconWrap}>
            <Ionicons name="alert-circle-outline" size={28} color={C.brand} />
          </View>
          <Text style={styles.guardText}>{t('createRequest.addDetails.unknownService')}</Text>
        </View>
      </View>
    );
  }

  const handleSave = async () => {
    if (saving || isLocationResolving) return;
    if (!selectedLocation || !selectedLocation.lat || !selectedLocation.lng) {
      if (isRequestCreationMode)
          Alert.alert(t('createRequest.addDetails.locationRequiredTitle'), t('createRequest.addDetails.locationRequiredDesc'));
      else
          Alert.alert(t('common.error'), t('sp.selectLocation.selectLocation'));
      return;
    }

    if (isRequestCreationMode) {
      const placeId = selectedLocation.place_id || selectedLocation.placeId;
      const description =
        String(selectedLocation.name || selectedLocation.description || '').trim() || 'Selected location';
      /* One canonical shape for every consumer: the saved-locations cache,
         the screen that shows the header label, and the request payload. */
      const confirmedLocation = {
        place_id: placeId,
        name: description,
        description,
        lat: selectedLocation.lat,
        lng: selectedLocation.lng,
      };

      if (user?.id) {
        const cacheKey = offlineCacheKey('saved-locations', user.id);
        const savedLocations = (await readOfflineCache<Array<{ place_id?: string; lat?: number; lng?: number }>>(cacheKey)) || [];
        /* De-duplicate by place_id when present, otherwise by rounded
           coordinates — so map-picked locations (which may have no Google
           place id) are still persisted and returned to the opener. */
        const sameSpot = (l: { place_id?: string; lat?: number; lng?: number }) =>
          (placeId && l.place_id && l.place_id === placeId) ||
          (!placeId &&
            typeof l.lat === 'number' && typeof l.lng === 'number' &&
            Math.abs(l.lat - confirmedLocation.lat) < 0.0005 &&
            Math.abs(l.lng - confirmedLocation.lng) < 0.0005);
        await writeOfflineCache(cacheKey, [
          confirmedLocation,
          ...savedLocations.filter((location) => !sameSpot(location)),
        ].slice(0, 3));
      }
      if (returnToServiceSelection) {
        /* Return to the service-selection tab carrying the confirmed address,
           so its header swaps "Select your location" for the chosen address
           the moment this screen closes (the saved-locations cache written
           above is the durable fallback). */
        navigation.navigate('Main', {
          screen: 'Create',
          params: { selectedLocation: confirmedLocation },
        });
      } else if (route.params?.returnToTagsRouteKey) {
        navigation.dispatch({
          ...CommonActions.setParams({ selectedLocation: confirmedLocation }),
          source: route.params.returnToTagsRouteKey,
        });
        navigation.goBack();
      } else {
        navigation.navigate('WorkRequestSelectTags', {serviceId, serviceName, serviceTags, selectedLocation: confirmedLocation, });
      }
      return;
    }

    try {
      setSaving(true);
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
      if (mode === 'edit') {
        showToast(t('common.updatedDesc'));
        navigation.popTo('Profile');
      } else {
        navigation.navigate(user?.role === 'serviceProvider' ? 'SPAvailable' : 'Main');
      }

    } catch (err: any) {
      setSaveError(err);
    } finally {
      setSaving(false);
    }
  };

  const radiusOptions = [5, 10, 15, 20];

  const displayLocationName = selectedLocation?.name || selectedLocation?.description || '';
  const hasSelection = !!displayLocationName;


  return (
    <View style={styles.screen}>
      <Header
        title={isRequestCreationMode ? (t('createRequest.addDetails.headerTitle')) : (t('sp.selectLocation.pageTitle'))}
        showBackButton={true}
        showNotification={false}
        extraLargeTitle={mode=== 'onboarding' }
      />

      <View style={styles.flex}>
        <LocationSearch
          onResolvingChange={setIsLocationResolving}
          onSelect={handleSelectLocation}
          enableMap={true}
          isServiceArea={!isRequestCreationMode}
          serviceAreaRadiusKm={radius}
          initialValue={displayLocationName || ''}
          initialLocation={selectedLocation}
        />
      </View>

      {/* Bottom panel: selection summary, service radius and CTA */}
      <View style={[styles.bottomPanel, ]}>
        {hasSelection && (
          <View style={[styles.locationCard, styles.cardShadow]}>
            <View style={styles.locIconCircle}>
              <Ionicons name="location" size={16} color={C.brand} />
            </View>
            <View style={styles.flex}>
              <Text style={styles.locationName} numberOfLines={2}>
                {displayLocationName}
              </Text>
            </View>
            <Ionicons name="checkmark-circle" size={20} color={C.success} />
          </View>
        )}
        {isRequestCreationMode && (
          <Text style={styles.privacyNote}>{t('createRequest.addDetails.locationNote')}</Text>
        )}

        {!isRequestCreationMode && (
          <View style={[styles.radiusCard, styles.cardShadow]}>
            {/* Collapsible summary row */}
            <TouchableOpacity
              style={styles.radiusSummaryRow}
              onPress={() => setIsRadiusExpanded((prev) => !prev)}
              activeOpacity={0.7}>
              <View style={styles.locIconCircle}>
                <Ionicons name="resize" size={18} color={C.brand} />
              </View>
              <Text style={styles.radiusSummaryText} numberOfLines={2} ellipsizeMode="tail">
                {t('sp.selectLocation.radiusSummary', { radius })}
              </Text>
              <Ionicons name={isRadiusExpanded ? 'chevron-up' : 'chevron-down'} size={16} color={C.grey} />
            </TouchableOpacity>

            {isRadiusExpanded && (
              <View style={styles.radiusGrid}>
                {radiusOptions.map((value) => {
                  const active = radius === value;
                  return (
                    <TouchableOpacity
                      key={value}
                      style={[styles.radiusCell, active ? styles.radiusCellActive : styles.radiusCellInactive]}
                      onPress={() => setRadius(value)}
                      activeOpacity={0.8}>
                      <Text style={[styles.radiusCellText, active && styles.radiusCellTextActive]}>{value} km</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        )}

        <ErrorBanner error={saveError} onRetry={handleSave} />

        <BottomCTA
          containerStyle={styles.bottomCtaContainer}
          buttonStyle={styles.ctaShadow}
          buttonText={isRequestCreationMode ? t('createRequest.addDetails.confirmLocationButton') : t('sp.selectLocation.saveButton')}
          onPress={handleSave}
          isLoading={isLocationResolving}
          showArrow={!isLocationResolving}
        />
      </View>
      <SafeBottomBanner/>
      <BlockingLoader visible={saving} />
    </View>
  );
};

const makeStyles = (C: BasePalette) => StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: C.canvas,
  },
  flex: {
    flex: 1,
  },
  cardShadow: {
    shadowColor: C.black,
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  bottomPanel: {
    backgroundColor: C.white,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: C.greyLight,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.paper,
    borderWidth: 1,
    borderColor: C.primaryBorder,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  locIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  locationName: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    lineHeight: 19,
    color: C.dark,
  },
  privacyNote: {
    fontSize: 12,
    color: C.grey,
    alignSelf: 'center',
    marginBottom: spacing.sm,
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
    backgroundColor: C.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  guardText: {
    fontSize: 15,
    lineHeight: 21,
    color: C.grey,
    textAlign: 'center',
  },
  radiusCard: {
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.greyLight,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  radiusSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  radiusSummaryText: {
    flex: 1,
    flexShrink: 1,
    fontSize: 12,
    fontFamily: 'Inter',
    lineHeight: 18,
    color: C.dark,
    marginRight: spacing.sm,
  },
  radiusGrid: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  radiusCell: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radiusCellInactive: {
    backgroundColor: C.white,
    borderColor: C.greyBorder,
  },
  radiusCellActive: {
    backgroundColor: C.brand,
    borderColor: C.brand,
    shadowColor: C.brand,
    shadowOpacity: 0.35,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  radiusCellText: {
    fontSize: 12,
    fontFamily: 'Google Sans Flex-SemiBold',
    color: C.dark,
  },
  radiusCellTextActive: {
    color: C.onPrimary,
  },
  bottomCtaContainer: {
    padding: 0,
    paddingBottom: 0,
    backgroundColor: 'transparent',
    borderTopWidth: 0,
    marginBottom: spacing.sm,
  },
  ctaShadow: {
    shadowColor: C.black,
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
});

export default LocationSelectScreen;
