import React, { useEffect, useState } from 'react';
import { View, TextInput, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import * as Location from 'expo-location';
import { colors, spacing, radius, sizes } from '../theme';

const GOOGLE_PLACES_API_KEY = 'AIzaSyA38lonSYxTC6Ro6sBQB11Gg7IragTG2XU'; // Replace with your API key

type Props = {
  onSelect: (location: any) => void;
  initialValue?: string;
  placeholder?: string;
};

const LocationSearch: React.FC<Props> = ({ onSelect, initialValue = '', placeholder = 'Select location' }) => {
  const [query, setQuery] = useState(initialValue);
  const [suggestions, setSuggestions] = useState<Array<{ place_id: string; description: string }>>([]);
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    setQuery(initialValue || '');
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
      setSuggestions(filteredSuggestions as Array<{ place_id: string; description: string }>);
    } catch (error) {
      console.error('Error fetching suggestions:', error);
    }
  };

  const removeStateAndCountry = (place: { terms: { value: string }[]; description: string }) => {
    const terms = place.terms || [];
    if (terms.length > 2) {
      // Exclude the last two terms (state and country)
      return terms.slice(0, -2).map((term: { value: string }) => term.value).join(', ');
    }
    return place.description; // Fallback to the full description if terms are insufficient
  }; 

  const handleSelect = async (place: any) => {
    const cleanedPlaceName = removeStateAndCountry(place);
    setQuery(cleanedPlaceName); // @todo: cleanedPlaceName is still getting overriden by onChangeText call
    setSuggestions([]);

    const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.place_id}&key=${GOOGLE_PLACES_API_KEY}`;
    try {
      const response = await axios.get(detailsUrl);
      const { lat, lng } = response.data.result.geometry.location;
      onSelect({ ...place, lat, lng });
    } catch (error) {
      console.error('Error fetching place details:', error);
      onSelect(place); // Fallback to place without lat/lng
    }
  };

  const detectLocation = async () => {
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
      setQuery(displayName);
      onSelect({ lat: pos.coords.latitude, lng: pos.coords.longitude, description: displayName });
    } catch (error) {
      console.error('Error detecting location:', error);
    } finally {
      setLocating(false);
    }
  };

  const shown = suggestions.slice(0, 5);

  return (
    <View>
      
      <View style={styles.inputWrap}>
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor={colors.grey}
          value={query}
          onChangeText={(text) => {
            setQuery(text);
            fetchSuggestions(text);
          }}
        />
        <TouchableOpacity
          onPress={detectLocation}
          style={styles.rightAdornment}
          accessibilityLabel="Detect current location"
        >
          <Ionicons name="locate-outline" size={21} color={colors.dark} />
        </TouchableOpacity>
      </View>
      {shown.length > 0 && (
        <View style={styles.suggestionsContainer}>
          {shown.map((item) => (
            <TouchableOpacity key={item.place_id} onPress={() => handleSelect(item)}>
              <Text style={styles.suggestion}>{item.description}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
      {locating && (
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm }}>
          <ActivityIndicator size="small" />
          <Text style={{ marginLeft: spacing.sm, color: colors.grey }}>Fetching current location...</Text>
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
    marginBottom: spacing.sm,
    color: colors.dark,
    backgroundColor: colors.white,
    paddingRight: sizes.inputRightPadding,
  },
  rightAdornment: {
    position: 'absolute',
    right: spacing.sm,
    top: spacing.sm,
  },
  suggestionsContainer: {
    borderWidth: 1,
    borderColor: colors.greyLight,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.white,
  },
  suggestion: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.greyLight,
    color: colors.dark,
  },
});

export default LocationSearch;
