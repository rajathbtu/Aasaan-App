import React, { useEffect, useState } from 'react';
import { View, TextInput, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, spacing, radius, sizes } from '../theme';

const GOOGLE_PLACES_API_KEY = 'AIzaSyA38lonSYxTC6Ro6sBQB11Gg7IragTG2XU'; // Replace with your API key
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
};

const LocationSearch: React.FC<Props> = ({ onSelect, initialValue = '', placeholder = 'Select location' }) => {
  const [query, setQuery] = useState(initialValue);
  const [suggestions, setSuggestions] = useState<Array<{ place_id: string; description: string }>>([]);
  const [savedLocations, setSavedLocations] = useState<Array<{ place_id: string; description: string }>>([]);
  const [locating, setLocating] = useState(false);
  const [cachedLocation, setCachedLocation] = useState<any>(null); // Cache for current location

  useEffect(() => {
    setQuery(initialValue || '');
    (async () => {
      const locations = await getSavedLocations();
      setSavedLocations(locations);
    })();

    if (cachedLocation==null) detectLocation(); // Call detectLocation on component load to cache current location
  }, [initialValue]);

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
    const cleanedPlaceName = removeStateAndCountry(place);
    setQuery(cleanedPlaceName); 
    setSuggestions([]);

    const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.place_id}&key=${GOOGLE_PLACES_API_KEY}`;
    try {
      const response = await axios.get(detailsUrl);
      const { lat, lng } = response.data.result.geometry.location;
      // place.name = cleanedPlaceName;
      place.description = cleanedPlaceName;
      const selectedLocation = { ...place, lat, lng };
      onSelect(selectedLocation);
      await saveLocation(selectedLocation);
      setSavedLocations(await getSavedLocations());
    } catch (error) {
      console.error('Error fetching place details:', error);
      onSelect(place); // Fallback to place without lat/lng
    }
  };

  const detectLocation = async () => {
    if (cachedLocation) {
      onSelect(cachedLocation);
      setQuery(cachedLocation.description);
      return;
    }

    try {
      setLocating(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocating(false);
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
      onSelect(detectedLocation);
    } catch (error) {
      console.error('Error detecting location:', error);
    } finally {
      setLocating(false);
    }
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
            onPress={() => setQuery('')} // Clear the input field
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
});

export default LocationSearch;
