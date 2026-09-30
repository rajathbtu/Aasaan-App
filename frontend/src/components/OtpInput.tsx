import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';

import { sendOtp } from '../api';
import { useI18n } from '../i18n';
import { useToast } from '../contexts/ToastContext';
import { colors, radius, spacing } from '../theme';

/** Number of digits in the code (kept in sync with `common.invalidOtpDesc`). */
const OTP_LENGTH = 4;
/** Seconds the resend link stays disabled after an OTP is sent. */
const RESEND_SECONDS = 30;
/** How long the "auto-reading SMS" hint stays visible. */
const AUTO_READ_HINT_MS = 2500;

export type OtpInputProps = {
  /** Phone number the OTP was sent to — used when resending. */
  phone: string;
  /** Locale override so the hints match the screen's language. */
  language?: string;
  /** Receives the joined code (e.g. `'1234'`) whenever it changes. */
  onOtpChange: (otp: string) => void;
  /** Disables the resend link while the parent screen is busy. */
  loading?: boolean;
};

/**
 * Shared 4-digit OTP entry used by the OTP verification and name+OTP
 * registration screens.
 *
 * It owns the digit state, focus handling, resend countdown and the resend
 * request itself so both screens stay visually and behaviourally identical.
 * The verify CTA intentionally stays with the parent screen — the code is
 * surfaced through `onOtpChange`.
 */
const OtpInput: React.FC<OtpInputProps> = ({ phone, language, onOtpChange, loading = false }) => {
  const { t } = useI18n(language);
  const { showToast } = useToast();
  const [digits, setDigits] = useState<string[]>(() => Array(OTP_LENGTH).fill(''));
  const [seconds, setSeconds] = useState(RESEND_SECONDS);
  const [showAutoRead, setShowAutoRead] = useState(true);
  const [resending, setResending] = useState(false);
  const inputsRef = useRef<Array<TextInput | null>>([]);

  /** Store the digits locally and hand the joined code up to the screen. */
  const applyDigits = (next: string[]) => {
    setDigits(next);
    onOtpChange(next.join(''));
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

  const focusNext = (index: number) => {
    if (index < OTP_LENGTH - 1) inputsRef.current[index + 1]?.focus();
  };

  const focusPrev = (index: number) => {
    if (index > 0) inputsRef.current[index - 1]?.focus();
  };

  const onChangeDigit = (text: string, index: number) => {
    const sanitized = text.replace(/\D/g, '').slice(0, 1);
    const next = [...digits];
    next[index] = sanitized;
    applyDigits(next);
    if (sanitized) focusNext(index);
  };

  const onKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !digits[index]) focusPrev(index);
  };

  const handleResend = async () => {
    try {
      setResending(true);
      await sendOtp(phone);
      applyDigits(Array(OTP_LENGTH).fill(''));
      inputsRef.current[0]?.focus();
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
    <>
      {/* 4 boxed inputs */}
      <View style={styles.otpRow}>
        {Array.from({ length: OTP_LENGTH }, (_, i) => (
          <TextInput
            key={i}
            ref={(el) => {
              inputsRef.current[i] = el;
            }}
            keyboardType="number-pad"
            maxLength={1}
            value={digits[i]}
            onChangeText={(text) => onChangeDigit(text, i)}
            onKeyPress={(e) => onKeyPress(e, i)}
            style={styles.otpBox}
            returnKeyType="next"
          />
        ))}
      </View>

      {/* Auto-read indicator */}
      {showAutoRead && (
        <View style={styles.autoReadRow}>
          <Icon name="mobile" size={14} color={colors.primary} style={{ marginRight: 6 }} />
          <Text style={styles.autoReadText}>{t('otp.autoRead')}</Text>
        </View>
      )}

      {/* Resend */}
      <View style={styles.resendBlock}>
        <Text style={styles.resendHint}>
          {t('otp.didntReceive')} {timerText ? <Text style={styles.resendTimer}>{timerText}</Text> : null}
        </Text>
        <TouchableOpacity onPress={handleResend} disabled={resendDisabled}>
          <Text style={[styles.resendLink, resendDisabled && styles.resendLinkDisabled]}>
            {t('common.resendOtp')}
          </Text>
        </TouchableOpacity>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.xl + spacing.sm,
    marginBottom: spacing.lg,
  },
  otpBox: {
    width: 56,
    height: 56,
    marginHorizontal: spacing.xs + 2,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '700',
    color: colors.dark,
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.greyBorder,
    borderRadius: radius.lg,
  },
  autoReadRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  autoReadText: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '500',
  },
  resendBlock: {
    alignItems: 'center',
    marginBottom: spacing.xl,
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
    marginTop: spacing.xs,
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
  resendLinkDisabled: {
    opacity: 0.5,
  },
});

export default OtpInput;