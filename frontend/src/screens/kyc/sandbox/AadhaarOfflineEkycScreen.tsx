import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
// expo-image (not the core Image) is used throughout this app and is required
// here: UIDAI's photo arrives as a large base64 data URI, which the core
// Image fails to decode on Android — it renders as an empty box.
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

import Header from '../../../components/Header';
import OtpInput from '../../../components/OtpInput';
import InfoBanner from '../../../components/InfoBanner';
import FormField from '../../../components/FormField';
import { colors, spacing, radius, shadows } from '../../../theme';
import { useAuth } from '../../../contexts/AuthContext';
import {
  SandboxAadhaarOfflineEkycResult,
  SandboxAadhaarOfflineEkycOtpSession,
  generateSandboxAadhaarOfflineEkycOtp,
  readSandboxAadhaarOfflineEkycError,
  verifySandboxAadhaarOfflineEkycOtp,
} from '../../../api/kyc/sandbox/aadhaarOfflineEkyc';

/**
 * UIDAI returns the portrait as a `data:` URI but sometimes wraps the base64
 * payload across lines. Embedded newlines and spaces are not valid base64 and
 * make the decoder fail silently, producing an empty box. Strip all
 * whitespace from the payload and repair the prefix before handing it to the
 * image component.
 */
function normalizePhotoDataUrl(photo: string): string {
  const match = /^data:(image\/[a-z+]+);base64,([\s\S]*)$/i.exec(photo.trim());
  if (!match) return photo.trim();

  const mimeType = match[1].toLowerCase();
  const payload = match[2].replace(/\s+/g, '');
  return `data:${mimeType};base64,${payload}`;
}

/** Stages the screen moves through during a verification attempt. */
type KycState = 'idle' | 'sending' | 'awaiting_otp' | 'verifying' | 'success' | 'failed';

const AADHAAR_LENGTH = 12;
const OTP_LENGTH = 6;
const RESEND_SECONDS = 60;

/** Human labels for the single-letter gender codes UIDAI returns. */
const GENDER_LABEL: Record<string, string> = {
  M: 'Male',
  F: 'Female',
  T: 'Transgender',
};

/** Joins whichever address fields came back into one readable line. */
function formatAddress(kyc: SandboxAadhaarOfflineEkycResult): string | undefined {
  if (kyc.address) return kyc.address;
  return [kyc.state, kyc.pincode].filter(Boolean).join(' - ') || undefined;
}

/**
 * Aadhaar offline e-KYC over UIDAI, via Sandbox (sandbox.co.in).
 *
 * Flow: enter Aadhaar -> capture UIDAI-mandated consent -> request the OTP
 * (delivered to the Aadhaar-registered mobile) -> submit it -> show the
 * verified e-KYC record.
 *
 * The verified record is deliberately NOT persisted. It lives in component
 * state and is discarded on unmount, so nothing reaches the database.
 */
const SandboxAadhaarOfflineEkycScreen: React.FC = () => {
  const { token } = useAuth();

  const [state, setState] = useState<KycState>('idle');
  const [aadhaar, setAadhaar] = useState('');
  const [consent, setConsent] = useState(false);
  const [otp, setOtp] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<SandboxAadhaarOfflineEkycOtpSession | null>(null);
  const [kyc, setKyc] = useState<SandboxAadhaarOfflineEkycResult | null>(null);

  const reset = useCallback(() => {
    setState('idle');
    setAadhaar('');
    setConsent(false);
    setOtp('');
    setError(null);
    setSession(null);
    setKyc(null);
  }, []);

  const requestOtp = useCallback(
    async (number: string) => {
      const created = await generateSandboxAadhaarOfflineEkycOtp(token as string, number, consent);
      setSession(created);
      setOtp('');
      setState('awaiting_otp');
      return created;
    },
    [token, consent],
  );

  /** Triggers the OTP. Shared by the initial send and the resend link. */
  const handleSend = useCallback(
    async (number: string) => {
      setState('sending');
      setError(null);
      try {
        await requestOtp(number);
      } catch (err) {
        const { message } = readSandboxAadhaarOfflineEkycError(err);
        setState('failed');
        setError(message);
      }
    },
    [requestOtp],
  );

  const handleStart = useCallback(() => {
    const number = aadhaar.replace(/\D/g, '');
    if (number.length !== AADHAAR_LENGTH) {
      setError('Please enter all 12 digits of your Aadhaar number.');
      return;
    }
    if (!consent) {
      setError('Please accept the consent request to continue.');
      return;
    }
    handleSend(number);
  }, [aadhaar, consent, handleSend]);

  const handleVerify = useCallback(async () => {
    if (!session) return;
    if (otp.length !== OTP_LENGTH) {
      setError('Please enter the 6-digit OTP sent to your registered mobile.');
      return;
    }

    setState('verifying');
    setError(null);
    try {
      const result = await verifySandboxAadhaarOfflineEkycOtp(token as string, {
        referenceId: session.referenceId,
        otp,
      });
      setKyc(result.kyc);
      setState('success');
    } catch (err) {
      const { message, code } = readSandboxAadhaarOfflineEkycError(err);
      setState('failed');
      setError(message);

      // An expired or consumed OTP can never succeed — send the user back to
      // step one so they request a fresh code rather than retrying blindly.
      if (code === 'otp_expired') {
        setSession(null);
        setOtp('');
      }
    }
  }, [session, otp, token]);

  const isBusy = state === 'sending' || state === 'verifying';
  const busyLabel =
    state === 'sending' ? 'Sending OTP...' : state === 'verifying' ? 'Verifying...' : '';

  const renderResult = () => {
    if (!kyc) return null;

    const rows: Array<[string, string | undefined]> = (
      [
        ['Name', kyc.name],
        ['Date of birth', kyc.dateOfBirth],
        ['Gender', kyc.gender ? GENDER_LABEL[kyc.gender] || kyc.gender : undefined],
        ['Guardian', kyc.careOf],
        ['Address', formatAddress(kyc)],
      ] as Array<[string, string | undefined]>
    ).filter(([, value]) => Boolean(value));

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="shield-checkmark" size={18} color={colors.success} />
          <Text style={styles.cardTitle}>Verified Aadhaar details</Text>
        </View>

        {kyc.photo ? (
          <Image
            source={normalizePhotoDataUrl(kyc.photo)}
            style={styles.photo}
            contentFit="cover"
            cachePolicy="memory"
          />
        ) : null}

        {rows.map(([label, value]) => (
          <View key={label} style={styles.detailRow}>
            <Text style={styles.detailLabel}>{label}</Text>
            <Text style={styles.detailValue}>{value}</Text>
          </View>
        ))}

        <Text style={styles.disclaimer}>
          Verified with UIDAI using the OTP sent to your Aadhaar-registered mobile. This result is
          shown for this session only and is not saved to your profile.
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Header title="Aadhaar Verification" showNotification={false} />

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <Ionicons
              name={state === 'success' ? 'shield-checkmark' : 'finger-print'}
              size={30}
              color={state === 'success' ? colors.success : colors.primary}
            />
          </View>
          <Text style={styles.heroTitle}>
            {state === 'success' ? 'Aadhaar verified' : 'Verify your Aadhaar'}
          </Text>
          <Text style={styles.heroBody}>
            We send a one-time password to the mobile number registered with UIDAI. Once you enter
            it, we confirm your identity and show the verified details.
          </Text>
        </View>

        {state === 'success' && renderResult()}

        {state !== 'success' && (
          <View style={styles.card}>
            {session ? (
              <>
                <Text style={styles.cardTitle}>Enter the OTP</Text>
                <Text style={styles.cardBody}>
                  Sent to the mobile registered with {session.maskedAadhaar}.
                </Text>

                {session.mockMode && session.debugOtp ? (
                  <InfoBanner
                    style={styles.demoBanner}
                    theme="grey"
                    message={`Demo mode — your OTP is ${session.debugOtp}`}
                  />
                ) : null}

                <OtpInput
                  phone=""
                  length={OTP_LENGTH}
                  loading={isBusy}
                  onOtpChange={setOtp}
                  onResend={async () => {
                    await requestOtp(aadhaar.replace(/\D/g, ''));
                  }}
                />

                <TouchableOpacity
                  style={[styles.primaryButton, isBusy && styles.buttonDisabled]}
                  onPress={handleVerify}
                  disabled={isBusy}
                  accessibilityRole="button"
                >
                  {isBusy ? (
                    <View style={styles.busyRow}>
                      <ActivityIndicator size="small" color={colors.white} />
                      <Text style={styles.primaryButtonText}>{busyLabel}</Text>
                    </View>
                  ) : (
                    <Text style={styles.primaryButtonText}>Verify Aadhaar</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity style={styles.secondaryButton} onPress={reset} disabled={isBusy}>
                  <Text style={styles.secondaryButtonText}>Use a different Aadhaar number</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.cardTitle}>Aadhaar number</Text>
                <Text style={styles.cardBody}>Enter the 12-digit number exactly as printed.</Text>

                <FormField
                  icon="card-outline"
                  label="Aadhaar number"
                  value={aadhaar}
                  onChangeText={(text) =>
                    setAadhaar(text.replace(/\D/g, '').slice(0, AADHAAR_LENGTH))
                  }
                  placeholder="1234 5678 9012"
                  keyboardType="phone-pad"
                  maxLength={AADHAAR_LENGTH}
                />

                {/* UIDAI requires explicit consent before any Aadhaar lookup. */}
                <TouchableOpacity
                  style={styles.consentRow}
                  onPress={() => setConsent((c) => !c)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: consent }}
                >
                  <Ionicons
                    name={consent ? 'checkbox' : 'square-outline'}
                    size={20}
                    color={consent ? colors.primary : colors.greyMuted}
                  />
                  <Text style={styles.consentText}>
                    I consent to UIDAI verifying my Aadhaar details for identity verification.
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.primaryButton, isBusy && styles.buttonDisabled]}
                  onPress={handleStart}
                  disabled={isBusy}
                  accessibilityRole="button"
                >
                  {isBusy ? (
                    <View style={styles.busyRow}>
                      <ActivityIndicator size="small" color={colors.white} />
                      <Text style={styles.primaryButtonText}>{busyLabel}</Text>
                    </View>
                  ) : (
                    <Text style={styles.primaryButtonText}>Send OTP</Text>
                  )}
                </TouchableOpacity>
              </>
            )}

            {error ? (
              <View style={styles.errorBanner} accessibilityRole="alert">
                <View style={styles.errorHeader}>
                  <Ionicons name="alert-circle" size={16} color={colors.error} />
                  <Text style={styles.errorTitle}>Could not verify</Text>
                </View>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

export default SandboxAadhaarOfflineEkycScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.light },
  scrollContent: { padding: spacing.lg, paddingBottom: spacing.xxl },
  hero: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.sm,
  },
  heroIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  heroTitle: { fontSize: 18, fontWeight: '700', color: colors.dark, marginBottom: spacing.xs },
  heroBody: { fontSize: 14, color: colors.grey, lineHeight: 20 },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    padding: spacing.lg,
    ...shadows.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  cardTitle: { fontSize: 15, fontWeight: '700', color: colors.dark, marginBottom: spacing.xs },
  cardBody: { fontSize: 13, color: colors.grey, lineHeight: 18, marginBottom: spacing.md },
  demoBanner: { marginBottom: spacing.md },
  photo: {
    width: 96,
    height: 96,
    borderRadius: radius.md,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.greyLight,
  },
  detailLabel: { fontSize: 13, color: colors.grey, fontWeight: '600' },
  detailValue: {
    fontSize: 13,
    color: colors.dark,
    flex: 1,
    textAlign: 'right',
    marginLeft: spacing.md,
  },
  disclaimer: { fontSize: 11, color: colors.greyMuted, marginTop: spacing.md, lineHeight: 16 },
  consentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  consentText: { flex: 1, fontSize: 13, color: colors.dark, lineHeight: 18 },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingVertical: spacing.mdPlus,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: { opacity: 0.7 },
  primaryButtonText: { color: colors.white, fontSize: 15, fontWeight: '700' },
  secondaryButton: { marginTop: spacing.md, alignItems: 'center', paddingVertical: spacing.sm },
  secondaryButtonText: { color: colors.grey, fontSize: 14, fontWeight: '600' },
  busyRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  errorBanner: {
    backgroundColor: '#fef2f2',
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#fecaca',
    marginTop: spacing.lg,
  },
  errorHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs + 2 },
  errorTitle: { fontSize: 13, fontWeight: '700', color: colors.error },
  errorText: { fontSize: 13, color: colors.dark, marginTop: spacing.xs, lineHeight: 18 },
});