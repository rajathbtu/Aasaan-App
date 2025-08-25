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

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type Service = { id: string; name: string; category: string; tags?: string[] };
const CACHE_KEY = 'services_cache_v1';
const CACHE_UPDATED_AT_KEY = 'services_cache_updatedAt_v1';

// Reuse the same icon mapping approach used in WorkRequestSelectServiceScreen for visual consistency
const serviceIconMap: Record<string, { icon: any; color: string; cardBg: string }> = {
  maid: { icon: 'construct', color: tints.purple, cardBg: tints.purpleSoft },
  cook: { icon: 'restaurant', color: tints.emeraldSoft, cardBg: tints.greenSoft },
  babysitter: { icon: 'person', color: tints.amber, cardBg: tints.amberSoft },
  cleaner: { icon: 'sparkles', color: tints.sky, cardBg: tints.skySoft },
  servant: { icon: 'people', color: tints.purple, cardBg: tints.indigoSoft },
  carCleaner: { icon: 'car', color: tints.rose, cardBg: tints.roseSoft },
  electrician: { icon: 'flash', color: tints.blue, cardBg: tints.blueSoft },
  plumber: { icon: 'water', color: tints.sky, cardBg: tints.skySoft },
  carpenter: { icon: 'hammer', color: tints.amber, cardBg: tints.amberSoft },
  painter: { icon: 'color-palette', color: tints.rose, cardBg: tints.roseSoft },
  acRepair: { icon: 'snow', color: tints.sky, cardBg: tints.skySoft },
  pestControl: { icon: 'bug', color: tints.orange, cardBg: tints.orangeSoft },
  photographer: { icon: 'camera', color: tints.purple, cardBg: tints.purpleSoft },
  yogaTrainer: { icon: 'heart', color: tints.green, cardBg: tints.greenSoft },
  tutor: { icon: 'book', color: tints.indigo, cardBg: tints.indigoSoft },
  dietician: { icon: 'leaf', color: tints.lime, cardBg: tints.limeSoft },
  makeupArtist: { icon: 'brush', color: tints.purple, cardBg: tints.purpleSoft },
  eventPlanner: { icon: 'calendar', color: tints.amber, cardBg: tints.amberPale },
  gardener: { icon: 'flower', color: tints.green, cardBg: tints.greenSoft },
  caterer: { icon: 'fast-food', color: tints.amber, cardBg: tints.amberSoft },
  interiorDesigner: { icon: 'home', color: tints.indigo, cardBg: tints.indigoSoft },
  geyserRepair: { icon: 'flame', color: tints.amber, cardBg: tints.amberSoft },
  washingMachineRepair: { icon: 'refresh-circle', color: tints.sky, cardBg: tints.skySoft },
  refrigeratorRepair: { icon: 'snow', color: tints.blue, cardBg: tints.blueSoft },
  microwaveRepair: { icon: 'flash', color: tints.roseSoft, cardBg: tints.redSoft },
  waterPurifier: { icon: 'water', color: tints.sky, cardBg: tints.skySoft },
  cctv: { icon: 'videocam', color: tints.purple, cardBg: tints.purpleSoft },
  chimneyCleaning: { icon: 'flame', color: tints.orange, cardBg: tints.orangeSoft },
  laptopRepair: { icon: 'laptop', color: tints.indigo, cardBg: tints.indigoSoft },
  mobileRepair: { icon: 'phone-portrait', color: tints.indigo, cardBg: tints.indigoSoft },
  sofaCleaning: { icon: 'construct', color: tints.purple, cardBg: tints.purpleSoft },
  carpetCleaning: { icon: 'sparkles', color: tints.greenSoft, cardBg: tints.greenSoft },
  packersMovers: { icon: 'cube', color: tints.indigo, cardBg: tints.indigoSoft },
  salonAtHome: { icon: 'cut', color: tints.pink, cardBg: tints.pinkSoft },
};

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
    setSelected(prev => {
      if (prev.includes(id)) {
        return prev.filter(sid => sid !== id);
      }
      if (prev.length >= 3) {
        Alert.alert(t('sp.selectServices.limitTitle'), t('sp.selectServices.limitDesc'));
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
      navigation.navigate('SPSelectLocation');
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
                    const iconConfig = serviceIconMap[service.id] || { icon: 'construct', color: colors.greyLight, cardBg: colors.white } as any;
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
                          <Ionicons name={iconConfig.icon} size={22} color={colors.primary} />
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