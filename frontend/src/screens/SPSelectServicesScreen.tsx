import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert, ActivityIndicator, TextInput } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../i18n';
import Header from '../components/Header';
import { Service, ServiceCategoryGrid, useServiceCatalog } from '../components/ServiceSelection';
import InfoBanner from '../components/InfoBanner';
import { colors, spacing, radius } from '../theme';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const SPSelectServicesScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { user, updateUser } = useAuth();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();

  const mode: 'edit' | 'onboarding' = (route.params?.mode as any) === 'edit' ? 'edit' : 'onboarding';
  const initialSelected: string[] = Array.isArray(route.params?.initialSelected) ? route.params?.initialSelected : [];
  const onDone: undefined | ((sel: string[]) => void) = route.params?.onDone;

  const [selected, setSelected] = useState<string[]>(initialSelected);
  const [showLimitHint, setShowLimitHint] = useState(false);
  const { services, query, setQuery, filtered } = useServiceCatalog(user?.id, true);

  useEffect(() => {
    setSelected(initialSelected);
  }, [initialSelected.join(',')]);

  const toggleService = (id: string) => {
    setSelected(prev => {
      if (prev.includes(id)) {
        return prev.filter(sid => sid !== id);
      }
      if (prev.length >= 3) {
        setShowLimitHint(true);
        return prev;
      }
      return [...prev, id];
    });
  };

  const handleContinue = async () => {
    if (selected.length === 0) {
      Alert.alert(t('sp.selectServices.selectTitle'), t('sp.selectServices.selectDesc'));
      return;
    }

    if (mode === 'edit' && onDone) {
      onDone(selected);
      navigation.goBack();
      return;
    }

    try {
      await updateUser({ services: selected });
      navigation.navigate('LocationSelect');
    } catch (err: any) {
      Alert.alert('Error', t('sp.selectServices.saveFailed'));
    }
  };

  const hasData = services && services.length > 0;

  const selectedServices = useMemo(() => {
    const list = services || [];
    const map: Record<string, Service> = {};
    list.forEach(s => { map[s.id] = s; });
    return selected.map(id => map[id]).filter(Boolean) as Service[];
  }, [selected, services]);

  // Height of bottom CTA for padding bottom
  const bottomCtaPadding = 120 + insets.bottom; // approx height including chips; adjust as needed

  return (
    <View style={{ flex: 1, backgroundColor: colors.light }}>
      <Header 
        title={t('sp.selectServices.heading')} 
        keepTitleCenterAligned={true} 
        showBackButton={navigation.canGoBack()}
        showNotification={false} 
        extraLargeTitle={mode=== 'onboarding' } />
      <View style={{ height: spacing.sm }} />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: bottomCtaPadding }}
        stickyHeaderIndices={[1]}
      >
        <Text style={styles.subtitle}>{t('sp.selectServices.subheading') || 'You can select multiple services (up to 3)'}</Text>
        
        {/* Sticky search bar */}
        <View style={styles.stickySearchContainer}>
          <View style={styles.searchWrapper}>
            <Ionicons name="search" size={18} color={colors.grey} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder={t('sp.selectServices.searchPlaceholder') || 'Search services...'}
              placeholderTextColor={colors.grey}
              value={query}
              onChangeText={setQuery}
            />
            {query.trim() !== '' && (
              <TouchableOpacity style={styles.resetButton} onPress={() => setQuery('')}>
                <Ionicons name="close-circle" size={18} color={colors.grey} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Loading */}
        {!hasData && (
          <View style={{ padding: spacing.lg, alignItems: 'center' }}>
            <ActivityIndicator />
            <Text style={{ color: colors.grey, marginTop: 8 }}>{t('common.fetchingCurrentLocation') || 'Loading…'}</Text>
          </View>
        )}

        {/* Categories and services grid */}
        {hasData && (
          <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md }}>
            <ServiceCategoryGrid
              servicesByCategory={filtered}
              selectedIds={selected}
              onServicePress={(service) => toggleService(service.id)}
            />

            {Object.keys(filtered).length === 0 && (
              <View style={{ paddingVertical: spacing.xl, alignItems: 'center' }}>
                <Text style={{ color: colors.grey }}>{t('sp.selectServices.noResults') || 'No matching services'}</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Bottom CTA sticky */}
      <View style={[styles.bottomCta, { paddingBottom: insets.bottom + spacing.sm }] }>
        <View style={{ marginBottom: spacing.sm }}>
          {showLimitHint && (
            <InfoBanner
              message={t('sp.selectServices.limitDesc') || 'You can select up to 3 services'}
              autoDismissMs={2500}
              onDismiss={() => setShowLimitHint(false)}
              style={{ marginBottom: spacing.sm }}
            />
          )}
          <View style={styles.selectedChipsRow}>
            {selectedServices.map(svc => (
              <View key={svc.id} style={styles.chip}>
                <Text style={styles.chipText}>{svc.name}</Text>
                <TouchableOpacity onPress={() => toggleService(svc.id)}>
                  <Ionicons name="close" size={14} color={colors.white} style={{ marginLeft: 6 }} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>
        <TouchableOpacity
          style={[styles.continueButton, selected.length === 0 && { opacity: 0.6 } ]}
          onPress={handleContinue}
          disabled={selected.length === 0}
        >
          <Text style={styles.continueText}>{mode === 'edit' ? (t('sp.selectServices.done') || 'Done') : (t('common.continue') || 'Continue')}</Text>
          <Ionicons name="arrow-forward" size={18} color={colors.white} style={{ marginLeft: 8 }} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  // Search
  stickySearchContainer: {
    backgroundColor: colors.white,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.greyLight,
    zIndex: 5,
  },
  searchWrapper: {
    position: 'relative',
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    shadowColor: colors.black,
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  searchIcon: {
    position: 'absolute',
    left: spacing.md,
    top: 14,
  },
  searchInput: {
    paddingHorizontal: spacing.md,
    paddingLeft: spacing.xl * 1.5,
    paddingVertical: spacing.md,
    fontSize: 16,
    color: colors.dark,
  },
  resetButton: {
    position: 'absolute',
    right: spacing.md,
    top: 10,
    padding: 4,
  },

  subtitle: {
    fontSize: 14,
    color: colors.grey,
    marginLeft: spacing.lg,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },

  // Bottom CTA
  bottomCta: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.greyLight,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  selectedChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8 as any,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginRight: 8,
    marginBottom: 8,
  },
  chipText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '600',
  },
  selectionMeta: {
    fontSize: 12,
    color: colors.grey,
  },
  continueButton: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  continueText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default SPSelectServicesScreen;