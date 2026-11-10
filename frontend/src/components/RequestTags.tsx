import React from 'react';
import { StyleProp, StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';

/** Tags shown per request card before folding the rest into a +N label. */
export const REQUEST_TAGS_PREVIEW_COUNT = 3;

type RequestTagsProps = {
  /** Request tags — renders nothing when absent or empty. */
  tags?: string[] | null;
  /** Chips visible before the rest fold into a +N label. Defaults to 3. */
  maxVisible?: number;
  /** Row spacing — each surface tunes its own margins. */
  rowStyle?: StyleProp<ViewStyle>;
  /** Chip surface (background/border) — caller-owned token pairing. */
  chipStyle?: StyleProp<ViewStyle>;
  chipTextStyle?: StyleProp<TextStyle>;
  moreTextStyle?: StyleProp<TextStyle>;
};

/**
 * The tag chip row shared by the My Requests cards and the request-detail
 * card: up to `maxVisible` chips, the rest folded into a +N label. Chip
 * colours/fonts come from the caller so each surface keeps its own token
 * pairing while the fold logic lives in exactly one place.
 */
const RequestTags: React.FC<RequestTagsProps> = ({
  tags,
  maxVisible = REQUEST_TAGS_PREVIEW_COUNT,
  rowStyle,
  chipStyle,
  chipTextStyle,
  moreTextStyle,
}) => {
  const list = Array.isArray(tags) ? tags.filter(Boolean) : [];
  if (list.length === 0) return null;
  const visible = list.slice(0, maxVisible);
  const extra = list.length - visible.length;

  return (
    <View style={[styles.row, rowStyle]}>
      {visible.map((tag) => (
        <View key={tag} style={[styles.chip, chipStyle]}>
          <Text style={[styles.chipText, chipTextStyle]} numberOfLines={1}>
            {tag}
          </Text>
        </View>
      ))}
      {extra > 0 && <Text style={[styles.moreText, moreTextStyle]}>+{extra}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
  },
  chip: {
    maxWidth: '100%',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  chipText: {
    fontSize: 11,
    lineHeight: 14,
  },
  moreText: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
  },
});

export default RequestTags;
