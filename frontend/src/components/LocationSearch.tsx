import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, TextInput, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Image, Modal, ScrollView } from 'react-native';
import MapView, { PROVIDER_GOOGLE, type MapViewType, type Region } from './AppMapView';
import { Ionicons } from '@expo/vector-icons';
import locationMarkerIcon from '../../assets/location_marker.png';
import SvgIcon from '../assets/icons';
import { spacing, radius, sizes } from '../theme';
import { useTheme } from '../contexts/ThemeContext';
import type { BasePalette } from '../theme/palette';
import { locationManager, useLocation } from '../services/LocationManager';
import * as ExpoLocation from 'expo-location';
import EdgeLoader from './EdgeLoader';
import Header from './Header';
import ErrorBanner from './ErrorBanner';
import { useAuth } from '../contexts/AuthContext';
import { offlineCacheKey, readOfflineCache, writeOfflineCache } from '../utils/offlineCache';
import { placesAutocomplete, placeDetails, reverseGeocode } from '../services/googlePlacesApi';
import { useToast } from '../contexts/ToastContext';
import { useI18n } from '../i18n';

const MAX_SAVED_LOCATIONS = 3;
const CITY_LEVEL_DELTA = 0.4;
const DEFAULT_SERVICE_AREA_RADIUS_KM = 20;
const DEFAULT_LOCATION = {
  latitude: 28.613939,
  longitude: 77.209021,
  latitudeDelta: 0.01,
  longitudeDelta: 0.01,
};

const getRegionFromLocation = (location?: { latitude: number; longitude: number } | null, isServiceArea = false,): Region => ({
  latitude: location?.latitude ?? DEFAULT_LOCATION.latitude,
  longitude: location?.longitude ?? DEFAULT_LOCATION.longitude,
  latitudeDelta: isServiceArea ? CITY_LEVEL_DELTA : 0.01,
  longitudeDelta: isServiceArea ? CITY_LEVEL_DELTA : 0.01,
});

export type Location = {
  place_id: string;
  description: string;
  lat?: number;
  lng?: number;
};

type Props = {
  onSelect: (location: any | null) => void;
  onResolvingChange?: (isResolving: boolean) => void;
  initialValue?: string;
  enableMap?: boolean;
  initialLocation?: { lat?: number; lng?: number; description?: string; name?: string; place_id?: string; placeId?: string };
  mapHeight?: number;
  isServiceArea?: boolean;
  serviceAreaRadiusKm?: number;
  /** When true, only renders the map (no search overlay, no map actions). */
  minimalMap?: boolean;
  /** Renders the approved-design recenter / layers controls on the map. */
  showMapControls?: boolean;
  /** Ref to expose detectLocation and openSearchModal functions. */
  locationRef?: React.Ref<{ detectLocation: () => void; openSearchModal: () => void }>;
};

const LocationSearch = React.forwardRef<{
  detectLocation: () => void;
  openSearchModal: () => void;
  recenter: () => void;
  toggleMapType: () => void;
}, Props>(({
  onSelect,
  onResolvingChange,
  initialValue = '',
  enableMap = false,
  initialLocation,
  mapHeight,
  isServiceArea = false,
  serviceAreaRadiusKm = DEFAULT_SERVICE_AREA_RADIUS_KM,
  minimalMap = false,
  showMapControls = false,
  locationRef,
}, ref) => {
  const { t } = useI18n();
  const { user } = useAuth();
  const { showToast } = useToast();
  const { base: C, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(C, isDark), [C, isDark]);
  const savedLocationsCacheKey = user?.id ? offlineCacheKey('saved-locations', user.id) : null;
  const [savedLocations, setSavedLocations] = useState<Location[]>([]);
  const [savedLocationsLoaded, setSavedLocationsLoaded] = useState(false);
  const { gpsLocation, ipLocation } = useLocation();
  const lastSavedLocation = savedLocations.find((location): location is Location & { lat: number; lng: number } =>
    typeof location.lat === 'number' && Number.isFinite(location.lat)
    && typeof location.lng === 'number' && Number.isFinite(location.lng));
  const liveDefaultRegion = useMemo(() =>
    getRegionFromLocation(
      lastSavedLocation
        ? { latitude: lastSavedLocation.lat, longitude: lastSavedLocation.lng }
        : gpsLocation ?? ipLocation,
      isServiceArea,
    ), [lastSavedLocation, gpsLocation, ipLocation, isServiceArea]);
  const [query, setQuery] = useState(initialValue);
  const [suggestions, setSuggestions] = useState<Array<{ place_id: string; description: string }>>([]);
  const [isLocating, setIsLocating] = useState(false);
  const [cachedLocation, setCachedLocation] = useState<any>(null); // Cache for current location
  const [currentLocationRegion, setCurrentLocationRegion] = useState<{ latitude: number; longitude: number } | null>(null);
  const [mapRegion, setMapRegion] = useState<Region | null>(
    initialLocation?.lat && initialLocation?.lng
      ? getRegionFromLocation({ latitude: initialLocation.lat, longitude: initialLocation.lng }, isServiceArea)
      : liveDefaultRegion
  );
  const [isMapReady, setIsMapReady] = useState(!enableMap);
  const [isMapInteracting, setIsMapInteracting] = useState(false);
  const [isSearchOverlayVisible, setIsSearchOverlayVisible] = useState(false);
  const [isLocationResolving, setIsLocationResolving] = useState(false);
  const [locationError, setLocationError] = useState<unknown | null>(null);
  const [mapType, setMapType] = useState<'standard' | 'satellite'>('standard');
  const autoSelectedCurrentLocation = useRef(false);
  const regionChangeTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestMapSelectionRequest = useRef(0);
  const userInteractedRef = useRef(false);
  /* Set when the map is moved by the component itself (tap-to-select, search
     result, GPS detect). The resulting region-change event must not schedule
     a second lookup for the same spot. */
  const programmaticCenterRef = useRef<{ latitude: number; longitude: number } | null>(null);
  /* Id of the selection still waiting for its address (0 = none). Keeps a
     stray idle event from clearing the resolving state too early. */
  const pendingSelectionRef = useRef(0);
  const mapRef = useRef<MapViewType | null>(null);
  const selectedPlaceId = initialLocation?.place_id ?? initialLocation?.placeId;
  const recentLocations = savedLocations.filter((location) => location.place_id !== selectedPlaceId);

  useEffect(() => {
    onResolvingChange?.(isLocationResolving);
  }, [isLocationResolving, onResolvingChange]);

  const animateToRegion = (region: Region, duration = 300) => {
    if (mapRef.current) {
      mapRef.current.animateToRegion(region, duration);
    } else {
      setMapRegion(region);
    }
  };

  const toggleMapType = () => setMapType((current) => (current === 'standard' ? 'satellite' : 'standard'));

  useEffect(() => {
    let isActive = true;
    void getSavedLocations().then((locations) => {
      if (!isActive) return;
      setSavedLocations(locations);
      setSavedLocationsLoaded(true);
    });
    return () => {
      isActive = false;
    };
  }, [savedLocationsCacheKey, initialValue]);

  useEffect(() => {
    void locationManager.initialize();
  }, []);

  useEffect(() => {
    if (!enableMap) {
      return;
    }

    setIsMapReady(true);

    /* Center on an explicit initial location, keyed on its coordinates (not
       object identity — the parent recreates the object on every card
       update). Never re-animates from here: the map is already where the
       user put it, and re-animating would yank it mid-selection. */
    const lat = initialLocation?.lat;
    const lng = initialLocation?.lng;
    if (lat != null && lng != null) {
      const region = getRegionFromLocation({ latitude: lat, longitude: lng }, isServiceArea);
      setMapRegion((currentRegion) =>
        currentRegion && regionsAreClose(currentRegion, region) ? currentRegion : region
      );
      return;
    }

    /* No explicit location: fall back to the live default region, but only
       until the user starts choosing a spot themselves. */
    if (userInteractedRef.current) return;
    setMapRegion((currentRegion) => currentRegion ?? liveDefaultRegion);
  }, [enableMap, initialLocation?.lat, initialLocation?.lng, isServiceArea, liveDefaultRegion]);

  const fetchSuggestions = async (text: string) => {
    if (!text) {
      setSuggestions([]);
      return;
    }

    setLocationError(null);
    try {
      // On web this routes through the backend /google-places proxy to
      // avoid CORS; on native it calls Google directly.
      const data = await placesAutocomplete({
        input: text,
        components: 'country:in',
      });
      const filteredSuggestions = (data.predictions || []).filter((prediction: any) => {
        const types = prediction.types || [];
        // Exclude suggestions that are cities, states, or countries
        return !types.includes('locality') && !types.includes('administrative_area_level_1') && !types.includes('country');
      });
      const processedSuggestions = filteredSuggestions.map((suggestion: { terms: { value: string }[]; description: string }) => ({
        ...suggestion,
        description: removeStateAndCountry(suggestion),
      }));
      setSuggestions(processedSuggestions as unknown as Array<{ place_id: string; description: string }>);
    } catch (error) {
      setLocationError(error);
    }
  };

  const removeStateAndCountry = (place: { terms: { value: string }[]; description: string }) => {
    const terms = place.terms || [];
    if (terms.length > 2) {
      // Exclude the last two terms (state and country)
      return capitalizeWords(terms.slice(0, -2).map((term: { value: string }) => term.value).join(', '));
    }
    return place.description; // Fallback to the full description if terms are insufficient
  };

  const handleSelect = async (place: any) => {
    if (place.place_id === 'current_location') {
      setIsSearchOverlayVisible(false);
      return detectLocation();
    }

    setIsLocationResolving(true);
    const cleanedPlaceName = removeStateAndCountry(place);
    setSuggestions([]);
    setIsSearchOverlayVisible(false);
    /* A pending map-settle lookup must not overwrite the place the user just
       picked from the search results. */
    if (regionChangeTimeout.current) {
      clearTimeout(regionChangeTimeout.current);
      regionChangeTimeout.current = null;
    }
    latestMapSelectionRequest.current += 1;
    pendingSelectionRef.current = 0;

    if (!place.place_id) {
      onSelect({ ...place, description: cleanedPlaceName });
      setIsLocationResolving(false);
      return;
    }

    setLocationError(null);
    try {
      const data = await placeDetails({ place_id: place.place_id });
      const location = data?.result?.geometry?.location;
      if (!location) {
        throw new Error('Place details missing geometry');
      }
      const { lat, lng } = location;
      place.description = cleanedPlaceName;
      const selectedLocation = { ...place, lat, lng };
      onSelect(selectedLocation);
      const region = getRegionFromLocation({ latitude: lat, longitude: lng }, isServiceArea);
      setMapRegion(region);
      animateToRegion(region);
      await saveLocation(selectedLocation);
      setSavedLocations(await getSavedLocations());
      setIsLocationResolving(false);
    } catch (error) {
      setLocationError(error);
      onSelect({ ...place, description: cleanedPlaceName });
      setIsLocationResolving(false);
    }
  };

  const detectLocation = async () => {
    if (isLocating) return; // double-tap / re-entry guard — one fix at a time
    if (regionChangeTimeout.current)
      clearTimeout(regionChangeTimeout.current);
    latestMapSelectionRequest.current += 1;
    pendingSelectionRef.current = 0;
    setIsLocationResolving(true);
    setLocationError(null);
    let detectedLocation = cachedLocation; // Use cached location if available
    if (!detectedLocation) {
    try {
      setIsLocating(true);
      const gpsLocation = await locationManager.getGPSLocation(true);
      if (!gpsLocation) {
        setIsLocationResolving(false);
        return;
      }

      const geocodedLocation = await reverseGeocodeLocation(gpsLocation.latitude, gpsLocation.longitude);
      detectedLocation = { lat: gpsLocation.latitude, lng: gpsLocation.longitude, ...geocodedLocation };
      setCachedLocation(detectedLocation); // Cache the detected location
    } catch (error: any) {
      const message = error?.message || String(error);
      const isExpectedFailure = message.includes('unsatisfied device settings')
        || message.includes('Location request failed')
        || message.includes('LOCATION_SERVICES_DISABLED')
        || message.includes('permissions');
      if (!isExpectedFailure) {
        setLocationError(error);
      }
    } finally {
      setIsLocating(false);
      }
    }

    if (!detectedLocation) {
      setIsLocationResolving(false);
      return;
    }

    setCurrentLocationRegion({
      latitude: detectedLocation.lat,
      longitude: detectedLocation.lng,
    });
    setIsSearchOverlayVisible(false);
    onSelect(detectedLocation);
    const region = {
      latitude: detectedLocation.lat,
      longitude: detectedLocation.lng,
      latitudeDelta: isServiceArea ? CITY_LEVEL_DELTA : 0.01,
      longitudeDelta: isServiceArea ? CITY_LEVEL_DELTA : 0.01,
    };
    setMapRegion(region);
    animateToRegion(region);
    setIsLocationResolving(false);
    return;
  };

  // Expose detectLocation and openSearchModal via ref
  React.useImperativeHandle(ref, () => ({
    detectLocation: () => { void detectLocation(); },
    openSearchModal: () => setIsSearchOverlayVisible(true),
    recenter: () => {},
    toggleMapType,
  }), [detectLocation, toggleMapType]);

  useEffect(() => {
    if (!enableMap || !savedLocationsLoaded || (initialLocation?.lat != null && initialLocation?.lng != null) || autoSelectedCurrentLocation.current)
      return;

    autoSelectedCurrentLocation.current = true;
    if (lastSavedLocation) {
      onSelect(lastSavedLocation);
      return;
    }
    void detectLocation();
  }, [enableMap, initialLocation, isServiceArea, savedLocationsLoaded, lastSavedLocation, onSelect]);

  const reverseGeocodeLocation = async (latitude: number, longitude: number) => {
    setLocationError(null);
    /* 1) Google geocoder — rich address components. */
    try {
      const data = await reverseGeocode({ latlng: `${latitude},${longitude}` });
      if (data?.results && data.results.length > 0) {
        const result = data.results[0];
        const components: Array<{ long_name: string; short_name: string; types: string[] }> =
          result.address_components || [];
        const pick = (types: string[], short = false): string | null => {
          for (const type of types) {
            const found = components.find((c) => c.types.includes(type));
            if (found) return short ? found.short_name : found.long_name;
          }
          return null;
        };
        /* Clean "Area, City" label (e.g. "Civil Lines, Jhansi") — the most
           specific area plus the city, de-duplicated, no street noise. */
        const area = pick(['neighborhood', 'sublocality_level_2', 'sublocality_level_1', 'sublocality']);
        const city = pick(['locality', 'administrative_area_level_2', 'administrative_area_level_1']);
        const label = Array.from(new Set([area, city].filter(Boolean))).join(', ');
        if (label) {
          return { description: label, name: label, place_id: result.place_id };
        }
      }
    } catch (error) {
      setLocationError(error);
    }
    /* 2) OS geocoder fallback (expo-location) — works without an API key. */
    try {
      const places = await ExpoLocation.reverseGeocodeAsync({ latitude, longitude });
      const place = places?.[0];
      if (place) {
        const area = place.district || place.subregion || place.street || null;
        const city = place.city || place.region || null;
        const label = Array.from(new Set([area, city].filter(Boolean))).join(', ');
        if (label) return { description: label, name: label, place_id: undefined as any };
      }
    } catch {
      // OS geocoder unavailable — fall through to the generic label.
    }
    return { description: 'Selected location', name: 'Selected location' };
  };

  const isSameCoordinate = (
    a: { latitude: number; longitude: number } | null,
    b: { latitude: number; longitude: number } | null,
    delta = 0.00005
  ) => {
    if (!a || !b) return false;
    return Math.abs(a.latitude - b.latitude) < delta && Math.abs(a.longitude - b.longitude) < delta;
  };

  const regionsAreClose = (r1: Region | null, r2: Region | null, delta = 0.00005) =>
    isSameCoordinate(r1, r2, delta);

  /**
   * The single entry point for "the user picked this spot on the map".
   *
   * The coordinates are handed to the opener immediately (so the selected
   * location card stops showing the previous address and switches to its
   * locating state), then the resolved address follows as soon as the
   * reverse geocoder answers. Latest request wins, so a fast second tap can
   * never be overwritten by a slower first lookup.
   */
  const selectMapCoordinate = async (
    latitude: number,
    longitude: number,
    options?: { moveMap?: boolean }
  ) => {
    if (regionChangeTimeout.current) {
      clearTimeout(regionChangeTimeout.current);
      regionChangeTimeout.current = null;
    }

    if (options?.moveMap) {
      const latitudeDelta = mapRegion?.latitudeDelta ?? (isServiceArea ? CITY_LEVEL_DELTA : 0.01);
      const longitudeDelta = mapRegion?.longitudeDelta ?? (isServiceArea ? CITY_LEVEL_DELTA : 0.01);
      const region: Region = { latitude, longitude, latitudeDelta, longitudeDelta };
      programmaticCenterRef.current = { latitude, longitude };
      setMapRegion(region);
      animateToRegion(region, 250);
    }

    const requestId = ++latestMapSelectionRequest.current;
    pendingSelectionRef.current = requestId;
    setIsLocationResolving(true);
    onSelect({ lat: latitude, lng: longitude });

    const geocodedLocation = await reverseGeocodeLocation(latitude, longitude);
    if (requestId !== latestMapSelectionRequest.current) return;
    if (pendingSelectionRef.current === requestId) pendingSelectionRef.current = 0;
    onSelect({ lat: latitude, lng: longitude, ...geocodedLocation });
    setIsLocationResolving(false);
  };

  const scheduleCenterLocationUpdate = (region: Region) => {
    // short debounce so the selected-address card follows the map quickly
    // without spamming the geocoder
    if (regionChangeTimeout.current) {
      clearTimeout(regionChangeTimeout.current);
    }

    regionChangeTimeout.current = setTimeout(() => {
      void selectMapCoordinate(region.latitude, region.longitude);
    }, 450);
  };

  useEffect(() => {
    return () => {
      if (regionChangeTimeout.current) {
        clearTimeout(regionChangeTimeout.current);
      }
    };
  }, []);

  const saveLocation = async (location: Location) => {
    if (!savedLocationsCacheKey) return;
    try {
      const savedLocations = (await readOfflineCache<Location[]>(savedLocationsCacheKey)) || [];
      const updatedLocations = [location, ...savedLocations.filter((loc) => loc.place_id !== location.place_id)].slice(0, MAX_SAVED_LOCATIONS);
      await writeOfflineCache(savedLocationsCacheKey, updatedLocations);
    } catch (error) {
      console.error('Error saving location:', error);
    }
  };

  const getSavedLocations = async (): Promise<Location[]> => {
    if (!savedLocationsCacheKey) return [];
    try {
      return (await readOfflineCache<Location[]>(savedLocationsCacheKey)) || [];
    } catch (error) {
      // console.error('Error retrieving saved locations:', error);
      return [];
    }
  };


  const capitalizeWords = (text: string) => {
    return text.replace(/\b\w+/g, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
  };

  const renderLocationOption = (item: { place_id: string; description: string }, iconName?: string) => (
    <TouchableOpacity
      key={item.place_id || item.description}
      onPress={() => handleSelect(item)}
    >
      <View style={styles.suggestionRow}>
        {iconName ? (
          <View style={styles.iconWrap}>
            <Ionicons name={iconName as any} size={16} color={C.primary} />
          </View>
        ) : null}
        <Text style={styles.suggestion}>{item.description}</Text>
      </View>
    </TouchableOpacity>
  );

  const isCurrentLocationSelected = currentLocationRegion
    && mapRegion
    && Math.abs(currentLocationRegion.latitude - mapRegion.latitude) < 0.00005
    && Math.abs(currentLocationRegion.longitude - mapRegion.longitude) < 0.00005;

  return (
    <View style={enableMap && !mapHeight ? styles.flexContainer : undefined}>
      
      {enableMap && (
        <View style={[styles.mapContainer, mapHeight ? { height: mapHeight } : { flex: 1 }]}>            
          {!isMapReady && (
            <View style={styles.mapLoadingOverlay}>
              <ActivityIndicator size="large" color={C.primary} />
            </View>
          )}
          {mapRegion ? (
            <View style={styles.mapWrapper}>
              <MapView
                ref={(ref) => { mapRef.current = ref; }}
                provider={PROVIDER_GOOGLE}
                style={styles.map}
                initialRegion={mapRegion || DEFAULT_LOCATION}
                mapType={mapType}
                serviceArea={isServiceArea && mapRegion ? {
                  center: { latitude: mapRegion.latitude, longitude: mapRegion.longitude },
                  radius: serviceAreaRadiusKm * 1000,
                } : undefined}
                onPanDrag={() => {
                  userInteractedRef.current = true;
                  /* A drag is the user driving again — any pending
                     programmatic recenter no longer applies. */
                  programmaticCenterRef.current = null;
                  setIsMapInteracting(true);
                  setIsLocationResolving(true);
                }}
                onPress={(e: any) => {
                  /* Tap-to-select: choosing a spot on the map moves the centre
                     pin onto it and reverse-geocodes the address, so the
                     selected-location card follows the tap. */
                  const coordinate = e?.nativeEvent?.coordinate;
                  const latitude = Number(coordinate?.latitude);
                  const longitude = Number(coordinate?.longitude);
                  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;
                  if (latitude === 0 && longitude === 0) return;
                  userInteractedRef.current = true;
                  setIsMapInteracting(false);
                  void selectMapCoordinate(latitude, longitude, { moveMap: true });
                }}
                onRegionChangeComplete={(region: Region) => {
                  userInteractedRef.current = true;
                  setIsMapInteracting(false);

                  /* The component itself just moved the map (tap, search
                     result, GPS) — that spot is already being resolved. */
                  const programmaticCenter = programmaticCenterRef.current;
                  if (
                    programmaticCenter &&
                    pendingSelectionRef.current &&
                    isSameCoordinate(programmaticCenter, region, 0.0005)
                  ) {
                    programmaticCenterRef.current = null;
                    setMapRegion(region);
                    return;
                  }

                  if (!regionsAreClose(mapRegion, region)) { // Only update if new region differs meaningfully
                    setMapRegion(region);
                    scheduleCenterLocationUpdate(region);
                  } else if (!pendingSelectionRef.current) {
                    setIsLocationResolving(false);
                  }
                }}
                onMapReady={() => setIsMapReady(true)}
                showsUserLocation={true}
                showsMyLocationButton={false}
              />
              <EdgeLoader visible={isLocationResolving} />
              <View pointerEvents="none" style={styles.centerMarkerContainer}>
                <Image
                  source={locationMarkerIcon}
                  style={[
                    styles.centerMarker,
                    isMapInteracting && styles.centerMarkerActive,
                  ]}
                  resizeMode="contain"
                />
              </View>
              {showMapControls && (
                <View style={styles.mapControls} pointerEvents="box-none">
                  <TouchableOpacity
                    style={styles.mapControlButton}
                    onPress={toggleMapType}
                    activeOpacity={0.8}
                    accessibilityRole="button"
                    accessibilityLabel="Toggle map layers"
                  >
                    <SvgIcon name="sa-layers" size={24} color={C.dark} />
                  </TouchableOpacity>
                </View>
              )}
              {!minimalMap && (
                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={() => setIsSearchOverlayVisible(true)}
                  style={styles.mapInputOverlay}
                  accessibilityLabel={t('locationSearch.placeholder')}>
                  <TextInput
                    placeholder={t('locationSearch.mapPlaceholder')}
                    placeholderTextColor={C.primary}
                    keyboardAppearance={isDark ? 'dark' : 'light'}
                    editable={false}
                    pointerEvents="none"
                    style={styles.mapInput}
                  />
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View style={[styles.map, styles.mapPlaceholder]}>
              <ActivityIndicator size="large" color={C.primary} />
            </View>
          )}
          {!minimalMap && (
            <View style={styles.mapActions}>
              <TouchableOpacity
                style={[styles.mapButton, isCurrentLocationSelected && styles.mapButtonDisabled]}
                onPress={() => {
                  if (isCurrentLocationSelected) {
                    showToast('Current location already selected');
                    return;
                  }
                  void detectLocation();
                }}
                accessibilityLabel="Center map on current location"
              >
                <Ionicons name="locate" size={18} color={C.onPrimary} />
                <Text style={styles.mapButtonText}>{t('locationSearch.pickCurrentLocation')}</Text>
              </TouchableOpacity>
              {recentLocations.length > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.recentLocationsScroll}
                contentContainerStyle={styles.recentLocationsContent}>
                {recentLocations.map((item) => (
                  <TouchableOpacity
                    key={item.place_id || `${item.lat},${item.lng}`}
                    style={styles.recentLocationTag}
                    onPress={() => void handleSelect(item)}
                    activeOpacity={0.8}
                    accessibilityRole="button"
                    accessibilityLabel={`Select recent location ${item.description}`}>
                    <Ionicons name="time-outline" size={14} color={C.primary} />
                    <Text style={styles.recentLocationTagText} numberOfLines={1}>
                      {item.description}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
            </View>
          )}
        </View>
      )}
      <Modal
        visible={isSearchOverlayVisible}
        animationType="slide"
        transparent
        statusBarTranslucent
        onRequestClose={() => setIsSearchOverlayVisible(false)}
      >
        <View style={styles.overlay}>
          <Header title={'Search Location'} showBackButton={true} showNotification={false}
                  keepTitleCenterAligned={false} onBackPress={() => setIsSearchOverlayVisible(false)} />
          <View id="location-search-input" style={styles.overlayContent}>
            <View style={styles.inputWrap}>
              <TextInput
                style={[styles.searchInput, { maxHeight: 60 }]} // Adjust maxHeight to fit 2 lines
                placeholder={isLocating ? 'Fetching current location...' : t('locationSearch.placeholder')}
                placeholderTextColor={C.grey}
                value={query}
                submitBehavior="blurAndSubmit"
                keyboardAppearance={isDark ? 'dark' : 'light'}
                returnKeyType="done"
                multiline={true} // Enable multiline to allow wrapping
                numberOfLines={2} // Limit to 2 lines
                autoFocus
                onFocus={() => {
                    setQuery('');
                    setSuggestions([]);
                    // onSelect(null);
                }}
                onChangeText={(text) => {
                  setQuery(text);
                  if (!text.trim()) {
                    setSuggestions([]);
                    onSelect(null);
                    return;
                  }
                  fetchSuggestions(text);
                }}
              />
              {/* {query.length == 0 && !isLocating && (
                <TouchableOpacity
                  onPress={detectLocation}
                  style={styles.rightAdornment}
                  accessibilityLabel="Detect current location"
                >
                  <Ionicons name="locate-outline" size={21} color={colors.dark} />
                </TouchableOpacity>
              )} */}
              {query.length > 0 && (
                <TouchableOpacity id="clear-button"
                  onPress={() => {
                    setQuery('');
                    setSuggestions([]);
                    onSelect(null);
                  }}
                  style={styles.clearButton}
                >
                  <Ionicons name="close-circle" size={21} color={C.grey} />
                </TouchableOpacity>
              )}
              {isLocating && (
                <ActivityIndicator style={styles.rightAdornment} size="small" />
              )}
            </View>
            {query.trim() === '' && savedLocations.length > 0 && (
              <View style={styles.suggestionsContainer}>
                {savedLocations.map((item) => renderLocationOption(item, 'time-outline'))}
              </View>
            )}
            {query.trim() !== '' && suggestions.length > 0 && (
              <View style={styles.suggestionsContainer}>
                {suggestions.map((item) => renderLocationOption(item, 'location-outline'))}
              </View>
            )}
          </View>
        </View>
      </Modal>
      <ErrorBanner error={locationError} />
    </View>
  );
});

const makeStyles = (C: BasePalette, isDark: boolean) => StyleSheet.create({
  inputWrap: {
    position: 'relative',
  },
  searchInput: {
    borderWidth: 1,
    borderColor: C.greyLight,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    color: C.dark,
    backgroundColor: C.white,
    paddingRight: sizes.inputRightPadding,
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    height: 60, // Fixed height to accommodate 2 lines of text
  },
  rightAdornment: {
    position: 'absolute',
    right: spacing.sm,
    top: spacing.sm,
  },
  clearButton: {
    position: 'absolute',
    right: spacing.md,
    top: spacing.sm,
  },
  suggestionsContainer: {
    borderWidth: 1,
    borderColor: C.greyLight,
    overflow: 'hidden',
    backgroundColor: C.white,
  },
  iconWrap: {
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  suggestion: {
    flex: 1,
    color: C.dark,
    fontSize: 15,
    fontFamily: 'Inter',
    lineHeight: 20,
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: C.greyLight,
    minHeight: 56,
  },
  mapContainer: {
    width: '100%',
    backgroundColor: C.greyLight,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  flexContainer: {
    flex: 1,
  },
  mapWrapper: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  centerMarkerContainer: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  centerMarker: {
    width: 42,
    height: 42,
  },
  centerMarkerActive: {
    width: 28,
    height: 28,
    opacity: 0.75,

  },
  mapLoadingOverlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    alignItems: 'center',
    /* Light keeps its white veil over the map; dark uses the themed scrim. */
    backgroundColor: isDark ? C.scrim : 'rgba(255,255,255,0.85)',
    zIndex: 1,
  },
  mapControls: {
    position: 'absolute',
    right: 12,
    bottom: 16,
    gap: 9,
    zIndex: 4,
  },
  mapControlButton: {
    width: 46,
    height: 46,
    borderRadius: 15,
    backgroundColor: C.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.14,
    shadowRadius: 12,
    elevation: 4,
  },
  mapInputOverlay: {
    position: 'absolute',
    top: spacing.sm,
    alignSelf: 'center',
    width: '78%',
    zIndex: 3,
  },
  mapInput: {
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.primary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: C.primary,
    fontSize: 14,
    fontFamily: 'Inter',
    opacity: 0.95,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  mapActions: {
    position: 'absolute',
    bottom: spacing.xs,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  mapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.primary,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: C.white,
    paddingHorizontal: 24,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.28,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
  },
  mapButtonDisabled: {
    backgroundColor: C.grey,
    opacity: 0.85,
  },
  recentLocationsScroll: {
    width: '100%',
    maxHeight: 40,
  },
  recentLocationsContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  recentLocationTag: {
    maxWidth: 220,
    minHeight: 32,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.primaryBorder,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    elevation: 2,
  },
  recentLocationTagText: {
    flexShrink: 1,
    color: C.grey,
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
  },
  mapButtonText: {
    color: C.onPrimary,
    fontSize: 14,
    fontFamily: 'Google Sans Flex-SemiBold',
    marginLeft: spacing.xs,
  },
  mapPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 20,
    backgroundColor: C.scrim,
    justifyContent: 'flex-start',
  },
  overlayContent: {
    position: 'relative',
    zIndex: 1,
    width: '100%',
    flex: 1,
    backgroundColor: C.white,
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
  },
});

export default LocationSearch;
