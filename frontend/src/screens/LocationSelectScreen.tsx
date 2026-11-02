import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { CommonActions, useNavigation, useRoute } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import LocationSearch from '../components/LocationSearch';
import { useI18n } from '../i18n';
import Header from '../components/Header';
import ErrorBanner from '../components/ErrorBanner';
import SafeBottomBanner from '../components/SafeBottomBanner';
import BlockingLoader from '../components/BlockingLoader';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { offlineCacheKey, readOfflineCache, writeOfflineCache } from '../utils/offlineCache';
import SvgIcon from '../assets/icons';

/* Exact colour tokens from approved design */
const SA = {
  green: '#079B5C',
  green2: '#08AD73',
  dark: '#172027',
  muted: '#657183',
  border: '#E4E9ED',
  mint: '#E5F8EF',
  mintButton: '#EFF9F3',
  currentLocBorder: '#C9F1DF',
  currentLocBg: '#EAF9F2',
  currentLocText: '#078B54',
  iconTileBg: '#E2F8EE',
  radiusBtnBorder: '#DCE2E8',
  radiusBtnText: '#26313A',
  footerBorder: '#EDF0F2',
  mapBg: '#F3F7F5',
};

const LocationSelectScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { user, updateUser } = useAuth();
  const { t } = useI18n();
  const { showToast } = useToast();
  const insets = useSafeAreaInsets();

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
  const [saveError, setSaveError] = useState<unknown | null>(null);
  const [saving, setSaving] = useState(false);
  const [isLocationResolving, setIsLocationResolving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const locationSearchRef = useRef<{ detectLocation: () => void; openSearchModal: () => void } | null>(null);

  const handleSelectLocation = (loc: any) => {
    setSelectedLocation(!loc ? null : { name: loc.description || loc.name, place_id: loc.place_id || loc.placeId, lat: loc.lat, lng: loc.lng });
    setSearchQuery(loc?.description || loc?.name || '');
  };

  useEffect(() => {
    if (isRequestCreationMode) setSelectedLocation(route.params?.selectedLocation ?? null);
  }, [isRequestCreationMode, route.params?.selectedLocation]);

  if (isRequestCreationMode && !returnToServiceSelection && (!serviceId || !serviceName)) {
    return (
      <View style={styles.screen}>
        <Header title={t('sp.selectLocation.pageTitle')} showBackButton={true} showNotification={false} />
        <View style={styles.guardBody}>
          <View style={styles.guardIconWrap}>
            <SvgIcon name="sa-target" size={28} color={SA.green} />
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
      if (user?.id && placeId) {
        const cacheKey = offlineCacheKey('saved-locations', user.id);
        const savedLocations = (await readOfflineCache<Array<{ place_id: string }>>(cacheKey)) || [];
        await writeOfflineCache(cacheKey, [
          { place_id: placeId, description: selectedLocation.name || selectedLocation.description, lat: selectedLocation.lat, lng: selectedLocation.lng },
          ...savedLocations.filter((location) => location.place_id !== placeId),
        ].slice(0, 3));
      }
      if (returnToServiceSelection) {
        navigation.goBack();
      } else if (route.params?.returnToTagsRouteKey) {
        navigation.dispatch({
          ...CommonActions.setParams({ selectedLocation }),
          source: route.params.returnToTagsRouteKey,
        });
        navigation.goBack();
      } else {
        navigation.navigate('WorkRequestSelectTags', {serviceId, serviceName, serviceTags, selectedLocation, });
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
        title={t('sp.selectLocation.pageTitle')}
        showBackButton={true}
        showNotification={false}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Search field directly below header */}
        <View style={styles.searchWrap}>
          <View style={styles.searchField}>
            <SvgIcon name="sa-search" size={23} color={SA.muted} />
            <TouchableOpacity
              style={styles.searchInputTouchable}
              onPress={() => locationSearchRef.current?.openSearchModal()}
              activeOpacity={0.8}
            >
              <Text style={[styles.searchInputText, { minWidth: 0 }]} numberOfLines={1} ellipsizeMode="tail">
                {searchQuery ? searchQuery : t('sp.selectLocation.searchPlaceholder')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Map section via existing LocationSearch (minimal map only) */}
        <View style={styles.mapSection}>
          <LocationSearch
            ref={locationSearchRef as any}
            onResolvingChange={setIsLocationResolving}
            onSelect={handleSelectLocation}
            enableMap={true}
            isServiceArea={!isRequestCreationMode}
            serviceAreaRadiusKm={radius}
            initialValue={displayLocationName || ''}
            initialLocation={selectedLocation}
            minimalMap={true}
            showMapControls={true}
          />
        </View>

        {/* Pick My Current Location button */}
        <TouchableOpacity
          style={styles.currentLocationButton}
          onPress={() => locationSearchRef.current?.detectLocation()}
          activeOpacity={0.8}
          accessibilityLabel={t('sp.selectLocation.pickCurrentLocation')}
        >
          <SvgIcon name="sa-target" size={23} color={SA.currentLocText} />
          <Text style={styles.currentLocationText} numberOfLines={1} ellipsizeMode="tail">
            {t('sp.selectLocation.pickCurrentLocation')}
          </Text>
        </TouchableOpacity>

        {/* Selected Location card */}
        {hasSelection && (
          <View style={styles.locationCard}>
            <View style={styles.pinTile}>
              <SvgIcon name="sa-pin" size={24} color={SA.green} />
            </View>
            <View style={styles.locationCopy}>
              <Text style={[styles.locationTitle, { minWidth: 0 }]} numberOfLines={1} ellipsizeMode="tail">
                {t('sp.selectLocation.selectedLocationTitle')}
              </Text>
              <Text style={[styles.locationAddress, { minWidth: 0 }]} numberOfLines={1} ellipsizeMode="tail">
                {displayLocationName}
              </Text>
            </View>
            <TouchableOpacity style={styles.changeLocation} onPress={() => locationSearchRef.current?.openSearchModal()} activeOpacity={0.7}>
              <SvgIcon name="sa-edit" size={18} color={SA.green} />
              <Text style={styles.changeText} numberOfLines={1} ellipsizeMode="tail">
                Change
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Service Radius card */}
        <View style={styles.radiusCard}>
          <View style={styles.radiusHeading}>
            <View style={styles.radiusIconWrap}>
              <SvgIcon name="sa-radius" size={22} color={SA.green} />
            </View>
            <View style={styles.radiusCopy}>
              <Text style={[styles.radiusTitle, { minWidth: 0 }]} numberOfLines={1} ellipsizeMode="tail">
                {t('sp.selectLocation.radiusTitle')}
              </Text>
              <Text style={[styles.radiusSubtitle, { minWidth: 0 }]} numberOfLines={1} ellipsizeMode="tail">
                {t('sp.selectLocation.radiusHelper')}
              </Text>
            </View>
          </View>
          <View style={styles.radiusOptions}>
            {radiusOptions.map((value) => {
              const active = radius === value;
              return (
                <TouchableOpacity
                  key={value}
                  style={[styles.radiusCell, active && styles.radiusCellActive]}
                  onPress={() => setRadius(value)}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={`${value} kilometres`}
                >
                  <Text style={[styles.radiusCellText, active && styles.radiusCellTextActive]} numberOfLines={1}>
                    {value} km
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <ErrorBanner error={saveError} onRetry={handleSave} />

        <View style={styles.spacer} />
      </ScrollView>

      {/* Fixed bottom CTA */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.confirmButton, (saving || isLocationResolving) && styles.confirmButtonDisabled]}
          onPress={handleSave}
          activeOpacity={0.8}
          disabled={saving || isLocationResolving}
        >
          {saving ? (
            <ActivityIndicator color={'#FFFFFF'} />
          ) : (
            <>
              <Text style={styles.confirmButtonText} numberOfLines={1} ellipsizeMode="tail">
                {t('sp.selectLocation.saveButton')}
              </Text>
              <SvgIcon name="sa-arrow-right" size={21} color={'#FFFFFF'} />
            </>
          )}
        </TouchableOpacity>
      </View>
      <SafeBottomBanner />
      <BlockingLoader visible={saving} />
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 14,
    gap: 13,
  },
  searchWrap: {
    width: '100%',
  },
  searchField: {
    height: 48,
    borderWidth: 1,
    borderColor: SA.border,
    borderRadius: 25,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 7,
    elevation: 2,
  },
  searchInputTouchable: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  searchInputText: {
    fontSize: 14,
    color: SA.muted,
    fontFamily: 'Inter',
  },
  mapSection: {
    width: '100%',
    minHeight: 245,
    maxHeight: 340,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: SA.border,
    backgroundColor: SA.mapBg,
    overflow: 'hidden',
  },
  currentLocationButton: {
    height: 48,
    borderWidth: 1,
    borderColor: SA.currentLocBorder,
    borderRadius: 13,
    backgroundColor: SA.currentLocBg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    flexGrow: 0,
    flexShrink: 0,
  },
  currentLocationText: {
    fontSize: 15,
    fontWeight: '700',
    color: SA.currentLocText,
    fontFamily: 'Inter-SemiBold',
  },
  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 76,
    borderWidth: 1,
    borderColor: SA.border,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    padding: 12,
    shadowColor: '#13261F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 7,
    elevation: 2,
  },
  pinTile: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: SA.iconTileBg,
    alignItems: 'center',
    justifyContent: 'center',
    flexGrow: 0,
    flexShrink: 0,
  },
  locationCopy: {
    minWidth: 0,
    flex: 1,
  },
  locationTitle: {
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 18,
    color: SA.dark,
    marginBottom: 4,
    fontFamily: 'Inter-Bold',
  },
  locationAddress: {
    fontSize: 13,
    color: SA.muted,
    lineHeight: 17,
    fontFamily: 'Inter',
  },
  changeLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 7,
    paddingHorizontal: 2,
    flexGrow: 0,
    flexShrink: 0,
  },
  changeText: {
    fontSize: 13,
    fontWeight: '700',
    color: SA.green,
    fontFamily: 'Inter-SemiBold',
  },
  radiusCard: {
    borderWidth: 1,
    borderColor: SA.border,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    padding: 13,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 7,
    elevation: 2,
  },
  radiusHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  radiusIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: SA.iconTileBg,
    alignItems: 'center',
    justifyContent: 'center',
    flexGrow: 0,
    flexShrink: 0,
  },
  radiusCopy: {
    minWidth: 0,
    flex: 1,
  },
  radiusTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: SA.dark,
    fontFamily: 'Inter-Bold',
  },
  radiusSubtitle: {
    fontSize: 13,
    color: SA.muted,
    lineHeight: 17,
    marginTop: 2,
    fontFamily: 'Inter',
  },
  radiusOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 13,
  },
  radiusCell: {
    height: 39,
    flex: 1,
    minWidth: 0,
    borderWidth: 1,
    borderColor: SA.radiusBtnBorder,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radiusCellActive: {
    backgroundColor: SA.green,
    borderColor: SA.green,
    shadowColor: '#079B5C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 5,
    elevation: 2,
  },
  radiusCellText: {
    fontSize: 13,
    fontWeight: '600',
    color: SA.radiusBtnText,
    fontFamily: 'Inter-SemiBold',
  },
  radiusCellTextActive: {
    color: '#FFFFFF',
  },
  footer: {
    flexGrow: 0,
    flexShrink: 0,
    padding: 11,
    paddingHorizontal: 16,
    paddingBottom: 24,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: SA.footerBorder,
  },
  confirmButton: {
    width: '100%',
    height: 54,
    borderRadius: 13,
    backgroundColor: SA.green2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    shadowColor: '#008B53',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  confirmButtonDisabled: {
    opacity: 0.45,
    shadowOpacity: 0,
    elevation: 0,
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
    fontFamily: 'Inter-Bold',
  },
  spacer: {
    height: 80,
  },
  guardBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  guardIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: SA.mintButton,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  guardText: {
    fontSize: 15,
    lineHeight: 21,
    color: SA.muted,
    textAlign: 'center',
  },
});

export default LocationSelectScreen;
