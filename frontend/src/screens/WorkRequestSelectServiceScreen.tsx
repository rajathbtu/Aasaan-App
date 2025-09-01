import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, LayoutAnimation, Platform, UIManager, ImageBackground } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing, radius, tints } from '../theme';
import Header from '../components/Header';
import { useI18n } from '../i18n';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getServices } from '../api';
import { useAuth } from '../contexts/AuthContext'; // Corrected import

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type Service = { id: string; name: string; category: string; tags?: string[]; icon?: string; color?: string };

const CACHE_KEY = 'services_cache_v1';
const CACHE_UPDATED_AT_KEY = 'services_cache_updatedAt_v1';
const RECENT_SERVICES_KEY = (userId: string) => `recent_services_${userId}`;
const MAX_RECENT_SERVICES = 3;

const WorkRequestSelectServiceScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [query, setQuery] = useState('');
  const { t } = useI18n();

  const [services, setServices] = useState<Service[] | null>(null);
  const [loading, setLoading] = useState(false);
  const userId = useAuth()?.user?.id || 'guest'; // Fetch user ID from Auth or fallback to 'guest'
  const [recentServices, setRecentServices] = useState<Service[]>([]);

  useEffect(() => {
    // Load cached services immediately
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(CACHE_KEY);
        if (raw) {
          const cached: Service[] = JSON.parse(raw);
          setServices(cached);
        }
      } catch { }
      // Always refresh in background
      refreshInBackground();
    })();
  }, []);

  useEffect(() => {
    // Load recently used services for the user
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(RECENT_SERVICES_KEY(userId));
        if (raw) {
          const recent: Service[] = JSON.parse(raw);
          setRecentServices(recent);
        }
      } catch {
        // Handle error silently
      }
    })();
  }, [userId]);

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

  const updateRecentServices = async (service: Service) => {
    try {
      const updatedRecent = [service, ...recentServices.filter((s) => s.id !== service.id)].slice(0, MAX_RECENT_SERVICES);
      setRecentServices(updatedRecent);
      await AsyncStorage.setItem(RECENT_SERVICES_KEY(userId), JSON.stringify(updatedRecent));
    } catch {
      // Handle error silently
    }
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
    return (
      <TouchableOpacity
        key={service.id}
        style={[styles.serviceCard, styles.shadow]}
        onPress={() => {
          updateRecentServices(service);
          navigation.navigate('WorkRequestAddDetails', { serviceId: service.id, serviceName: service.name, serviceTags: service.tags || [] });
        }}
        activeOpacity={0.8}
      >
        <View style={[styles.iconCircle, { backgroundColor: service.color || colors.greyLight }]}>
          <Ionicons name={service.icon as keyof typeof Ionicons.glyphMap || 'construct'} size={22} color={colors.white} />
        </View>
        <Text style={styles.serviceLabel}>{service.name}</Text>
      </TouchableOpacity>
    );
  };

  const hasData = services && services.length > 0;

  const placeholderTexts = [
    t('createRequest.selectService.searchPlaceholder'),
    t('createRequest.selectService.searchPlaceholder1'),
    t('createRequest.selectService.searchPlaceholder2')
  ];
  const [placeholderIndex, setPlaceholderIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIndex((prevIndex) => (prevIndex + 1) % placeholderTexts.length);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: colors.light }}>
      <Header title="Aasaan" showNotification={true} notificationCount={2} showBackButton={false} />
      {/* Spacer to ensure shadow visibility below header */}
      <View style={{ height: spacing.sm }} />
      <ImageBackground
        source={require('../../assets/bckgnd_tile.png')}
        resizeMode="repeat"  // this makes it tile like WhatsApp
        style={{ flex: 1 }}>
          
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: spacing.lg }}>

          <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md }}>
            <Text style={styles.pageTitle}>{t('createRequest.selectService.title')}</Text>
            {/* <Text style={styles.subtitle}>{t('createRequest.selectService.subtitle')}</Text> */}

            {/* Search bar (icon inside input) */}
            <View style={styles.searchWrapper}>
              <Ionicons name="search" size={18} color={colors.grey} style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder={placeholderTexts[placeholderIndex]}
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
          {hasData && query.trim() === '' && recentServices.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('createRequest.selectService.recentlyUsed')}</Text>
              <View style={styles.gridRow}>
                {recentServices.map((svc) => renderServiceCard(svc))}
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
      </ImageBackground>
    </View>
  );
};

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.white,
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
    color: colors.white,
    fontSize: 10,
    fontWeight: '700',
  },
  pageTitle: {
    fontSize: 24, // text-2xl
    fontWeight: '700',
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
    backgroundColor: colors.white,
    borderRadius: radius.md,
    // subtle shadow like shadow-sm
    shadowColor: colors.black,
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
    fontSize: 14, // text-lg
    fontWeight: '500',
    color: colors.grey,
    marginBottom: spacing.md,
    textTransform: 'uppercase',
  },
  categorySection: {
    marginBottom: spacing.lg,
  },
  categoryTitle: {
    fontSize: 16, // text-base
    fontWeight: '700',
    color: colors.dark, // text-gray-800
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
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
    borderWidth: 0.2,
    borderColor: colors.dark,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    backgroundColor: colors.white,
  },
  shadow: {
    shadowColor: colors.black,
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  serviceLabel: {
    fontSize: 14, // text-base-ish
    fontWeight: '500',
    textAlign: 'center',
    color: colors.dark,
  },
});

export default WorkRequestSelectServiceScreen;