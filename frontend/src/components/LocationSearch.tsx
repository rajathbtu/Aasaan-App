import React, { useEffect, useState } from 'react';
import { View, TextInput, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, MapPressEvent, MarkerDragStartEndEvent, Region } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, spacing, radius, sizes } from '../theme';

const GOOGLE_PLACES_API_KEY = 'AIzaSyC4n8PRgWHs34mn7Iyw8nkkU6aXMyJFj9g'; // Replace with your API key
const MAX_SAVED_LOCATIONS = 3;

type Location = {
  place_id: string;
  description: string;
  lat?: number;
  lng?: number;
};

type Props = {
  onSelect: (location: any) => void;
  initialValue?: string;
  placeholder?: string;
  enableMap?: boolean;
  initialLocation?: { lat?: number; lng?: number; description?: string; name?: string; place_id?: string; placeId?: string };
  mapHeight?: number;
};

const LocationSearch: React.FC<Props> = ({
  onSelect,
  initialValue = '',
  placeholder = 'Select location',
  enableMap = false,
  initialLocation,
  mapHeight,
}) => {
  const [query, setQuery] = useState(initialValue);
  const [suggestions, setSuggestions] = useState<Array<{ place_id: string; description: string }>>([]);
  const [savedLocations, setSavedLocations] = useState<Array<{ place_id: string; description: string }>>([]);
  const [locating, setLocating] = useState(false);
  const [cachedLocation, setCachedLocation] = useState<any>(null); // Cache for current location
  const [mapRegion, setMapRegion] = useState<Region | null>(
    initialLocation?.lat && initialLocation?.lng
      ? {
          latitude: initialLocation.lat,
          longitude: initialLocation.lng,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }
      : null
  );
  const [mapLoading, setMapLoading] = useState(enableMap);

  useEffect(() => {
    setQuery(initialValue || '');
    (async () => {
      const locations = await getSavedLocations();
      setSavedLocations(locations);
    })();
  }, [initialValue]);

  useEffect(() => {
    if (!enableMap) {
      return;
    }

    if (initialLocation?.lat && initialLocation?.lng) {
      setMapRegion({
        latitude: initialLocation.lat,
        longitude: initialLocation.lng,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
      setMapLoading(false);
      return;
    }

    if (!mapRegion) {
      centerMapOnCurrentLocation();
    }
  }, [enableMap, initialLocation]);

  const fetchSuggestions = async (text: string) => {
    if (!text) {
      setSuggestions([]);
      return;
    }

    const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(text)}&components=country:in&key=${GOOGLE_PLACES_API_KEY}`;
    try {
      const response = await axios.get(url);
      const filteredSuggestions = response.data.predictions.filter((prediction: any) => {
        const types = prediction.types || [];
        // Exclude suggestions that are cities, states, or countries
        return !types.includes('locality') && !types.includes('administrative_area_level_1') && !types.includes('country');
      });
      const processedSuggestions = filteredSuggestions.map((suggestion: { terms: { value: string }[]; description: string }) => ({
        ...suggestion,
        description: removeStateAndCountry(suggestion),
      }));
      setSuggestions(processedSuggestions as Array<{ place_id: string; description: string }>);
    } catch (error) {
      console.error('Error fetching suggestions:', error);
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
      return detectLocation();
    }

    const cleanedPlaceName = removeStateAndCountry(place);
    setQuery(cleanedPlaceName); 
    setSuggestions([]);

    if (!place.place_id) {
      onSelect({ ...place, description: cleanedPlaceName });
      return;
    }

    const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.place_id}&key=${GOOGLE_PLACES_API_KEY}`;
    try {
      const response = await axios.get(detailsUrl);
      const location = response.data?.result?.geometry?.location;
      if (!location) {
        throw new Error('Place details missing geometry');
      }
      const { lat, lng } = location;
      place.description = cleanedPlaceName;
      const selectedLocation = { ...place, lat, lng };
      onSelect(selectedLocation);
      await saveLocation(selectedLocation);
      setSavedLocations(await getSavedLocations());
    } catch (error) {
      console.error('Error fetching place details:', error);
      onSelect({ ...place, description: cleanedPlaceName });
    }
  };

  const detectLocation = async () => {
    if (cachedLocation) {
      onSelect(cachedLocation);
      setQuery(cachedLocation.description);
      return;
    }
    console.log('Detecting current location...');
    try {
      setLocating(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      let displayName = '';
      try {
        const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${pos.coords.latitude},${pos.coords.longitude}&key=${GOOGLE_PLACES_API_KEY}`;
        const response = await axios.get(geocodeUrl);
        if (response.data.results && response.data.results.length > 0) {
          const comps = response.data.results[0].address_components;
          displayName = comps.length >= 3
            ? comps[0].long_name + ', ' + comps[1].long_name + ', ' + comps[2].long_name
            : response.data.results[0].formatted_address || '';
        }
      } catch (error) {
        console.error('Error fetching location name from Google Maps API:', error);
      }
      const detectedLocation = { lat: pos.coords.latitude, lng: pos.coords.longitude, description: displayName };
      setCachedLocation(detectedLocation); // Cache the detected location
      setQuery(displayName);
      setMapRegion({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
      onSelect(detectedLocation);
    } catch (error: any) {
      const message = error?.message || String(error);
      const isExpectedFailure = message.includes('unsatisfied device settings')
        || message.includes('Location request failed')
        || message.includes('LOCATION_SERVICES_DISABLED')
        || message.includes('permissions');
      if (!isExpectedFailure) {
        console.error('Error detecting location:', error);
      }
    } finally {
      setLocating(false);
    }
  };

  const centerMapOnCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setMapRegion({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    } catch (error) {
      console.error('Error centering map on current location:', error);
    }
  };

  const onMarkerDragEnd = (event: MarkerDragStartEndEvent) => {
    const { coordinate } = event.nativeEvent;
    const selectedLocation = {
      lat: coordinate.latitude,
      lng: coordinate.longitude,
      description: 'Selected location',
    };
    setQuery(selectedLocation.description);
    setMapRegion({
      latitude: coordinate.latitude,
      longitude: coordinate.longitude,
      latitudeDelta: mapRegion?.latitudeDelta ?? 0.01,
      longitudeDelta: mapRegion?.longitudeDelta ?? 0.01,
    });
    onSelect(selectedLocation);
  };

  const saveLocation = async (location: Location) => {
    try {
      const savedLocations: Location[] = JSON.parse((await AsyncStorage.getItem('savedLocations')) || '[]');
      const updatedLocations = [location, ...savedLocations.filter((loc) => loc.place_id !== location.place_id)].slice(0, MAX_SAVED_LOCATIONS);
      await AsyncStorage.setItem('savedLocations', JSON.stringify(updatedLocations));
    } catch (error) {
      console.error('Error saving location:', error);
    }
  };

  const getSavedLocations = async (): Promise<Location[]> => {
    try {
      return JSON.parse((await AsyncStorage.getItem('savedLocations')) || '[]');
    } catch (error) {
      console.error('Error retrieving saved locations:', error);
      return [];
    }
  };

  const shown = suggestions.slice(0, 5);

  const capitalizeWords = (text: string) => {
    return text.replace(/\b\w+/g, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
  };

  const renderLocationOption = (item: { place_id: string; description: string }, isCurrentLocation = false, tag?: string) => (
    <TouchableOpacity
      key={item.place_id}
      onPress={() => (isCurrentLocation ? detectLocation() : handleSelect(item))}
    >
      <View style={styles.suggestionRow}>
        {tag && <Text style={styles.tag}>{tag}</Text>}
        <Text style={styles.suggestion}>{item.description}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View>
      
      <View style={styles.inputWrap}>
        <TextInput
          style={[styles.input, { maxHeight: 60 }]} // Adjust maxHeight to fit 2 lines
          placeholder={locating ? 'Fetching current location...' : placeholder} // Show fetching message
          placeholderTextColor={colors.grey}
          value={query}
          multiline={true} // Enable multiline to allow wrapping
          numberOfLines={2} // Limit to 2 lines
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
        {query.length == 0 && !locating && (
          <TouchableOpacity
          onPress={detectLocation}
          style={styles.rightAdornment}
          accessibilityLabel="Detect current location"
        >
          <Ionicons name="locate-outline" size={21} color={colors.dark} />
        </TouchableOpacity>
        )}
        {query.length > 0 && (
          <TouchableOpacity
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
      {enableMap && (
        <View style={[styles.mapContainer, { height: mapHeight ?? 250 }]}>            
          {mapLoading && (
            <View style={styles.mapLoadingOverlay}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          )}
          {mapRegion ? (
            <MapView
              provider={PROVIDER_GOOGLE}
              style={styles.map}
              region={mapRegion}
              onRegionChangeComplete={(region: Region) => setMapRegion(region)}
              onMapReady={() => setMapLoading(false)}
              showsUserLocation={true}
            >
              <Marker
                coordinate={{ latitude: mapRegion.latitude, longitude: mapRegion.longitude }}
                draggable
                onDragEnd={onMarkerDragEnd}
              />
            </MapView>
          ) : (
            <View style={[styles.map, styles.mapPlaceholder]}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          )}
          <TouchableOpacity style={styles.mapButton} onPress={centerMapOnCurrentLocation}>
            <Ionicons name="locate" size={20} color={colors.white} />
          </TouchableOpacity>
        </View>
      )}
      {query.trim() === '' && savedLocations.length > 0 && (
        <View style={styles.suggestionsContainer}>
          {renderLocationOption({ place_id: 'current_location', description: cachedLocation ? cachedLocation.description : 'Use current location' }, true, 'CURRENT')}
          {savedLocations.map((item) => renderLocationOption(item, false, 'RECENT'))}
        </View>
      )}
      {query.trim() !== '' && suggestions.length > 0 && (
        <View style={styles.suggestionsContainer}>
          {renderLocationOption({ place_id: 'current_location', description: cachedLocation ? cachedLocation.description : 'Use current location' }, true, 'CURRENT')}
          {suggestions.map((item) => renderLocationOption(item, false, 'SEARCHED'))}
        </View>
      )}
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
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    color: colors.dark,
    backgroundColor: colors.white,
    paddingRight: sizes.inputRightPadding,
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
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.white,
  },
  tag: {
    color: colors.grey,
    fontSize: 9,
    marginRight: spacing.sm, // Add spacing between tag and text
  },
  suggestion: {
    flex: 1, // Ensure text takes up remaining space
    color: colors.dark,
    // fontSize: 14
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.greyLight,
  },
  mapContainer: {
    width: '100%',
    backgroundColor: colors.greyLight,
    borderRadius: radius.md,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  map: {
    flex: 1,
  },
  mapLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.85)',
    zIndex: 1,
  },
  mapButton: {
    position: 'absolute',
    right: spacing.md,
    bottom: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: 999,
    padding: spacing.sm,
    elevation: 3,
  },
  mapPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default LocationSearch;
