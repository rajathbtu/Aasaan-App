import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView, ActivityIndicator, BackHandler } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Header from '../components/Header';
import BottomCTA from '../components/BottomCTA';
import { colors, spacing, radius } from '../theme';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../i18n';
import { getLanguageDisplay } from '../data/languages';
import { trackScreenView, trackButtonClick } from '../utils/analytics';

const STICKY_HEIGHT = 96; // approx height of the bottom CTA area (padding + button + note)

/**
 * Allows the newly registered user to choose whether they want to use
 * Aasaan as an end user (someone requesting services) or as a service
 * provider.  The selected role is persisted to the backend and the
 * onboarding flow branches accordingly.
 */
const RoleSelectScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { user, updateUser } = useAuth();
  const { t, lang } = useI18n();
  const [selectedRole, setSelectedRole] = useState<'endUser' | 'serviceProvider' | null>(
    user?.role === 'endUser' || user?.role === 'serviceProvider' ? (user.role as 'endUser' | 'serviceProvider') : null
  );
  const [saving, setSaving] = useState(false);

  const languageDisplay = useMemo(() => getLanguageDisplay(lang), [lang]);

  // Track screen view on mount
  useEffect(() => {
    trackScreenView('RoleSelectScreen', 'Onboarding');
  }, []);

  const confirmSelection = async () => {
    if (!selectedRole) return;
    
    // Track role selection
    // Major action: role selection
    trackButtonClick('select_role', { role: selectedRole });
    
    try {
      setSaving(true);
      await updateUser({ role: selectedRole });
      
      // Track successful role update
      // No extra analytics
      
      if (selectedRole === 'serviceProvider') {
        navigation.navigate('SPSelectServices');
      } else {
        navigation.navigate('Main');
      }
    } catch (err: any) {
      // Track role update error
      // No extra analytics
      
      Alert.alert(t('common.error'), err?.message || t('roleSelect.updateRoleError'));
    } finally {
      setSaving(false);
    }
  };

  const Card = ({
    role,
    title,
    desc,
    icon,
    tint,
    border,
  }: {
    role: 'endUser' | 'serviceProvider';
    title: string;
    desc: string;
    icon: keyof typeof Ionicons.glyphMap;
    tint: string;
    border: string;
  }) => {
    const selected = selectedRole === role;
    return (
      <TouchableOpacity
        onPress={() => {
          setSelectedRole(role);
          // Track role card selection
          // No extra analytics
        }}
        activeOpacity={0.9}
        style={[
          styles.card,
          { borderColor: selected ? border : colors.greyLight },
        ]}
      >
        <View style={[styles.iconWrap, { backgroundColor: `${tint}22` }]}>
          <Ionicons name={icon} size={22} color={tint} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>{title}</Text>
          <Text style={styles.cardDesc}>{desc}</Text>
        </View>
        <View style={[styles.checkbox, { borderColor: selected ? border : colors.greyLight, backgroundColor: selected ? border : colors.white }]}>
          {selected && <Ionicons name="checkmark" size={16} color={colors.white} />}
        </View>
      </TouchableOpacity>
    );
  };

  React.useEffect(() => {
    const backHandler = () => {
      return true; // Prevent app exit on back button press
    };

    const unsubscribe = navigation.addListener('beforeRemove', (e: any) => {
      e.preventDefault(); // Disable going back
    });

    const backHandlerListener = BackHandler.addEventListener('hardwareBackPress', backHandler);

    return () => {
      unsubscribe();
      backHandlerListener.remove();
    };
  }, [navigation]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.light }}>
      <Header
        title={'Choose your Role'}
        showBackButton={false}
        showNotification={false}
        customRightComponent={
          <TouchableOpacity
            onPress={() => navigation.navigate('LanguageSelection')}
            style={styles.langPill}
          >
            <Ionicons name="globe-outline" size={16} color={colors.dark} />
            <Text style={styles.langText}>{languageDisplay}</Text>
            <Ionicons name="chevron-down" size={14} color={colors.grey} />
          </TouchableOpacity>
        }
      />
      {/* small spacer to normalize gap below header across platforms */}
      <View style={{ height: spacing.sm }} />

      <ScrollView contentContainerStyle={{ padding: spacing.xl, paddingBottom: STICKY_HEIGHT + spacing.xl }}>
        <View style={{ marginBottom: spacing.xl, alignItems: 'center' }}>
          <Text style={styles.title}>{t('roleSelect.title')}</Text>
          <Text style={styles.subtitle}>{t('roleSelect.subtitle')}</Text>
        </View>

        <View style={{ gap: spacing.md }}>
          <Card
            role="endUser"
            title={t('roleSelect.endUserTitle')}
            desc={t('roleSelect.endUserDesc')}
            icon="search-outline"
            tint={colors.primary}
            border={colors.primary}
          />
          <Card
            role="serviceProvider"
            title={t('roleSelect.spTitle')}
            desc={t('roleSelect.spDesc')}
            icon="briefcase-outline"
            tint={colors.secondary}
            border={colors.secondary}
          />
        </View>

        {/* Motivation element */}
        <View style={styles.motivationBox}>
          <View style={[styles.iconWrap, { backgroundColor: colors.primaryLight }]}>
            <Ionicons name="people-outline" size={16} color={colors.primary} />
          </View>
          <Text style={styles.motivationText}>{t('roleSelect.motivation', { count: '10,000+' })}</Text>
        </View>
      </ScrollView>

      {/* Sticky bottom confirm CTA */}
      <BottomCTA
        isSticky={true}
        noteText={t('roleSelect.changeRoleNote')}
        buttonText={t('roleSelect.confirmButton')}
        onPress={confirmSelection}
        isLoading={saving}
        isDisabled={!selectedRole || saving}
        showArrow={!!selectedRole}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.dark,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 14,
    color: colors.grey,
    textAlign: 'center',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 2,
    backgroundColor: colors.white,
    shadowColor: colors.black,
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
    gap: spacing.md,
  },
  iconWrap: {
    padding: spacing.md,
    borderRadius: 999,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: radius.sm,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.md,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.dark,
    marginBottom: 2,
  },
  cardDesc: {
    fontSize: 13,
    color: colors.grey,
  },
  motivationBox: {
    marginTop: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.primarySoft,
    backgroundColor: colors.paper,
    padding: spacing.md,
    borderRadius: radius.md,
  },
  motivationText: {
    flex: 1,
    fontSize: 13,
    color: colors.grey,
  },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: spacing.lg,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.greyLight,
  },
  confirmBtn: {
    height: 48,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  confirmText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  noteText: {
    marginBottom: spacing.md,
    textAlign: 'center',
    fontSize: 12,
    color: colors.grey,
  },
  langPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    gap: 6,
  },
  langText: {
    fontSize: 12,
    color: colors.dark,
    fontWeight: '600',
  },
});

export default RoleSelectScreen;