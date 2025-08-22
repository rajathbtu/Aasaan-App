import React, { useEffect, useState } from 'react';
import { View, TextInput, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { colors } from '../theme';

const GOOGLE_PLACES_API_KEY = 'AIzaSyA38lonSYxTC6Ro6sBQB11Gg7IragTG2XU'; // Replace with your API key

type Props = {
  onSelect: (location: any) => void;
  initialValue?: string;
  placeholder?: string;
  rightActionIcon?: keyof typeof Ionicons.glyphMap;
  onPressRightAction?: () => void;
  rightActionDisabled?: boolean;
  rightActionLoading?: boolean;
};

const LocationSearch: React.FC<Props> = ({ onSelect, initialValue = '', placeholder = 'Search for a location', rightActionIcon, onPressRightAction, rightActionDisabled, rightActionLoading }) => {
  const [query, setQuery] = useState(initialValue);
  const [suggestions, setSuggestions] = useState<Array<{ place_id: string; description: string }>>([]);

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

  const shown = suggestions.slice(0, 5);

  return (
    <View style={styles.container}>
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
        {rightActionLoading ? (
          <ActivityIndicator size="small" color={colors.grey} style={styles.rightAdornment} />
        ) : rightActionIcon && onPressRightAction ? (
          <TouchableOpacity
            onPress={onPressRightAction}
            disabled={rightActionDisabled}
            style={[styles.rightAdornment, rightActionDisabled && { opacity: 0.5 }]}
            accessibilityLabel="Detect current location"
          >
            <Ionicons name={rightActionIcon} size={18} color={colors.dark} />
          </TouchableOpacity>
        ) : null}
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
    margin: 10,
  },
  inputWrap: {
    position: 'relative',
  },
  input: {
    borderWidth: 1,
    borderColor: colors.greyLight,
    borderRadius: 5,
    padding: 10,
    marginBottom: 10,
    color: colors.dark,
    backgroundColor: '#fff',
    paddingRight: 36,
  },
  rightAdornment: {
    position: 'absolute',
    right: 10,
    top: 10,
  },
  suggestionsContainer: {
    borderWidth: 1,
    borderColor: colors.greyLight,
    borderRadius: 5,
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  suggestion: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.greyLight,
    color: colors.dark,
  },
});

export default LocationSearch;
