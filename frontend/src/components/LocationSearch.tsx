import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, TextInput, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Image, Modal } from 'react-native';
import MapView, { PROVIDER_GOOGLE, type MapViewType, type Region } from './AppMapView';
import { Ionicons } from '@expo/vector-icons';
import locationMarkerIcon from '../../assets/location_marker.png';
import { colors, spacing, radius, sizes } from '../theme';
import { locationManager, useLocation } from '../services/LocationManager';
import EdgeLoader from './EdgeLoader';
import Header from './Header';
import ErrorBanner from './ErrorBanner';
import { useAuth } from '../contexts/AuthContext';
import { offlineCacheKey, readOfflineCache, writeOfflineCache } from '../utils/offlineCache';
import { placesAutocomplete, placeDetails, reverseGeocode } from '../services/googlePlacesApi';
import { useToast } from '../contexts/ToastContext';

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

type Location = {
  place_id: string;
  description: string;
  lat?: number;
  lng?: number;
};

type Props = {
  onSelect: (location: any | null) => void;
  initialValue?: string;
  placeholder?: string;
  enableMap?: boolean;
  initialLocation?: { lat?: number; lng?: number; description?: string; name?: string; place_id?: string; placeId?: string };
  mapHeight?: number;
  isServiceArea?: boolean;
  serviceAreaRadiusKm?: number;
};

const LocationSearch: React.FC<Props> = ({
  onSelect,
  initialValue = '',
  placeholder = 'Select location',
  enableMap = false,
  initialLocation,
  mapHeight,
  isServiceArea = false,
  serviceAreaRadiusKm = DEFAULT_SERVICE_AREA_RADIUS_KM,
}) => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const savedLocationsCacheKey = user?.id ? offlineCacheKey('saved-locations', user.id) : null;
  const { gpsLocation, ipLocation } = useLocation();
  const liveDefaultRegion = useMemo(() => 
    getRegionFromLocation(gpsLocation ?? ipLocation, isServiceArea),[gpsLocation, ipLocation, isServiceArea]);
  const [query, setQuery] = useState(initialValue);
  const [suggestions, setSuggestions] = useState<Array<{ place_id: string; description: string }>>([]);
  const [savedLocations, setSavedLocations] = useState<Array<{ place_id: string; description: string }>>([]);
  const [locating, setLocating] = useState(false);
  const [cachedLocation, setCachedLocation] = useState<any>(null); // Cache for current location
  const [currentLocationRegion, setCurrentLocationRegion] = useState<{ latitude: number; longitude: number } | null>(null);
  const [mapRegion, setMapRegion] = useState<Region | null>(
    initialLocation?.lat && initialLocation?.lng
      ? getRegionFromLocation({ latitude: initialLocation.lat, longitude: initialLocation.lng }, isServiceArea)
      : liveDefaultRegion
  );
  const [mapLoading, setMapLoading] = useState(enableMap);
  const [isMapInteracting, setIsMapInteracting] = useState(false);
  const [showLocationSearchOverlay, setShowLocationSearchOverlay] = useState(false);
  const [showEdgeLoader, setShowEdgeLoader] = useState(false);
  const [locationError, setLocationError] = useState<unknown | null>(null);
  const autoSelectedCurrentLocation = useRef(false);
  const regionChangeTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestMapSelectionRequest = useRef(0);
  const mapRef = useRef<MapViewType | null>(null);

  const animateToRegion = (region: Region) => {
    if (mapRef.current) {
      mapRef.current.animateToRegion(region, 300);
    } else {
      setMapRegion(region);
    }
  };

  useEffect(() => {
    (async () => {
      const locations = await getSavedLocations();
      setSavedLocations(locations);
    })();
  }, [initialValue]);

  useEffect(() => {
    void locationManager.initialize();
  }, []);

  useEffect(() => {
    if (!enableMap) {
      return;
    }

    const region = initialLocation?.lat && initialLocation?.lng
      ? getRegionFromLocation({ latitude: initialLocation.lat, longitude: initialLocation.lng }, isServiceArea)
      : liveDefaultRegion;

    setMapRegion((currentRegion) => {
      if (currentRegion && regionsAreClose(currentRegion, region)) 
        return currentRegion;
      return region;
    });
    setMapLoading(false);

    if (mapRef.current) {
      animateToRegion(region);
    }
  }, [enableMap, initialLocation, liveDefaultRegion, isServiceArea]);

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
      // setLocationError(null);
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

  const removeStateCountryAndPostalCode = (result: any) => { // this is for treating api responses from geocode api.. places api gives different reponse structure 
    const addressComponents = result?.address_components || [];

    const filteredComponents = addressComponents.filter((component: any) => {
      const types = component?.types || [];
      return !types.some((type: string) => ['plus_code','street_number','route','premise','subpremise','country', 'administrative_area_level_1', 'administrative_area_level_2', 'postal_code'].includes(type));
    });

    const cleanedNames = filteredComponents
      .map((component: any) => component?.long_name || component?.short_name)
      .filter(Boolean);

    if (cleanedNames.length > 0) {
      return cleanedNames.join(', ');
    }

    return result?.formatted_address || '';
  };

  const handleSelect = async (place: any) => {
    if (place.place_id === 'current_location') {
      setShowLocationSearchOverlay(false);
      return detectLocation();
    }

    setShowEdgeLoader(true);
    const cleanedPlaceName = removeStateAndCountry(place);
    setSuggestions([]);
    setShowLocationSearchOverlay(false);

    if (!place.place_id) {
      onSelect({ ...place, description: cleanedPlaceName });
      setShowEdgeLoader(false);
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
      // setLocationError(null);
      setShowEdgeLoader(false);
    } catch (error) {
      setLocationError(error);
      onSelect({ ...place, description: cleanedPlaceName });
      setShowEdgeLoader(false);
    }
  };

  const detectLocation = async () => {
    if (regionChangeTimeout.current) 
      clearTimeout(regionChangeTimeout.current);
    latestMapSelectionRequest.current += 1;
    setShowEdgeLoader(true);
    setLocationError(null);
    let detectedLocation = cachedLocation; // Use cached location if available
    if (!detectedLocation) {
      try {
        setLocating(true);
        const gpsLocation = await locationManager.getGPSLocation(true);
        if (!gpsLocation) {
          setShowEdgeLoader(false);
          return;
        }

        const displayName = await reverseGeocodeLocation(gpsLocation.latitude, gpsLocation.longitude);
        detectedLocation = { lat: gpsLocation.latitude, lng: gpsLocation.longitude, description: displayName };
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
        setLocating(false);
      }
    }

    if (!detectedLocation) {
      setShowEdgeLoader(false);
      return;
    }

    setCurrentLocationRegion({
      latitude: detectedLocation.lat,
      longitude: detectedLocation.lng,
    });
    setShowLocationSearchOverlay(false);
    onSelect(detectedLocation);
    const region = {
      latitude: detectedLocation.lat,
      longitude: detectedLocation.lng,
      latitudeDelta: isServiceArea ? CITY_LEVEL_DELTA : 0.01,
      longitudeDelta: isServiceArea ? CITY_LEVEL_DELTA : 0.01,
    };
    setMapRegion(region);
    animateToRegion(region);
    setShowEdgeLoader(false);
    return;
  };

  useEffect(() => {
    if (!enableMap || (initialLocation?.lat != null && initialLocation?.lng != null) || autoSelectedCurrentLocation.current) 
      return;

    autoSelectedCurrentLocation.current = true;
    void detectLocation();
  }, [enableMap, initialLocation, isServiceArea]);

  const reverseGeocodeLocation = async (latitude: number, longitude: number) => {
    setLocationError(null);
    try {
      const data = await reverseGeocode({ latlng: `${latitude},${longitude}` });
      // setLocationError(null);
      if (data.results && data.results.length > 0)
        return removeStateCountryAndPostalCode(data.results[0]);
    } catch (error) {
      setLocationError(error);
    }
    return 'Selected location';
  };

  const regionsAreClose = (r1: Region | null, r2: Region | null, delta = 0.00005) => {
    if (!r1 || !r2) return false;
    return (
      Math.abs((r1.latitude ?? 0) - (r2.latitude ?? 0)) < delta &&
      Math.abs((r1.longitude ?? 0) - (r2.longitude ?? 0)) < delta
    );
  };

  const scheduleCenterLocationUpdate = (region: Region) => { // delay the reverse geocoding to avoid excessive API calls while user is interacting with the map
    if (regionChangeTimeout.current) {
      clearTimeout(regionChangeTimeout.current);
    }

    const requestId = ++latestMapSelectionRequest.current;
    regionChangeTimeout.current = setTimeout(async () => {
      const description = await reverseGeocodeLocation(region.latitude, region.longitude);
      if (requestId !== latestMapSelectionRequest.current) return;
      onSelect({ lat: region.latitude, lng: region.longitude, description });
      setShowEdgeLoader(false);
    }, 3000);
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

  const shown = suggestions.slice(0, 5);

  const capitalizeWords = (text: string) => {
    return text.replace(/\b\w+/g, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
  };

  const renderLocationOption = (item: { place_id: string; description: string }, isCurrentLocation = false, iconName?: string) => (
    <TouchableOpacity
      key={item.place_id}
      onPress={() => (isCurrentLocation ? detectLocation() : handleSelect(item))}
    >
      <View style={styles.suggestionRow}>
        {iconName ? (
          <View style={styles.iconWrap}>
            <Ionicons name={iconName as any} size={16} color={colors.primary} />
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
          {mapLoading && (
            <View style={styles.mapLoadingOverlay}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          )}
          {mapRegion ? (
            <View style={styles.mapWrapper}>
              <MapView
                ref={(ref) => { mapRef.current = ref; }}
                provider={PROVIDER_GOOGLE}
                style={styles.map}
                initialRegion={mapRegion || DEFAULT_LOCATION}
                serviceArea={isServiceArea && mapRegion ? {
                  center: { latitude: mapRegion.latitude, longitude: mapRegion.longitude },
                  radius: serviceAreaRadiusKm * 1000,
                } : undefined}
                onPanDrag={() => {
                  setIsMapInteracting(true);
                  setShowEdgeLoader(true);
                }}
                // onLongPress={() => setIsMapInteracting(true)}
                // onPress={() => setIsMapInteracting(false)}
                onRegionChangeComplete={(region: Region) => {
                  if (!regionsAreClose(mapRegion, region)) { // Only update if new region differs meaningfully
                    console.log('Map region changed:', region.latitude, region.longitude);
                    setMapRegion(region);
                    scheduleCenterLocationUpdate(region);
                  }
                  setIsMapInteracting(false);
                }}
                onMapReady={() => setMapLoading(false)}
                showsUserLocation={true}
                showsMyLocationButton={false}
              />
              <EdgeLoader visible={showEdgeLoader} />
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
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => setShowLocationSearchOverlay(true)}
                style={styles.mapInputOverlay}
                accessibilityLabel="Enter location name"
              >
                <TextInput
                  placeholder="Search by location name.."
                  placeholderTextColor={colors.primary}
                  editable={false}
                  pointerEvents="none"
                  style={styles.mapInput}
                />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={[styles.map, styles.mapPlaceholder]}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          )}
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
            <Ionicons name="locate" size={18} color={colors.white} />
            <Text style={styles.mapButtonText}>PICK MY CURRENT LOCATION</Text>
          </TouchableOpacity>
        </View>
      )}
      <Modal
        visible={showLocationSearchOverlay}
        animationType="slide"
        transparent
        statusBarTranslucent
        onRequestClose={() => setShowLocationSearchOverlay(false)}
      >
        <View style={styles.overlay}>
          <Header title={'Search Location'} showBackButton={true} showNotification={false}
                  keepTitleCenterAligned={false} onBackPress={() => setShowLocationSearchOverlay(false)} />
          <View id="location-search-input" style={styles.overlayContent}>
            <View style={styles.inputWrap}>
              <TextInput
                style={[styles.input, { maxHeight: 60 }]} // Adjust maxHeight to fit 2 lines
                placeholder={locating ? 'Fetching current location...' : placeholder} // Show fetching message
                placeholderTextColor={colors.grey}
                value={query}
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
              {/* {query.length == 0 && !locating && (
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
                  <Ionicons name="close-circle" size={21} color={colors.grey} />
                </TouchableOpacity>
              )}
              {locating && (
                <ActivityIndicator style={styles.rightAdornment} size="small" />
              )}
            </View>
            {query.trim() === '' && savedLocations.length > 0 && (
              <View style={styles.suggestionsContainer}>
                {savedLocations.map((item) => renderLocationOption(item, false, 'time-outline'))}
              </View>
            )}
            {query.trim() !== '' && suggestions.length > 0 && (
              <View style={styles.suggestionsContainer}>
                {suggestions.map((item) => renderLocationOption(item, false, 'location-outline'))}
              </View>
            )}
          </View>
        </View>
      </Modal>
      <ErrorBanner error={locationError} />
    </View>
  );
};

const styles = StyleSheet.create({
  inputWrap: {
    position: 'relative',
  },
  input: {
    borderWidth: 1,
    borderColor: colors.greyLight,
    // borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    color: colors.dark,
    backgroundColor: colors.white,
    paddingRight: sizes.inputRightPadding,
    fontSize: 16,
    fontWeight: '600',
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
    borderColor: colors.greyLight,
    // borderRadius: radius.sm,
    overflow: 'hidden',
    backgroundColor: colors.white,
  },
  iconWrap: {
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  suggestion: {
    flex: 1,
    color: colors.dark,
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 20,
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.greyLight,
    minHeight: 56,
  },
  mapContainer: {
    width: '100%',
    backgroundColor: colors.greyLight,
    borderRadius: radius.md,
    overflow: 'hidden',
    // marginBottom: spacing.sm,
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
    ...StyleSheet.absoluteFillObject,
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
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.85)',
    zIndex: 1,
  },
  mapInputOverlay: {
    position: 'absolute',
    top: spacing.sm,
    alignSelf: 'center',
    width: '78%',
    zIndex: 3,
  },
  mapInput: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.primary,
    fontSize: 14,
    opacity: 0.95,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  mapButton: {
    position: 'absolute',
    bottom: spacing.md,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: colors.white,
    paddingHorizontal: 50,
    paddingVertical: spacing.md,
    minHeight: 52,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.28,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
  },
  mapButtonDisabled: {
    backgroundColor: colors.grey,
    opacity: 0.85,
  },
  mapButtonText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '700',
    marginLeft: spacing.xs,
    letterSpacing: 0.3,
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
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-start',
  },
  overlayBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  overlayContent: {
    position: 'relative',
    zIndex: 1,
    width: '100%',
    flex: 1,
    backgroundColor: colors.white,
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
  },
});

export default LocationSearch;
