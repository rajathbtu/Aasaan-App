import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, LayoutAnimation, Platform, UIManager } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing, radius } from '../theme';
import Header from '../components/Header';
import { useI18n } from '../i18n';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getServices } from '../api';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type Service = { id: string; name: string; category: string; tags?: string[] };

const CACHE_KEY = 'services_cache_v1';
const CACHE_UPDATED_AT_KEY = 'services_cache_updatedAt_v1';

const WorkRequestSelectServiceScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [query, setQuery] = useState('');
  const { t } = useI18n();

  const [services, setServices] = useState<Service[] | null>(null);
  const [loading, setLoading] = useState(false);

  // Predefine a few recently used services.
  const recentIds = ['electrician', 'plumber', 'cook'];

  useEffect(() => {
    // Load cached services immediately
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(CACHE_KEY);
        if (raw) {
          const cached: Service[] = JSON.parse(raw);
          setServices(cached);
        }
      } catch {}
      // Always refresh in background
      refreshInBackground();
    })();
  }, []);

  const refreshInBackground = async () => {
    try {
      setLoading(true);
      const data = await getServices();
      const incoming = data.services as Service[];

      // Compare with current
      const currentJson = JSON.stringify(services || []);
      const incomingJson = JSON.stringify(incoming);
      if (currentJson !== incomingJson) {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setServices(incoming);
        await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(incoming));
        await AsyncStorage.setItem(CACHE_UPDATED_AT_KEY, data.updatedAt);
      } else {
        // Still update updatedAt for staleness tracking
        await AsyncStorage.setItem(CACHE_UPDATED_AT_KEY, data.updatedAt);
      }
    } catch (e) {
      // Keep showing cache on error
    } finally {
      setLoading(false);
    }
  };

  // UI-only: add cardBg to match mock’s tinted tiles
  const serviceIconMap: Record<
    string,
    { icon: keyof typeof Ionicons.glyphMap; color: string; cardBg: string }
  > = {
    maid: { icon: 'construct', color: '#e9d5ff', cardBg: '#f5f3ff' },
    cook: { icon: 'restaurant', color: '#dcfce7', cardBg: '#f0fdf4' },
    babysitter: { icon: 'person', color: '#fde68a', cardBg: '#fffbeb' },
    cleaner: { icon: 'sparkles', color: '#bae6fd', cardBg: '#e0f2fe' },
    servant: { icon: 'people', color: '#ddd6fe', cardBg: '#ede9fe' },
    carCleaner: { icon: 'car', color: '#fecaca', cardBg: '#fee2e2' },
    electrician: { icon: 'flash', color: '#dbeafe', cardBg: '#eff6ff' },
    plumber: { icon: 'water', color: '#bae6fd', cardBg: '#e0f2fe' }, // blue-ish per mock
    carpenter: { icon: 'hammer', color: '#fde68a', cardBg: '#fffbeb' },
    painter: { icon: 'color-palette', color: '#fecaca', cardBg: '#fee2e2' },
    acRepair: { icon: 'snow', color: '#bae6fd', cardBg: '#e0f2fe' },
    pestControl: { icon: 'bug', color: '#fed7aa', cardBg: '#ffedd5' },
    photographer: { icon: 'camera', color: '#ddd6fe', cardBg: '#f3e8ff' },
    yogaTrainer: { icon: 'heart', color: '#bbf7d0', cardBg: '#ecfdf5' },
    tutor: { icon: 'book', color: '#e0e7ff', cardBg: '#eef2ff' },
    dietician: { icon: 'leaf', color: '#d9f99d', cardBg: '#ecfccb' },
    makeupArtist: { icon: 'brush', color: '#f5d0fe', cardBg: '#fae8ff' },
    eventPlanner: { icon: 'calendar', color: '#fde68a', cardBg: '#fef9c3' },
    gardener: { icon: 'flower', color: '#bbf7d0', cardBg: '#ecfdf5' },
    caterer: { icon: 'fast-food', color: '#feeaa3', cardBg: '#fef3c7' },
    interiorDesigner: { icon: 'home', color: '#e0e7ff', cardBg: '#eef2ff' },
    // extras
    geyserRepair: { icon: 'flame', color: '#fde68a', cardBg: '#fffbeb' },
    washingMachineRepair: { icon: 'refresh-circle', color: '#bae6fd', cardBg: '#e0f2fe' },
    refrigeratorRepair: { icon: 'snow', color: '#dbeafe', cardBg: '#eff6ff' },
    microwaveRepair: { icon: 'flash', color: '#fee2e2', cardBg: '#fef2f2' },
    waterPurifier: { icon: 'water', color: '#bae6fd', cardBg: '#e0f2fe' },
    cctv: { icon: 'videocam', color: '#e9d5ff', cardBg: '#f5f3ff' },
    chimneyCleaning: { icon: 'flame', color: '#fed7aa', cardBg: '#ffedd5' },
    laptopRepair: { icon: 'laptop', color: '#e0e7ff', cardBg: '#eef2ff' },
    mobileRepair: { icon: 'phone-portrait', color: '#e0e7ff', cardBg: '#eef2ff' },
    sofaCleaning: { icon: 'construct', color: '#e9d5ff', cardBg: '#f5f3ff' },
    carpetCleaning: { icon: 'sparkles', color: '#d1fae5', cardBg: '#ecfdf5' },
    packersMovers: { icon: 'cube', color: '#e0e7ff', cardBg: '#eef2ff' },
    salonAtHome: { icon: 'cut', color: '#fbcfe8', cardBg: '#fce7f3' },
  };

  const grouped = useMemo(() => {
    const list = services || [];
    const map: Record<string, Service[]> = {};
    list.forEach((s) => {
      if (!map[s.category]) map[s.category] = [];
      map[s.category].push(s);
    });
    return map;
  }, [services]);

  const filtered = useMemo(() => {
    if (!query.trim()) return grouped;
    const lower = query.trim().toLowerCase();
    const map: Record<string, Service[]> = {};
    Object.keys(grouped).forEach((cat) => {
      const list = grouped[cat].filter((s) => s.name.toLowerCase().includes(lower));
      if (list.length > 0) map[cat] = list;
    });
    return map;
  }, [query, grouped]);

  const renderServiceCard = (service: Service) => {
    const iconConfig = serviceIconMap[service.id] || { icon: 'construct', color: '#e5e7eb', cardBg: '#f3f4f6' } as any;
    return (
      <TouchableOpacity
        key={service.id}
        style={[styles.serviceCard, { backgroundColor: iconConfig.cardBg }]}
        onPress={() => navigation.navigate('WorkRequestAddDetails', { serviceId: service.id, serviceName: service.name, serviceTags: service.tags || [] })}
        activeOpacity={0.8}
      >
        <View style={[styles.iconCircle, { backgroundColor: iconConfig.color }]}>
          <Ionicons name={iconConfig.icon} size={22} color={colors.primary} />
        </View>
        <Text style={styles.serviceLabel}>{service.name}</Text>
      </TouchableOpacity>
    );
  };

  const hasData = services && services.length > 0;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.light }} contentContainerStyle={{ paddingBottom: spacing.lg }}>
      {/* Header */}
      <Header title="Aasaan" showNotification={true} notificationCount={2} showBackButton={false} />

      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md }}>
        <Text style={styles.pageTitle}>{t('createRequest.selectService.title')}</Text>
        <Text style={styles.subtitle}>{t('createRequest.selectService.subtitle')}</Text>

        {/* Search bar (icon inside input) */}
        <View style={styles.searchWrapper}>
          <Ionicons name="search" size={18} color={colors.grey} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder={t('createRequest.selectService.searchPlaceholder')}
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

      {!hasData && (
        <View style={{ padding: spacing.lg, alignItems: 'center' }}>
          <ActivityIndicator />
          <Text style={{ color: colors.grey, marginTop: 8 }}>Loading services…</Text>
        </View>
      )}

      {/* Recently Used */}
      {hasData && query.trim() === '' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('createRequest.selectService.recentlyUsed')}</Text>
          <View style={styles.gridRow}>
            {recentIds.map((id) => {
              const svc = (services || []).find((s) => s.id === id);
              return svc ? renderServiceCard(svc) : null;
            })}
          </View>
        </View>
      )}

      {/* All Services */}
      {hasData && (
        <View style={styles.section}>
            {query.trim() === '' && (
            <Text style={styles.sectionTitle}>{t('createRequest.selectService.allServices')}</Text>
            )}
          {Object.keys(filtered).map((category) => (
            <View key={category} style={styles.categorySection}>
              <Text style={styles.categoryTitle}>{category}</Text>
              <View style={styles.gridRow}>{filtered[category].map((svc) => renderServiceCard(svc))}</View>
            </View>
          ))}
        </View>
      )}

      {hasData && Object.keys(filtered).length === 0 && (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.lg }}>
          <Text style={{ color: colors.grey, fontSize: 16 }}>{t('No matching service found')}</Text>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: colors.greyLight,
  },
  appTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.dark, // mock uses dark title
  },
  notificationButton: {
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: colors.error,
    borderRadius: 8,
    height: 16,
    minWidth: 16,
    paddingHorizontal: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  pageTitle: {
    fontSize: 24, // text-2xl
    fontWeight: '800',
    color: colors.dark,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16, // text-base
    color: colors.grey,
    marginBottom: spacing.lg,
  },

  // Search
  searchWrapper: {
    position: 'relative',
    borderWidth: 2,
    borderColor: colors.primary, // approx primary/30 look
    backgroundColor: '#fff',
    borderRadius: radius.md,
    // subtle shadow like shadow-sm
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
    marginBottom: spacing.lg,
  },
  searchIcon: {
    position: 'absolute',
    left: spacing.md,
    top: 14,
  },
  searchInput: {
    paddingHorizontal: spacing.md,
    paddingLeft: spacing.xl * 1.5, // Adjusted padding to ensure proper spacing
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

  section: {
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  sectionTitle: {
    fontSize: 18, // text-lg
    fontWeight: '700',
    color: colors.dark,
    marginBottom: spacing.md,
  },
  categorySection: {
    marginBottom: spacing.lg,
  },
  categoryTitle: {
    fontSize: 16, // text-base
    fontWeight: '700',
    color: '#374151', // text-gray-800
    marginBottom: spacing.sm,
  },

  // 3-column grid with tidy gaps
  gridRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },

  // Card-style tiles per mock
  serviceCard: {
    width: '31%',
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.greyLight,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    // subtle shadow like hover/border emphasis
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  serviceLabel: {
    fontSize: 14, // text-base-ish
    fontWeight: '500',
    textAlign: 'center',
    color: colors.dark,
  },
});

export default WorkRequestSelectServiceScreen;