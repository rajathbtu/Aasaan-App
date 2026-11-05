import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, TextInput, TouchableOpacity, View, type TextInputInstance } from 'react-native';

import { sendOtp } from '../api';
import { useI18n } from '../i18n';
import { useToast } from '../contexts/ToastContext';
import { useTheme } from '../contexts/ThemeContext';
import type { BasePalette } from '../theme/palette';

/** Default code length. Aadhaar OTP is 6 digits, so callers can override. */
const OTP_LENGTH = 4;
/** Seconds the resend link stays disabled after an OTP is sent. */
const RESEND_SECONDS = 30;
const CELL_HEIGHT = 50;
/** Max width of one digit cell (.otp input,
 *  scaled to the app's device convention like the sibling screens). */
const CELL_WIDTH = 46;
const CARET_BLINK_MS = 500;/** Cadence of the blinking caret drawn in the slot awaiting the next digit. */

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
  /**
   * Focus the code field as soon as it mounts. Defaults to `true` for screens
   * whose only job is OTP entry; screens with other fields (e.g. name + OTP)
   * should pass `false` so their first field keeps focus.
   */
  autoFocus?: boolean;

  onResend?: () => Promise<void> | void;
};

/**
 * Shared OTP entry used by the sign-in, name+OTP registration & Aadhaar
 * verification screens, restyled to the approved four-cell design.
 *
 * A single `TextInput` collects the code (so auto-advance, backspace
 * navigation and 4-digit paste support come for free, and SMS autofill
 * still works), but the digits you see are drawn by an overlay of `length`
 * separate bordered cells laid over it.
 *
 * The input's own text is transparent (`opacity: 0` wrapper) and it is the
 * overlay that renders each digit, so a typed digit lands in exactly one
 * cell and the remaining cells stay empty like the approved reference.
 *
 * It owns the code state, resend countdown and the resend request itself so
 * the screens stay visually and behaviourally identical. The verify CTA
 * intentionally stays with the parent screen — the code is surfaced through
 * `onOtpChange`. `length` defaults to 4 (sign-in) and is raised to 6 for
 * Aadhaar; `onResend` overrides the default phone-based resend.
 */
const OtpInput: React.FC<OtpInputProps> = ({
  phone, language, onOtpChange, loading = false,
  length = OTP_LENGTH, autoFocus = true, onResend,
}) => {
  const { t } = useI18n(language);
  const { showToast } = useToast();
  const { base: C, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  const [otp, setOtp] = useState('');
  const [focused, setFocused] = useState(false);
  const [seconds, setSeconds] = useState(RESEND_SECONDS);
  const [resending, setResending] = useState(false);
  const inputRef = useRef<TextInputInstance | null>(null);
  const caretOpacity = useRef(new Animated.Value(1)).current;

  /** Store the code locally and hand it up to the screen. */
  const applyOtp = (next: string) => {
    setOtp(next);
    onOtpChange(next);
  };

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
      {/* One field, one TextInput — the cells below draw what it contains. */}

      <TouchableOpacity
        style={[styles.otpBox, length > 4 && styles.otpBoxLong]}
        onPress={() => inputRef.current?.focus()}
        activeOpacity={1}
      >
        {/* Transparent input layer — let TextInput receive touches directly */}
        <View style={styles.otpInputLayer} pointerEvents="auto">
          <TextInput
            ref={inputRef}
            style={styles.otpInput}
            value={otp}
            onChangeText={onChangeOtp}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            keyboardType="number-pad"
            keyboardAppearance={isDark ? 'dark' : 'light'}
            maxLength={length}
            returnKeyType="done"
            textContentType="oneTimeCode"
            autoComplete="sms-otp"
            autoFocus={autoFocus}
            selectionColor="transparent"
            accessibilityLabel={t('otp.title')}
          />
        </View>

        {/* Separate bordered cells: a digit once typed, empty until then. */}
        <View style={[styles.otpSlots, length > 4 && styles.otpSlotsLong]} pointerEvents="none">
          {Array.from({ length }, (_, i) => {
            const digit = otp[i];
            const isActive = focused && i === otp.length;
            return (
              <View key={i} style={[styles.otpSlot, isActive && styles.otpSlotActive]}>
                {digit ? <Text style={styles.otpDigit}>{digit}</Text> : null}
                {isActive && <Animated.View style={[styles.otpCaret, { opacity: caretOpacity }]} />}
              </View>
            );
          })}
        </View>
      </TouchableOpacity>

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

const makeStyles = (C: BasePalette) => StyleSheet.create({
  otpField: {
    alignSelf: 'center',
    width: '100%',
    paddingVertical: 6,
    paddingHorizontal: 0,
  },
  /* .otp{display:flex;justify-content:center;gap:12px;margin:0 auto 14px} */
  otpBox: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 4 * CELL_WIDTH + 3 * 10,
    height: CELL_HEIGHT,
    justifyContent: 'center',
  },
  /* Wider row for 6-digit codes (Aadhaar) so cells keep shrinking evenly. */
  otpBoxLong: {
    maxWidth: 6 * CELL_WIDTH + 5 * 8,
  },
  /**
   * Fades the whole native input out. Doing it on a wrapper `View` instead of
   * `color: 'transparent'` on the input itself, because Android's EditText can
   * keep rendering its glyphs over our drawn cells.
   */
  otpInputLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
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
  /* .otp input{width:54px;height:58px;border:1.5px solid var(--line);border-radius:13px;...} */
  /* .otp input{border:1.5px solid var(--line);border-radius:13px}
     All cells keep the SAME border geometry (uniform 2px) so focus never
     changes their shape or size — only the colour and glow transition. */
  otpSlots: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  otpSlotsLong: {
    gap: 8,
  },
  otpSlot: {
    flex: 1,
    maxWidth: CELL_WIDTH,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.white,
    borderWidth: 2,
    borderColor: C.line,
    borderRadius: 11,
  },
  /* .otp input:focus{border-color:var(--green);box-shadow:0 0 0 3px rgba(7,150,83,.10)}
     Border width stays 2px; only tint + glow change. */
  otpSlotActive: {
    borderColor: C.brand,
    shadowColor: C.brand,
    shadowOpacity: 0.1,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 0 },
  },
  otpDigit: {
    fontSize: 20,
    fontWeight: '700',
    color: C.dark,
    textAlign: 'center',
    includeFontPadding: false,
  },
  /** Blinking marker for the slot the next digit will land in. */
  otpCaret: {
    position: 'absolute',
    height: 20,
    width: 2,
    borderRadius: 1,
    backgroundColor: C.dark,
  },
  /* .resend{text-align:center;color:var(--muted);font-size:14px;line-height:1.5} */
  resendBlock: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  resendHint: {
    fontSize: 12,
    color: C.grey,
  },
  resendTimer: {
    fontWeight: '700',
    color: C.dark,
  },
  /* .resend button{color:var(--green);font-size:15px;font-weight:750;padding:2px 8px} */
  resendLink: {
    marginLeft: 4,
    fontSize: 13,
    color: C.brand,
    fontWeight: '700',
  },
  /* .resend button:disabled{opacity:.45} */
  resendLinkDisabled: {
    opacity: 0.45,
  },
});

export default OtpInput;
