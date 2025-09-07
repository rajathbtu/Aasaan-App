import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert, ActivityIndicator, LayoutAnimation, Platform, UIManager, TextInput } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../i18n';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getServices } from '../api';
import Header from '../components/Header';
import { colors, spacing, radius, tints } from '../theme';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { trackScreenView, trackServiceProviderOnboarding, trackCustomEvent } from '../utils/analytics';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type Service = {
  id: string;
  name: string;
  category: string;
  tags?: string[];
  icon?: string;
  color?: string;
};
const CACHE_KEY = 'services_cache_v1';
const CACHE_UPDATED_AT_KEY = 'services_cache_updatedAt_v1';

const SPSelectServicesScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { updateUser } = useAuth();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();

  const mode: 'edit' | 'onboarding' = (route.params?.mode as any) === 'edit' ? 'edit' : 'onboarding';
  const initialSelected: string[] = Array.isArray(route.params?.initialSelected) ? route.params?.initialSelected : [];
  const onDone: undefined | ((sel: string[]) => void) = route.params?.onDone;

  const [selected, setSelected] = useState<string[]>(initialSelected);
  const [services, setServices] = useState<Service[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');

  // Track screen view on mount
  useEffect(() => {
    trackScreenView('SPSelectServicesScreen', 'ServiceProviderOnboarding');
    
    trackCustomEvent('sp_onboarding_step', {
      step: 'select_services',
      mode: mode,
      initial_services_count: initialSelected.length
    });
  }, [mode, initialSelected.length]);

  useEffect(() => {
    setSelected(initialSelected);
  }, [initialSelected.join(',')]);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(CACHE_KEY);
        if (raw) setServices(JSON.parse(raw));
      } catch {}
      refreshInBackground();
    })();
  }, []);

  const refreshInBackground = async () => {
    try {
      setLoading(true);
      const data = await getServices();
      const incoming = data.services as Service[];
      const cur = JSON.stringify(services || []);
      const inc = JSON.stringify(incoming);
      if (cur !== inc) {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setServices(incoming);
        await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(incoming));
        if (data.updatedAt) await AsyncStorage.setItem(CACHE_UPDATED_AT_KEY, data.updatedAt);
      } else {
        if (data.updatedAt) await AsyncStorage.setItem(CACHE_UPDATED_AT_KEY, data.updatedAt);
      }
    } catch (e) {
      // ignore and keep cache
    } finally {
      setLoading(false);
    }
  };

  const grouped = useMemo(() => {
    const list = services || [];
    const map: Record<string, Service[]> = {};
    list.forEach(s => { if (!map[s.category]) map[s.category] = []; map[s.category].push(s); });
    return map;
  }, [services]);

  const filtered = useMemo(() => {
    const list: Record<string, Service[]> = grouped;
    if (!query.trim()) return list;
    const lower = query.trim().toLowerCase();
    const map: Record<string, Service[]> = {};
    Object.keys(list).forEach(cat => {
      const arr = list[cat].filter(s => s.name.toLowerCase().includes(lower));
      if (arr.length) map[cat] = arr;
    });
    return map;
  }, [grouped, query]);

  const toggleService = (id: string) => {
    const service = services?.find(s => s.id === id);
    const isAdding = !selected.includes(id);
    
    // Track service selection
    trackCustomEvent('sp_service_toggle', {
      service_id: id,
      service_name: service?.name || 'unknown',
      action: isAdding ? 'added' : 'removed',
      total_selected: isAdding ? selected.length + 1 : selected.length - 1,
      mode: mode
    });
    
    setSelected(prev => {
      if (prev.includes(id)) {
        return prev.filter(sid => sid !== id);
      }
      if (prev.length >= 3) {
        // Track service limit reached
        trackCustomEvent('sp_service_limit_reached', {
          attempted_service_id: id,
          current_count: prev.length,
          max_limit: 3
        });
        
        Alert.alert(t('sp.selectServices.limitTitle'), t('sp.selectServices.limitDesc'));
        return prev;
      }
      return [...prev, id];
    });
  };

  const handleContinue = async () => {
    if (selected.length === 0) {
      // Track validation failure
      trackCustomEvent('sp_services_validation_failed', {
        reason: 'no_services_selected',
        mode: mode
      });
      
      Alert.alert(t('sp.selectServices.selectTitle'), t('sp.selectServices.selectDesc'));
      return;
    }

    // Track service selection completion
    const selectedServiceNames = services?.filter(s => selected.includes(s.id)).map(s => s.name) || [];
    trackCustomEvent('sp_services_selected', {
      selected_services: selected,
      service_names: selectedServiceNames,
      services_count: selected.length,
      mode: mode
    });

    if (mode === 'edit' && onDone) {
      onDone(selected);
      navigation.goBack();
      return;
    }

    try {
      await updateUser({ services: selected });
      
      // Track successful service update
      trackCustomEvent('sp_services_updated', {
        selected_services: selected,
        services_count: selected.length
      });
      
      navigation.navigate('SPSelectLocation');
    } catch (err: any) {
      // Track service update failure
      trackCustomEvent('sp_services_update_failed', {
        selected_services: selected,
        error: err?.message || 'unknown'
      });
      
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
      <Header title={mode === 'onboarding' ? t('sp.selectServices.stepLabel') || 'Step 1 of 2' : t('sp.selectServices.title')} showBackButton={true} showNotification={false} />
      <View style={{ height: spacing.sm }} />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: bottomCtaPadding }}
        stickyHeaderIndices={[1]}
      >
        {/* Main heading */}
        <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm, backgroundColor: colors.white }}>
          {mode === 'onboarding' && (
            <Text style={styles.stepText}>{t('sp.selectServices.stepLabel') || 'Step 1 of 2'}</Text>
          )}
          <Text style={styles.pageTitle}>{t('sp.selectServices.heading') || 'Select services you offer'}</Text>
          <Text style={styles.subtitle}>{t('sp.selectServices.subheading') || 'You can select multiple services (up to 3)'}</Text>
        </View>

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
            {Object.keys(filtered).map(category => (
              <View key={category} style={styles.categorySection}>
                <Text style={styles.categoryTitle}>{category}</Text>
                <View style={styles.gridRow}>
                  {filtered[category].map(service => {
                    const isSelected = selected.includes(service.id);
                    const iconConfig = {
                      icon: service.icon || 'construct',
                      color: service.color || colors.greyLight,
                      cardBg: colors.white,
                    };
                    return (
                      <TouchableOpacity
                        key={service.id}
                        style={[
                          styles.serviceCard,
                          isSelected && styles.serviceCardSelected,
                          isSelected && { borderColor: colors.primary },
                        ]}
                        onPress={() => toggleService(service.id)}
                        activeOpacity={0.85}
                      >
                        {isSelected && (
                          <View style={styles.checkBadge}>
                            <Ionicons name="checkmark" size={12} color={colors.white} />
                          </View>
                        )}
                        <View style={[styles.iconCircle, { backgroundColor: iconConfig.color }]}>
                          <Ionicons name={(iconConfig.icon as keyof typeof Ionicons.glyphMap) || 'construct'} size={22} color={colors.primary} />
                        </View>
                        <Text style={[styles.serviceName, isSelected && styles.serviceNameSelected]}>{service.name}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ))}

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
          <Text style={styles.selectionMeta}>{`${selected.length} of 3 services selected`}</Text>
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
  container: {
    flex: 1,
    backgroundColor: colors.light,
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
    color: colors.dark,
    textAlign: 'center',
  },
  categorySection: {
    marginBottom: 20,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
    color: colors.dark,
  },
  gridRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  serviceCard: {
    width: '31%',
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.greyBorder,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.white,
    alignItems: 'center',
    shadowColor: colors.black,
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  serviceCardSelected: {
    borderWidth: 2,
    shadowOpacity: 0.12,
    elevation: 2,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  serviceName: {
    fontSize: 14,
    color: colors.dark,
    textAlign: 'center',
  },
  serviceNameSelected: {
    color: colors.primary,
    fontWeight: '700',
  },
  checkBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: colors.primary,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    shadowColor: colors.black,
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
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

  // Page titles
  stepText: {
    color: colors.primary,
    fontWeight: '700',
    marginBottom: 2,
  },
  pageTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.dark,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: colors.grey,
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
    marginTop: spacing.sm,
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