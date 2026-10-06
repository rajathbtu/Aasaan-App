import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { sendOtp } from '../api';
import { useI18n } from '../i18n';
import { useToast } from '../contexts/ToastContext';
import { colors, radius, spacing } from '../theme';

/** Default code length. Aadhaar OTP is 6 digits, so callers can override. */
const OTP_LENGTH = 4;
/** Seconds the resend link stays disabled after an OTP is sent. */
const RESEND_SECONDS = 30;
/** How long the "auto-reading SMS" hint stays visible. */
const AUTO_READ_HINT_MS = 2500;
const FIELD_HEIGHT = 52;
const FIELD_WIDTH = 232;
const CARET_BLINK_MS = 500;/** Cadence of the blinking caret drawn in the slot awaiting the next digit. */
const BULLET = '\u2022';/** Placeholder glyph for every slot that has not been typed into yet. */


export type OtpInputProps = {
  /** Phone number the OTP was sent to — used when resending. */
  phone: string;
  /** Locale override so the hints match the screen's language. */
  language?: string;
  /** Receives the joined code (e.g. `'1234'`) whenever it changes. */
  onOtpChange: (otp: string) => void;
  /** Disables the resend link while the parent screen is busy. */
  loading?: boolean;
  /** Defaults to 4; Aadhaar OTP has 6. */
  length?: number;
  
  onResend?: () => Promise<void> | void;
};

/**
 * Shared OTP entry used by the Aadhaar verification, name+OTP registration &
 * Aadhaar verification screens.
 *
 * A single `TextInput` collects the code, but the digits you see are drawn by
 * an overlay of `length` slots laid over it.
 *
 * The input's own text is transparent (`color: 'transparent'`) and it is the
 * overlay that renders each digit or its bullet placeholder, so a typed digit
 * replaces exactly one bullet and the remaining bullets stay put.
 *
 * It owns the code state, resend countdown and the resend request itself so
 * the screens stay visually and behaviourally identical. The verify CTA
 * intentionally stays with the parent screen — the code is surfaced through
 * `onOtpChange`. `length` defaults to 4 (sign-in) and is raised to 6 for
 * Aadhaar; `onResend` overrides the default phone-based resend.
 */
const OtpInput: React.FC<OtpInputProps> = ({
  phone, language, onOtpChange, loading = false,
  length = OTP_LENGTH, onResend,
}) => {
  const { t } = useI18n(language);
  const { showToast } = useToast();
  const [otp, setOtp] = useState('');
  const [focused, setFocused] = useState(false);
  const [seconds, setSeconds] = useState(RESEND_SECONDS);
  const [showAutoRead, setShowAutoRead] = useState(true);
  const [resending, setResending] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const caretOpacity = useRef(new Animated.Value(1)).current;

  /** Store the code locally and hand it up to the screen. */
  const applyOtp = (next: string) => {
    setOtp(next);
    onOtpChange(next);
  };

  useEffect(() => {
    const timer = setTimeout(() => setShowAutoRead(false), AUTO_READ_HINT_MS);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (seconds <= 0) return;
    const id = setInterval(() => setSeconds((s) => s - 1), 1000);
    return () => clearInterval(id);
  }, [seconds]);

  /** Blink the caret only while the field holds focus. */
  useEffect(() => {
    if (!focused) {
      caretOpacity.setValue(1);
      return;
    }
    const blink = Animated.loop(
      Animated.sequence([
        Animated.timing(caretOpacity, { toValue: 0, duration: CARET_BLINK_MS, useNativeDriver: true }),
        Animated.timing(caretOpacity, { toValue: 1, duration: CARET_BLINK_MS, useNativeDriver: true }),
      ]),
    );
    blink.start();
    return () => blink.stop();
  }, [focused, caretOpacity]);

  /** Keep only digits, capped at the code length (pastes can be longer). */
  const onChangeOtp = (text: string) => {
    applyOtp(text.replace(/\D/g, '').slice(0, length));
  };

  const handleResend = async () => {
    try {
      setResending(true);
      if (onResend) {
        await onResend();
      } else {
        await sendOtp(phone);
      }
      applyOtp('');
      inputRef.current?.focus();
      setSeconds(RESEND_SECONDS);
      showToast(t('common.otpSentDesc'));
    } catch (err: any) {
      showToast(err.message || t('common.invalidOtp'));
    } finally {
      setResending(false);
    }
  };

  const timerText = seconds > 0 ? `00:${String(seconds).padStart(2, '0')}` : '';
  const resendDisabled = seconds > 0 || loading || resending;

  return (
    <View style={styles.otpField}>
      {/* One field, one TextInput — the slots below draw what it contains. */}
      <View style={styles.otpBox}>
        {/*
          The input is a keystroke catcher only, so this layer is fully
          transparent. Hiding it with the layer's opacity (rather than a
          transparent text colour) is what actually works reliably on Android,
          where the native EditText keeps drawing its own glyphs.
        */}
        <View style={styles.otpInputLayer} pointerEvents="box-none">
          <TextInput
            ref={inputRef}
            style={styles.otpInput}
            value={otp}
            onChangeText={onChangeOtp}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            keyboardType="number-pad"
            maxLength={length}
            returnKeyType="done"
            textContentType="oneTimeCode"
            autoComplete="sms-otp"
            selectionColor="transparent"
            caretHidden
            accessibilityLabel={t('otp.title')}
          />
        </View>

        {/* Spaced slots: a digit once typed, a bullet until then. */}
        <View style={styles.otpSlots} pointerEvents="none">
          {Array.from({ length }, (_, i) => {
            const digit = otp[i];
            const isActive = focused && i === otp.length;
            return (
              <View key={i} style={styles.otpSlot}>
                {digit ? (
                  <Text style={styles.otpDigit}>{digit}</Text>
                ) : (
                  <Text style={styles.otpBullet}>{BULLET}</Text>
                )}
                {isActive && <Animated.View style={[styles.otpCaret, { opacity: caretOpacity }]} />}
              </View>
            );
          })}
        </View>
      </View>

      {/* Auto-read indicator */}
      {showAutoRead && (
        <View style={styles.autoReadRow}>
          <Ionicons name="phone-portrait-outline" size={14} color={colors.primary} style={styles.autoReadIcon} />
          <Text style={styles.autoReadText}>{t('otp.autoRead')}</Text>
        </View>
      )}

      {/* Resend */}
      <View style={styles.resendBlock}>
        <Text style={styles.resendHint}>
          {t('otp.didntReceive')}{' '}{timerText ? <Text style={styles.resendTimer}>{timerText}</Text> : null}
        </Text>
        <TouchableOpacity onPress={handleResend} disabled={resendDisabled}>
          <Text style={[styles.resendLink, resendDisabled && styles.resendLinkDisabled]}>
            {t('common.resendOtp')}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  otpField: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 260,
    paddingVertical: spacing.lg,
    paddingHorizontal: 0,
  },
  otpBox: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: FIELD_WIDTH,
    height: FIELD_HEIGHT,
    justifyContent: 'center',
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.greyBorder,
    borderRadius: radius.md,
  },
  /**
   * Fades the whole native input out. Doing it on a wrapper `View` instead of
   * `color: 'transparent'` on the input itself, because Android's EditText can
   * keep rendering its glyphs over our drawn slots.
   */
  otpInputLayer: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0,
  },
  /** Kept measurable so the caret/selection maths still line up. */
  otpInput: {
    flex: 1,
    color: 'transparent',
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '700',
    paddingVertical: 0,
  },
  /** Row of `OTP_LENGTH` equal cells — this is the digit spacing. */
  otpSlots: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    alignItems: 'center',
  },
  otpSlot: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpDigit: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.dark,
    textAlign: 'center',
    includeFontPadding: false,
  },
  otpBullet: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.greyMuted,
    textAlign: 'center',
    includeFontPadding: false,
  },
  /** Blinking marker for the slot the next digit will land in. */
  otpCaret: {
    position: 'absolute',
    height: 24,
    width: 2,
    borderRadius: 1,
    backgroundColor: colors.dark,
  },
  autoReadRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  autoReadIcon: {
    marginRight: 6,
  },
  autoReadText: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '500',
  },
  resendBlock: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: spacing.md,
  },
  resendHint: {
    fontSize: 13,
    color: colors.grey,
  },
  resendTimer: {
    fontWeight: '600',
    color: colors.dark,
  },
  resendLink: {
    marginLeft: spacing.xs,
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
  resendLinkDisabled: {
    opacity: 0.5,
  },
});

export default OtpInput;