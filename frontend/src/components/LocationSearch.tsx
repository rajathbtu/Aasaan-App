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

const LocationSearch: React.FC<Props> = ({ onSelect, initialValue = '', placeholder = 'Search for a location' }) => {
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
      setSuggestions(response.data.predictions as Array<{ place_id: string; description: string }>);
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
        const results = await Location.reverseGeocodeAsync({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        if (results && results.length) {
          const r: any = results[0];
          const parts = [r.name || r.street, r.subregion || r.city || r.district].filter(Boolean);
          displayName = parts.join(', ') || r.formattedAddress || '';
        }
      } catch {}
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
    <View style={styles.container}>
      {locating && (
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm }}>
          <ActivityIndicator size="small" />
          <Text style={{ marginLeft: spacing.sm, color: colors.grey }}>Fetching current location...</Text>
        </View>
      )}
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
          <Ionicons name="locate-outline" size={18} color={colors.dark} />
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    margin: spacing.md,
  },
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
