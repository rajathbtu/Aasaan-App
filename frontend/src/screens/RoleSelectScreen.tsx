import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  BackHandler,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Header from '../components/Header';
import SvgIcon from '../assets/icons';
import { BrandText, BRAND_WORD_COLOR, BRAND_WORD_FONT } from '../components/BrandWord';
import { RoleNeighborhood, RoleConsumerArt, RoleExpertArt } from '../assets/images/roleSelection';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../i18n';
import BlockingLoader from '../components/BlockingLoader';

/* Exact colour tokens from approved design */
const RS = {
  green: '#079B5C',
  brandGreen: '#079B45',
  ctaGreen: '#08AD73',
  labelGreen: '#087F50',
  ink: '#172027',
  muted: '#596575',
  cardBorder: '#E0E8E5',
  selectedSurface: '#EDFBF3',
  labelBg: '#E8F8EE',
  benefitTile: '#E4F8ED',
  benefitText: '#18231E',
  radioBorder: '#AEB9C0',
  hint: '#89938F',
  footerBorder: '#E9EEEB',
};

type Role = 'endUser' | 'serviceProvider';

/**
 * Role selection — Choose Your Role.
 * Two rich role cards (Consumer / Service Expert) with badges, benefit
 * points and illustrations; single-select radio behaviour; fixed bottom
 * Confirm Selection CTA. Role ids and the save flow reuse the existing
 * contract (updateUser({ role }) → onboarding branch).
 */
const RoleSelectScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  // Mode: 'edit' when opened from profile-update flows, otherwise 'onboarding'
  const mode: 'edit' | 'onboarding' = (route.params?.mode as any) === 'edit' ? 'edit' : 'onboarding';
  const { user, updateUser } = useAuth();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const [selectedRole, setSelectedRole] = useState<Role | null>(
    user?.role === 'endUser' || user?.role === 'serviceProvider' ? (user.role as Role) : null
  );
  const [saving, setSaving] = useState(false);

  const confirmSelection = async () => {
    if (!selectedRole) return;
    try {
      setSaving(true);
      await updateUser({ role: selectedRole });
      if (selectedRole === 'serviceProvider') {
        navigation.navigate('SPSelectServices');
      } else {
        navigation.navigate('Main');
      }
    } catch (err: any) {
      Alert.alert(t('common.error'), err?.message || t('roleSelect.updateRoleError'));
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    // Only prevent going back during onboarding; allow back in edit mode
    if (mode === 'edit') return;

    const backHandler = () => true;

    const unsubscribe = navigation.addListener('beforeRemove', (e: any) => {
      e.preventDefault(); // Disable going back during onboarding
    });

    const backHandlerListener = BackHandler.addEventListener('hardwareBackPress', backHandler);

    return () => {
      unsubscribe();
      backHandlerListener.remove();
    };
  }, [navigation, mode]);

  const RoleCard: React.FC<{
    role: Role;
    label: string;
    labelIcon: string;
    title: string;
    description: string;
    benefits: Array<{ icon: string; lines: string[] }>;
    Art: React.FC<{ width?: number; height?: number; style?: any }>;
  }> = ({ role, label, labelIcon, title, description, benefits, Art }) => {
    const selected = selectedRole === role;
    return (
      <TouchableOpacity
        onPress={() => setSelectedRole(role)}
        activeOpacity={0.9}
        style={[styles.card, selected && styles.cardSelected]}
        accessibilityRole="radio"
        accessibilityState={{ selected }}
        accessibilityLabel={`${label}. ${title}`}>
        <View pointerEvents="none" style={styles.roleArtWrap}>
          <Art width={undefined} height={undefined} style={styles.roleArt} />
        </View>

        <View style={styles.roleLabel}>
          <SvgIcon name={labelIcon as any} size={16} color={RS.labelGreen} />
          <Text style={styles.roleLabelText}>{label}</Text>
        </View>

        <Text style={styles.roleTitle}>{title}</Text>
        <Text style={styles.roleDesc}>{description}</Text>

        <View style={styles.benefits}>
          {benefits.map((benefit) => (
            <View key={benefit.lines.join(' ')} style={styles.benefit}>
              <View style={styles.benefitTile}>
                <SvgIcon name={benefit.icon as any} size={16} color={RS.green} />
              </View>
              <Text style={styles.benefitLabel}>
                {benefit.lines.map((line, i) => (
                  <Text key={i} style={styles.benefitLine}>
                    {line}
                    {i < benefit.lines.length - 1 ? '\n' : ''}
                  </Text>
                ))}
              </Text>
            </View>
          ))}
        </View>

        <View
          style={[styles.roleSelect, selected && styles.roleSelectSelected]}
          pointerEvents="none">
          {selected && <SvgIcon name="check" size={14} color="#FFFFFF" />}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.screen}>
      <Header
        title={t('roleSelect.headerTitle')}
        showBackButton={mode === 'edit'} // Show back button only in edit mode
        showNotification={false}
        titleStyle={styles.headerTitle}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Intro / hero with neighbourhood backdrop */}
        <View style={styles.intro}>
          <RoleNeighborhood width={170} height={94} style={styles.neighborhood} />
          <BrandText style={styles.introTitle}>{t('roleSelect.title')}</BrandText>
          <BrandText style={styles.introBrand}>{t('roleSelect.titleBrand')}</BrandText>
          <Text style={styles.introSubtitle}>{t('roleSelect.subtitle')}</Text>
        </View>

        {/* Role cards */}
        <View style={styles.roleList}>
          <RoleCard
            role="endUser"
            label={t('roleSelect.endUserSubtitle')}
            labelIcon="user"
            title={t('roleSelect.endUserTitle')}
            description={t('roleSelect.endUserDesc')}
            benefits={[
              { icon: 'shield', lines: t('roleSelect.benefitVerifiedExperts').split('\n') },
              { icon: 'bolt', lines: t('roleSelect.benefitQuickBooking').split('\n') },
              { icon: 'pin', lines: t('roleSelect.benefitNearbyServices').split('\n') },
            ]}
            Art={RoleConsumerArt}
          />
          <RoleCard
            role="serviceProvider"
            label={t('roleSelect.spSubtitle')}
            labelIcon="notif-briefcase"
            title={t('roleSelect.spTitle')}
            description={t('roleSelect.spDesc')}
            benefits={[
              { icon: 'notif-calendar', lines: t('roleSelect.benefitGetWork').split('\n') },
              { icon: 'coins', lines: t('roleSelect.benefitIncreaseEarnings').split('\n') },
              { icon: 'award', lines: t('roleSelect.benefitBuildYourBrand').split('\n') },
            ]}
            Art={RoleExpertArt}
          />
        </View>

        <Text style={styles.selectionHint}>{t('roleSelect.changeRoleNote')}</Text>
      </ScrollView>

      {/* Fixed bottom confirm CTA */}
      <View style={[styles.footer, { paddingBottom: 14 + insets.bottom }]}>
        <TouchableOpacity
          style={[styles.confirmButton, (!selectedRole || saving) && styles.confirmButtonDisabled]}
          onPress={confirmSelection}
          disabled={!selectedRole || saving}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={t('roleSelect.confirmButton')}>
          {saving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Text style={styles.confirmText}>{t('roleSelect.confirmButton')}</Text>
              <SvgIcon name="ss-arrow-right" size={19} color="#FFFFFF" />
            </>
          )}
        </TouchableOpacity>
      </View>
      <BlockingLoader visible={saving} />
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  headerTitle: {
    fontSize: 19,
    letterSpacing: -0.6,
  },
  scrollContent: {
    paddingHorizontal: 17,
    paddingBottom: 14,
  },
  /* .intro{min-height:160px;padding-top:20px;position:relative;overflow:hidden}
     Moderately tightened so the screen fits one frame on standard phones. */
  intro: {
    paddingTop: 12,
    paddingHorizontal: 12,
    paddingBottom: 12,
    overflow: 'hidden',
  },
  /* .neighborhood{position:absolute;width:190px;height:105px;right:-48px;bottom:-2px;opacity:.56} */
  neighborhood: {
    position: 'absolute',
    right: -36,
    bottom: -2,
    opacity: 0.56,
  },
  /* .intro h2{font-size:25px;font-weight:520;color:#172027;letter-spacing:-1px} */
  introTitle: {
    fontSize: 22,
    lineHeight: 26,
    fontWeight: '500',
    letterSpacing: -0.7,
    color: RS.ink,
  },
  /* .intro h2 span{font-size:32px;font-weight:850;color:#079b45;letter-spacing:-1.3px} */
  introBrand: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '700',
    letterSpacing: -1.1,
    color: BRAND_WORD_COLOR,
    fontFamily: BRAND_WORD_FONT,
    marginBottom: 6,
  },
  /* .intro p{font-size:15px;color:#596575;max-width:300px} */
  introSubtitle: {
    fontSize: 13.5,
    lineHeight: 18,
    color: RS.muted,
    maxWidth: 290,
  },
  /* .role-list{display:flex;flex-direction:column;gap:14px;padding:2px 0 5px} */
  roleList: {
    gap: 12,
  },
  /* .role-card{min-height:242px;border:1.5px solid #e0e8e5;border-radius:23px;padding:15px 13px;
     background:white;box-shadow:0 5px 18px rgba(17,54,39,.08)}
     Uniform 2px border so selection changes colour only, never shape. */
  card: {
    minHeight: 176,
    borderWidth: 2,
    borderColor: RS.cardBorder,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 12,
    alignItems: 'flex-start',
    overflow: 'hidden',
    shadowColor: '#113627',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 3,
  },
  /* .role-card.selected{border:2px solid green;background:#edfbf3;green shadow} */
  cardSelected: {
    borderColor: RS.green,
    backgroundColor: RS.selectedSurface,
    shadowColor: '#079B5C',
    shadowOpacity: 0.12,
  },
  /* .role-art{position:absolute;right:0;bottom:8px;width:44%;height:60%;object-fit:contain}
   Transparent cutouts let the art run a little larger. */
  roleArtWrap: {
    position: 'absolute',
    right: 0,
    bottom: 4,
    width: '48%',
    height: '66%',
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
    zIndex: 1,
  },
  roleArt: {
    width: '100%',
    height: '100%',
  },
  /* .role-label{height:34px;gap:9px;padding:0 12px;border-radius:22px;background:#e8f8ee;color:#087f50;font-size:14px;font-weight:750} */
  roleLabel: {
    height: 28,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 7,
    paddingHorizontal: 11,
    borderRadius: 15,
    backgroundColor: RS.labelBg,
    zIndex: 2,
  },
  roleLabelText: {
    fontSize: 12,
    fontWeight: '700',
    color: RS.labelGreen,
  },
  /* .role-title{font-size:20px;line-height:1.12;font-weight:820;letter-spacing:-.65px;margin:14px 0 7px;max-width:70%} */
  roleTitle: {
    fontSize: 17.5,
    lineHeight: 21,
    fontWeight: '800',
    letterSpacing: -0.5,
    color: RS.ink,
    marginTop: 9,
    marginBottom: 4,
    maxWidth: '64%',
    zIndex: 2,
  },
  /* .role-description{font-size:12px;line-height:1.34;color:#596575;max-width:66%} */
  roleDesc: {
    fontSize: 11,
    lineHeight: 14.5,
    color: RS.muted,
    maxWidth: '62%',
    zIndex: 2,
  },
  /* .benefits{gap:6px;margin-top:auto;padding-top:16px;max-width:74%} */
  benefits: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    gap: 5,
    marginTop: 10,
    maxWidth: '80%',
    zIndex: 2,
  },
  /* .benefit{gap:4px;font-size:9px;color:#18231e;font-weight:550} */
  benefit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
    minWidth: 0,
  },
  /* .benefit i{width:30px;height:30px;border-radius:12px;background:#e4f8ed} */
  benefitTile: {
    width: 25,
    height: 25,
    borderRadius: 9,
    backgroundColor: RS.benefitTile,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  benefitLabel: {
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '500',
    color: RS.benefitText,
    flexShrink: 1,
  },
  benefitLine: {
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '500',
    color: RS.benefitText,
  },
  /* .role-select{position:absolute;right:16px;top:17px;width:26px;height:26px;border-radius:50%;
     border:2px solid #aeb9c0;background:#fff} */
  roleSelect: {
    position: 'absolute',
    right: 13,
    top: 13,
    width: 23,
    height: 23,
    borderRadius: 11.5,
    borderWidth: 2,
    borderColor: RS.radioBorder,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 3,
  },
  roleSelectSelected: {
    backgroundColor: RS.green,
    borderColor: RS.green,
  },
  /* .selection-hint{font-size:11px;text-align:center;color:#89938f;margin:8px 0 0} */
  selectionHint: {
    fontSize: 11,
    lineHeight: 15,
    textAlign: 'center',
    color: RS.hint,
    marginTop: 6,
  },
  /* .footer{border-top:1px solid #e9eeeb;padding:12px 16px 14px} */
  footer: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: RS.footerBorder,
    paddingTop: 11,
    paddingHorizontal: 16,
  },
  /* .confirm-button{width:100%;height:54px;border-radius:13px;background:#08ad73;gap:14px;font-size:17px;font-weight:800} */
  confirmButton: {
    width: '100%',
    height: 50,
    borderRadius: 13,
    backgroundColor: RS.ctaGreen,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    shadowColor: '#008B53',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  confirmButtonDisabled: {
    opacity: 0.45,
    shadowOpacity: 0,
    elevation: 0,
  },
  confirmText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
});

export default RoleSelectScreen;
