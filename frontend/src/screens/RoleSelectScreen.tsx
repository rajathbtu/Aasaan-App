import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Header from '../components/Header';
import { colors, spacing, radius } from '../theme';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../i18n';
import { getLanguageDisplay } from '../data/languages';

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
        onPress={() => setSelectedRole(role)}
        activeOpacity={0.9}
        style={[
          styles.card,
          { borderColor: selected ? border : colors.greyLight, backgroundColor: selected ? `${tint}22` : colors.white },
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

  return (
    <View style={{ flex: 1, backgroundColor: colors.light }}>
      <Header
        title={'Aasaan'}
        showBackButton={true}
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
          <View style={[styles.iconWrap, { backgroundColor: colors.primaryLight, marginRight: spacing.md }]}>
            <Ionicons name="people-outline" size={18} color={colors.primary} />
          </View>
          <Text style={styles.motivationText}>{t('roleSelect.motivation', { count: '10,000+' })}</Text>
        </View>
      </ScrollView>

      {/* Sticky bottom confirm CTA */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          disabled={!selectedRole || saving}
          onPress={confirmSelection}
          style={[
            styles.confirmBtn,
            { backgroundColor: !selectedRole || saving ? colors.greyBorder : colors.primary },
          ]}
          activeOpacity={0.8}
        >
          {saving ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.confirmText}>{t('roleSelect.confirmButton')}</Text>
          )}
        </TouchableOpacity>
        <Text style={styles.noteText}>{t('roleSelect.changeRoleNote')}</Text>
      </View>
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