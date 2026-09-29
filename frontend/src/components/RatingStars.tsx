import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface RatingStarsProps {
  stars: number;
  onSelect: (stars: number) => void;
  starColor: string;
  unselectedStarColor: string;
  starSize: number;
  buttonHeight: number;
  gap?: number;
}

const RatingStars: React.FC<RatingStarsProps> = ({
  stars,
  onSelect,
  starColor,
  unselectedStarColor,
  starSize,
  buttonHeight,
  gap = 0,
}) => (
  <View style={[styles.row, { gap }]}>
    {[1, 2, 3, 4, 5].map((value) => (
      <TouchableOpacity
        key={value}
        onPress={() => onSelect(value)}
        style={[styles.starButton, { height: buttonHeight }]}
        accessibilityRole="button"
        accessibilityLabel={`${value} / 5`}
        accessibilityState={{ selected: stars === value }}
      >
        <Ionicons
          name={value <= stars ? 'star' : 'star-outline'}
          size={starSize}
          color={value <= stars ? starColor : unselectedStarColor}
        />
      </TouchableOpacity>
    ))}
  </View>
);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  starButton: {
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default RatingStars;