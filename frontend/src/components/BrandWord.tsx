import React from 'react';
import { Text, type TextProps } from 'react-native';

/**
 * Brand word tokens — sampled from the approved splash artwork:
 * the wordmark's fill green and the closest bundled typeface
 * (Quicksand-Bold shares the wordmark's rounded letterforms).
 * Every screen that shows the brand word uses these exact tokens so the
 * wordmark reads identically across the app.
 */
export const BRAND_WORD = 'aasaanly';
export const BRAND_WORD_COLOR = '#05BD69';
export const BRAND_WORD_FONT = 'Quicksand-Bold';

type BrandWordProps = TextProps & { children?: string };

/**
 * The brand word rendered exactly like the splash wordmark: lowercase
 * "aasaanly" in the splash green and rounded letterforms. Font size,
 * line height and letter spacing are inherited from the surrounding text.
 */
export const BrandWord: React.FC<BrandWordProps> = ({ children = BRAND_WORD, style, ...rest }) => (
  <Text style={[{ color: BRAND_WORD_COLOR, fontFamily: BRAND_WORD_FONT, fontWeight: '700' }, style]} {...rest}>
    {children}
  </Text>
);

type BrandTextProps = TextProps & { children: string | undefined };

/**
 * Renders a sentence and styles every brand-word occurrence ("aasaanly",
 * "Aasaanly" or legacy "Aasaan") with the splash wordmark treatment.
 * Use it anywhere a text string contains the brand word.
 */
export const BrandText: React.FC<BrandTextProps> = ({ children, ...rest }) => {
  const parts = String(children ?? '').split(/(aasaanly|Aasaanly|Aasaan)/g);
  return (
    <Text {...rest}>
      {parts.map((part, i) =>
        /^(aasaanly|Aasaanly|Aasaan)$/i.test(part) ? (
          <BrandWord key={i}>{BRAND_WORD}</BrandWord>
        ) : (
          <React.Fragment key={i}>{part}</React.Fragment>
        ),
      )}
    </Text>
  );
};
