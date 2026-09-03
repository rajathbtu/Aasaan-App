import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing, radius } from '../theme';
import Header from '../components/Header';
import ErrorBanner from '../components/ErrorBanner';
import ServiceIcon from '../components/ServiceIcon';
import { useI18n } from '../i18n';
import { getServices } from '../api';
import { useAuth } from '../contexts/AuthContext';
import { offlineCacheKey, readOfflineCache, writeOfflineCache } from '../utils/offlineCache';

type Service = { id: string; name: string; category: string; alias?: string[]; tags?: string[]; icon?: string; color?: string };

const RECENT_SERVICES_KEY = (userId: string) => `recent_services_${userId}`;
const MAX_RECENT_SERVICES = 3;

const WorkRequestSelectServiceScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [query, setQuery] = useState('');
  const { t } = useI18n();

  const [services, setServices] = useState<Service[] | null>(null);
  const userId = useAuth()?.user?.id;
  const servicesCacheKey = userId ? offlineCacheKey('services', userId) : null;
  const [recentServices, setRecentServices] = useState<Service[]>([]);
  const [servicesError, setServicesError] = useState<unknown | null>(null);

  useEffect(() => {
    // Load cached services immediately
    (async () => {
      try {
        if (servicesCacheKey) {
          const cached = await readOfflineCache<Service[]>(servicesCacheKey);
          if (cached) setServices(cached);
        }
      } catch { }
      // Always refresh in background
      refreshInBackground();
    })();
  }, [servicesCacheKey]);

  useEffect(() => {
    // Load recently used services for the user
    (async () => {
      try {
        if (userId) {
          const recent = await readOfflineCache<Service[]>(RECENT_SERVICES_KEY(userId));
          if (recent) setRecentServices(recent);
        }
      } catch {
        // Handle error silently
      }
    })();
  }, [userId]);

  const refreshInBackground = async () => {
    try {
      const data = await getServices();
      const incoming = data.services as Service[];

      setServices(incoming);
      setServicesError(null);
      if (servicesCacheKey) await writeOfflineCache(servicesCacheKey, incoming);
    } catch (error) {
      // Keep showing cache on error
      setServicesError(error);
    }
  };

  const updateRecentServices = async (service: Service) => {
    try {
      const updatedRecent = [service, ...recentServices.filter((s) => s.id !== service.id)].slice(0, MAX_RECENT_SERVICES);
      setRecentServices(updatedRecent);
      if (userId) await writeOfflineCache(RECENT_SERVICES_KEY(userId), updatedRecent);
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
    const matchesQuery = (s: Service) =>
      s.name.toLowerCase().includes(lower) ||
      (Array.isArray(s.alias) && s.alias.some((alias) => alias.toLowerCase().includes(lower))) ||
      (Array.isArray(s.tags) && s.tags.some((tag) => tag.toLowerCase().includes(lower)));
    const map: Record<string, Service[]> = {};
    Object.keys(grouped).forEach((cat) => {
      const list = grouped[cat].filter(matchesQuery);
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
          navigation.navigate('LocationSelect', { serviceId: service.id, serviceName: service.name, serviceTags: service.tags || [], mode: 'requestcreation', });
        }}
        activeOpacity={0.7}
      >
        <ServiceIcon
          icon={service.icon}
          color={service.color}
          circleSize={72}
          iconSize={34}
        />
        <Text style={styles.serviceLabel} numberOfLines={2}>{service.name}</Text>
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
      {/* Top bar */}
      <Header title="Aasaan" showNotification={true} showBackButton={false} />

        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

          {/* Hero: title + illustration */}
          <View style={styles.heroSection}>
            <View style={styles.heroTextWrap}>
              <Text style={styles.heroTitle}>
                Get your work{'\n'}
                <Text style={styles.heroTitleAccent}>done, easily.</Text>
              </Text>
              <Text style={styles.heroSubtitle}>Trusted professionals, at your service</Text>
            </View>
            <Image
              source={require('../../assets/sofa_graphic_banner.png')}
              style={styles.heroArt}
              resizeMode="contain"
            />
          </View>

          {/* Search bar (icon inside input) */}
          <View style={styles.searchSection}>
            <View style={[styles.searchWrapper, styles.shadow]}>
              <Ionicons name="search" size={20} color={colors.greyMuted} style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder={placeholderTexts[placeholderIndex]}
                placeholderTextColor={colors.greyMuted}
                value={query}
                onChangeText={setQuery}
              />
              {query.trim() !== '' && (
                <TouchableOpacity style={styles.resetButton} hitSlop={10} onPress={() => setQuery('')} >
                  <Ionicons name="close-circle" size={20} color={colors.greyMuted} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {!hasData && (
            <View style={styles.loadingState}>
              <ActivityIndicator color={colors.primary} />
              <Text style={styles.loadingText}>Loading services...</Text>
            </View>
          )}

          {/* Recently Used */}
          {hasData && query.trim() === '' && recentServices.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { marginBottom: spacing.lg }]}>
                {t('createRequest.selectService.recentlyUsed')}
              </Text>
              <View style={styles.gridRow}>
                {recentServices.map((svc) => renderServiceCard(svc))}
              </View>
            </View>
          )}

          {/* All Services */}
          {hasData && (
            <View style={styles.section}>
              {query.trim() === '' && <Text style={styles.sectionTitle}>{t('createRequest.selectService.allServices')}</Text>}
              {Object.keys(filtered).map((category) => (
                <View key={category} style={styles.categorySection}>
                  <View style={styles.categoryHeading}>
                    <View style={styles.categoryMarker} />
                    <Text style={styles.categoryTitle}>{category}</Text>
                  </View>
                  <View style={styles.gridRow}>{filtered[category].map((svc) => renderServiceCard(svc))}</View>
                </View>
              ))}
            </View>
          )}

          {hasData && Object.keys(filtered).length === 0 && (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Ionicons name="search-outline" size={24} color={colors.primary} />
              </View>
              <Text style={styles.emptyText}>{t('No matching service found')}</Text>
            </View>
          )}

          {/* Trust banner */}
          {hasData && query.trim() === '' && (
            <View style={[styles.trustBanner, styles.shadow]}>
              <View style={styles.trustIconWrap}>
                <Ionicons name="sparkles-outline" size={26} color={colors.primary} />
              </View>
              <View style={styles.trustTextWrap}>
                <Text style={styles.trustTitle}>Find the right help, easily</Text>
                <Text style={styles.trustSubtitle}>Explore services & choose what works for you</Text>
              </View>
            </View>
          )}

        </ScrollView>
      <ErrorBanner error={servicesError} onRetry={refreshInBackground} />
    </View>
  );
};

const styles = StyleSheet.create({
  // -- Hero --
  heroSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    marginBottom: spacing.md,
  },
  heroTextWrap: {
    flex: 1,
    paddingRight: spacing.xs,
  },
  heroTitle: {
    fontSize: 30,
    lineHeight: 38,
    fontWeight: '800',
    color: colors.dark,
  },
  heroTitleAccent: {
    color: colors.primary,
  },
  heroSubtitle: {
    fontSize: 14,
    color: colors.grey,
    marginTop: spacing.sm,
  },
  heroArt: {
    width: 132,
    height: 120,
  },

  // -- Search --
  searchSection: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  searchWrapper: {
    position: 'relative',
    backgroundColor: colors.white,
    borderRadius: radius.xl,
  },
  searchIcon: {
    position: 'absolute',
    left: spacing.md,
    top: 12,
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

  // -- Sections --
  scrollContent: {
    paddingBottom: spacing.xl,
  },
  section: {
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: spacing.lg,
    textTransform: 'uppercase',
  },
  categorySection: {
    marginBottom: spacing.xl,
  },
  categoryHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  categoryMarker: {
    width: 4,
    height: 18,
    borderRadius: 2,
    backgroundColor: colors.primary,
    marginRight: spacing.sm,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.dark,
  },

  gridRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    columnGap: spacing.lg,
  },

  serviceCard: {
    width: '30%',
    marginBottom: 10,
    borderRadius: 18,
    paddingHorizontal: spacing.xs,
    paddingTop: 12,
    paddingBottom: 8,
    alignItems: 'center',
    justifyContent: 'flex-start',
    backgroundColor: colors.white,
  },
  shadow: {
    shadowColor: colors.black,
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  serviceLabel: {
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '600',
    letterSpacing: 0.1,
    textAlign: 'center',
    color: colors.dark,
    minHeight: 36,
  },

  // -- Trust banner --
  trustBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: radius.xl,
    padding: spacing.lg,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.xl,
  },
  trustIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.lg,
  },
  trustTextWrap: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  trustTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.dark,
  },
  trustSubtitle: {
    fontSize: 13,
    color: colors.grey,
    marginTop: 2,
  },

  // -- States --
  loadingState: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  loadingText: {
    color: colors.grey,
    marginTop: spacing.sm,
    fontSize: 14,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryLight,
    marginBottom: spacing.md,
  },
  emptyText: {
    color: colors.grey,
    fontSize: 15,
  },
});

export default WorkRequestSelectServiceScreen;