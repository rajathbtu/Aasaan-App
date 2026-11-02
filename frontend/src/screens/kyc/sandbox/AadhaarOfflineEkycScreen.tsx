import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useNavigation } from '@react-navigation/native';

import { useAuth } from '../../../contexts/AuthContext';
import {
  AadhaarVerificationIllustration,
  ArrowBack,
  IdentityCard,
  SendIcon,
} from '../../../assets/images';
import OtpInput from '../../../components/OtpInput';
import {
  SandboxAadhaarOfflineEkycResult,
  SandboxAadhaarOfflineEkycOtpSession,
  generateSandboxAadhaarOfflineEkycOtp,
  readSandboxAadhaarOfflineEkycError,
  verifySandboxAadhaarOfflineEkycOtp,
} from '../../../api/kyc/sandbox/aadhaarOfflineEkyc';

/** Aadhaar_Handoff approved design tokens (README.md). */
const C = {
  /** Primary green. */
  green: '#079B60',
  /** Dark green. */
  greenDark: '#07864F',
  /** Pale mint surface. */
  mint: '#E8F8F0',
  /** Strong mint accent. */
  mintStrong: '#D8F4E7',
  /** Charcoal text. */
  ink: '#17232C',
  /** Muted grey copy. */
  muted: '#66717F',
  /** Subtle border. */
  border: '#E1E9E6',
  /** White surface. */
  surface: '#FFFFFF',
  /** Page background. */
  page: '#F7FCF9',
  /** Input border (slightly different from --border in CSS). */
  inputBorder: '#D5DDE3',
  /** Consent card background. */
  consentBg: '#F0FAF5',
  /** Error text. */
  error: '#C43D3D',
} as const;

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

/**
 * Aadhaar offline e-KYC over UIDAI, via Sandbox (sandbox.co.in).
 *
 * Flow: enter Aadhaar -> capture UIDAI-mandated consent -> request the OTP
 * (delivered to the Aadhaar-registered mobile) -> submit it -> show the
 * verified e-KYC record.
 *
 * Sandbox performs the provider exchange; verified fields are saved through
 * the backend's provider-agnostic KYC service.
 *
 * UI rebuilt to match Aadhaar_Handoff approved design (index.html, styles.css).
 * All API calls, validation, payloads, response parsing, navigation and error
 * handling are preserved from the previous implementation.
 */
const SandboxAadhaarOfflineEkycScreen: React.FC = () => {
  const { token, refreshUser } = useAuth();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

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
        aadhaarLast4: aadhaar.replace(/\D/g, '').slice(-4),
      });
      setKyc(result.kyc);
      setState('success');
      void refreshUser().catch(() => {});
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
  }, [session, otp, token, aadhaar, refreshUser]);

  const isBusy = state === 'sending' || state === 'verifying';
  const busyLabel =
    state === 'sending' ? 'Sending OTP...' : state === 'verifying' ? 'Verifying...' : '';

  /** Format digits into groups of four: 1234 5678 9012. */
  const formatAadhaar = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, AADHAAR_LENGTH);
    return digits.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
  };

  const digitsOnly = (value: string) => value.replace(/\D/g, '').slice(0, AADHAAR_LENGTH);

  const isFormValid = digitsOnly(aadhaar).length === AADHAAR_LENGTH && consent;

  const renderResult = () => {
    if (!kyc) return null;

    const rows: Array<[string, string | undefined]> = (
      [
        ['Name', kyc.name],
        ['Date of birth', kyc.dateOfBirth],
        ['Gender', kyc.gender ? GENDER_LABEL[kyc.gender] || kyc.gender : undefined],
        ['Address', kyc.address],
      ] as Array<[string, string | undefined]>
    ).filter(([, value]) => Boolean(value));

    return (
      <View style={styles.resultCard}>
        <View style={styles.resultCardHeader}>
          <View style={styles.resultIcon}>
            <ActivityIndicator size="small" color={C.green} />
          </View>
          <Text style={styles.resultCardTitle}>Verified Aadhaar details</Text>
        </View>

        {rows.map(([label, value]) => (
          <View key={label} style={styles.detailRow}>
            <Text style={styles.detailLabel}>{label}</Text>
            <Text style={styles.detailValue}>{value}</Text>
          </View>
        ))}

        <Text style={styles.disclaimer}>
          Verified with UIDAI using the OTP sent to your Aadhaar-registered mobile. Your name, date
          of birth, gender, and address are encrypted in your profile. The full Aadhaar number and
          portrait are not saved.
        </Text>
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Custom header: back + "Aadhaar Verification" title */}
      <View style={styles.topbar}>
        <TouchableOpacity
          style={styles.backBtn}
          activeOpacity={0.7}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Go back">
          <ArrowBack size={22} color={C.ink} />
        </TouchableOpacity>
        <Text style={styles.topbarTitle}>Aadhaar Verification</Text>
        <View style={styles.topbarSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 20 }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}>

        {/* Hero: illustration + heading + explanatory text */}
        <View style={styles.hero}>
          <AadhaarVerificationIllustration width={280} height={183} />
          <Text style={styles.heroTitle}>
            Verify your <Text style={styles.heroTitleGreen}>Aadhaar</Text>
          </Text>
          <Text style={styles.heroBody}>
            We send a one-time password to the mobile number registered with UIDAI. Once you enter
            it, we confirm your identity and show the verified details.
          </Text>
        </View>

        {state === 'success' && renderResult()}

        {state !== 'success' && (
          <View style={styles.formCard}>
            {session ? (
              <>
                {/* OTP entry stage */}
                <View style={styles.formHeading}>
                  <IdentityCard size={24} color={C.green} />
                  <View style={styles.formHeadingTextWrap}>
                    <Text style={styles.formHeadingTitle} numberOfLines={1} ellipsizeMode="tail">
                      Enter the OTP
                    </Text>
                    <Text style={styles.formHeadingBody} numberOfLines={2} ellipsizeMode="tail">
                      Sent to the mobile registered with {session.maskedAadhaar}.
                    </Text>
                  </View>
                </View>

                {/* OTP entry stage — 6 digit cells, standard OTP input */}
                <View style={styles.otpRow}>
                  {Array.from({ length: OTP_LENGTH }).map((_, i) => (
                    <View key={i} style={styles.otpCell}>
                      {otp[i] ? (
                        <Text style={styles.otpDigit}>{otp[i]}</Text>
                      ) : null}
                    </View>
                  ))}
                </View>

                {/* Hidden text input to capture keyboard typing */}
                <TextInput
                  style={styles.hiddenOtpInput}
                  value={otp}
                  onChangeText={(text) => {
                    const digits = text.replace(/\D/g, '').slice(0, OTP_LENGTH);
                    setOtp(digits);
                  }}
                  keyboardType="number-pad"
                  maxLength={OTP_LENGTH}
                  autoFocus
                  returnKeyType="done"
                  accessibilityLabel="OTP"
                />

                <Text style={styles.hint}>Enter the 6-digit code sent to your registered mobile.</Text>
                {error ? (
                  <Text style={styles.errorText}>{error}</Text>
                ) : null}

                <View style={styles.buttonRow}>
                  <TouchableOpacity
                    style={[styles.submitButton, isBusy && styles.submitButtonDisabled]}
                    onPress={handleVerify}
                    disabled={isBusy || otp.length !== OTP_LENGTH}
                    accessibilityRole="button"
                    accessibilityLabel="Verify Aadhaar">
                    {isBusy ? (
                      <View style={styles.busyRow}>
                        <ActivityIndicator size="small" color="#FFFFFF" />
                        <Text style={styles.submitButtonText}>{busyLabel}</Text>
                      </View>
                    ) : (
                      <View style={styles.submitIconRow}>
                        <SendIcon size={20} color="#FFFFFF" />
                        <Text style={styles.submitButtonText}>Verify Aadhaar</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={reset}
                  disabled={isBusy}
                  accessibilityRole="button"
                  accessibilityLabel="Use a different Aadhaar number">
                  <Text style={styles.secondaryButtonText}>Use a different Aadhaar number</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                {/* Aadhaar number entry stage */}
                <View style={styles.formHeading}>
                  <IdentityCard size={30} color={C.green} />
                  <View>
                    <Text style={styles.formHeadingTitle}>Aadhaar Number</Text>
                    <Text style={styles.formHeadingBody}>
                      Enter the 12-digit number exactly as printed.
                    </Text>
                  </View>
                </View>

                <View style={styles.fieldRow}>
                  <Text style={styles.fieldLabel}>Aadhaar number</Text>
                </View>
                <View style={styles.inputWrap}>
                  <IdentityCard size={25} color="#A0AAB6" />
                  <TextInput
                    style={styles.input}
                    value={aadhaar}
                    onChangeText={(text) => {
                      const formatted = formatAadhaar(text);
                      setAadhaar(formatted);
                      if (error) setError(null);
                    }}
                    keyboardType="number-pad"
                    maxLength={14}
                    placeholder="1234 5678 9012"
                    placeholderTextColor="#A0AAB6"
                    returnKeyType="done"
                    accessibilityLabel="Aadhaar number"
                  />
                </View>
                <Text style={styles.hint}>Your number is used only for identity verification.</Text>
                {error ? (
                  <Text style={styles.errorText}>{error}</Text>
                ) : null}

                {/* Consent checkbox */}
                <TouchableOpacity
                  style={styles.consentRow}
                  onPress={() => setConsent((c) => !c)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: consent }}
                  activeOpacity={0.9}>
                  <View style={[styles.customCheck, consent && styles.customCheckChecked]}>
                    {consent && (
                      <View style={styles.checkMark} />
                    )}
                  </View>
                  <Text style={styles.consentText} numberOfLines={2} ellipsizeMode="tail">
                    I consent to UIDAI verifying my Aadhaar details for identity verification.
                  </Text>
                </TouchableOpacity>

                <View style={styles.buttonRow}>
                  <TouchableOpacity
                    style={[styles.submitButton, !isFormValid && styles.submitButtonDisabled]}
                    onPress={handleStart}
                    disabled={!isFormValid || isBusy}
                    accessibilityRole="button"
                    accessibilityLabel="Send OTP">
                    {isBusy ? (
                      <View style={styles.busyRow}>
                        <ActivityIndicator size="small" color="#FFFFFF" />
                        <Text style={styles.submitButtonText}>{busyLabel}</Text>
                      </View>
                    ) : (
                      <View style={styles.submitIconRow}>
                        <SendIcon size={20} color="#FFFFFF" />
                        <Text style={styles.submitButtonText}>Send OTP</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </View>

                <Text style={styles.finePrint}>
                  An OTP will be sent to your UIDAI-registered mobile number.
                </Text>
              </>
            )}
          </View>
        )}

        {state !== 'success' && error && !session ? (
          <View style={styles.errorBanner} accessibilityRole="alert">
            <View style={styles.errorHeader}>
              <View style={styles.errorIcon} />
              <Text style={styles.errorTitle}>Could not verify</Text>
            </View>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
};

export default SandboxAadhaarOfflineEkycScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.page,
  },
  scrollContent: {
    paddingHorizontal: 22,
    paddingTop: 10,
    paddingBottom: 20,
  },
  /* Custom header: back + title */
  topbar: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 6,
  },
  backBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: C.mint,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 18,
  },
  topbarTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: C.ink,
    letterSpacing: -0.3,
  },
  topbarSpacer: {
    flex: 1,
  },

  hero: {
    alignItems: 'center',
    marginBottom: 0,
  },
  heroTitle: {
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '800',
    color: C.ink,
    letterSpacing: -0.5,
    textAlign: 'center',
    marginBottom: 10,
  },
  heroTitleGreen: {
    color: C.green,
  },
  heroBody: {
    fontSize: 14,
    lineHeight: 20,
    color: C.muted,
    textAlign: 'center',
    maxWidth: 330,
    marginHorizontal: 10,
  },

  formCard: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 20,
    padding: 18,
    shadowColor: '#1C4231',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.07,
    shadowRadius: 16,
    elevation: 3,
    marginBottom: 16,
  },

  formHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 18,
  },
  formHeadingTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  formHeadingTitle: {
    fontSize: 17,
    letterSpacing: -0.3,
    color: C.ink,
    fontWeight: '700',
  },
  formHeadingBody: {
    fontSize: 13,
    lineHeight: 18,
    color: C.muted,
    marginTop: 4,
  },

  fieldRow: {
    marginBottom: 8,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: C.ink,
  },

  inputWrap: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    borderWidth: 1.5,
    borderColor: C.inputBorder,
    borderRadius: 12,
    backgroundColor: C.surface,
  },
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 10,
    marginBottom: 6,
  },
  otpCell: {
    width: 44,
    height: 52,
    borderWidth: 1.5,
    borderColor: C.inputBorder,
    borderRadius: 12,
    backgroundColor: C.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpDigit: {
    fontSize: 20,
    fontWeight: '800',
    color: C.ink,
  },
  hiddenOtpInput: {
    position: 'absolute',
    opacity: 0,
    width: 0,
    height: 0,
  },
  input: {
    flex: 1,
    color: C.ink,
    fontSize: 14,
    letterSpacing: 0.3,
    minWidth: 0,
    paddingVertical: 0,
  },

  hint: {
    fontSize: 12,
    lineHeight: 16,
    color: '#87919D',
    marginTop: 8,
    marginBottom: 4,
  },
  errorText: {
    fontSize: 12,
    color: C.error,
    marginTop: 4,
    marginHorizontal: 2,
  },

  consentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 0,
    marginTop: 12,
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: C.consentBg,
    width: '100%',
  },
  customCheck: {
    width: 22,
    height: 22,
    borderWidth: 2,
    borderColor: '#89959E',
    borderRadius: 5,
    backgroundColor: C.surface,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  customCheckChecked: {
    borderColor: C.green,
    backgroundColor: C.green,
  },
  checkMark: {
    width: 5,
    height: 10,
    borderColor: '#FFFFFF',
    borderWidth: 0,
    borderBottomWidth: 2,
    borderRightWidth: 2,
    transform: [{ rotate: '45deg' }],
  },
  consentText: {
    fontSize: 13,
    lineHeight: 18,
    color: '#25323A',
    flex: 1,
    flexShrink: 1,
  },

  buttonRow: {
    marginTop: 16,
  },
  submitButton: {
    width: '100%',
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: C.green,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    shadowColor: C.green,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
    elevation: 3,
  },
  submitButtonDisabled: {
    opacity: 0.48,
    shadowOpacity: 0,
    elevation: 0,
  },
  submitButtonText: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  submitIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  busyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  secondaryButton: {
    alignItems: 'center',
    marginTop: 16,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: C.muted,
  },

  finePrint: {
    fontSize: 11,
    lineHeight: 15,
    color: '#89939D',
    textAlign: 'center',
    marginTop: 12,
  },

  resultCard: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 20,
    padding: 18,
    shadowColor: '#1C4231',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.07,
    shadowRadius: 16,
    elevation: 3,
    marginBottom: 16,
  },
  resultCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  resultIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: C.mintStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: C.ink,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: C.border,
  },
  detailLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: C.muted,
  },
  detailValue: {
    fontSize: 13,
    color: C.ink,
    flex: 1,
    textAlign: 'right',
    marginLeft: 16,
  },
  disclaimer: {
    fontSize: 11,
    lineHeight: 16,
    color: C.muted,
    marginTop: 16,
  },

  errorBanner: {
    backgroundColor: '#fef2f2',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#fecaca',
    marginTop: 16,
  },
  errorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  errorIcon: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: C.error,
  },
  errorTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: C.error,
  },
});
