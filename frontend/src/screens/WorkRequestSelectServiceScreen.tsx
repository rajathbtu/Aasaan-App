import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, ImageBackground } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing, radius } from '../theme';
import Header from '../components/Header';
import { useI18n } from '../i18n';
import { getServices } from '../api';
import { useAuth } from '../contexts/AuthContext'; // Corrected import
import { offlineCacheKey, readOfflineCache, writeOfflineCache } from '../utils/offlineCache';

type Service = { id: string; name: string; category: string; tags?: string[]; icon?: string; color?: string };

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
      if (servicesCacheKey) await writeOfflineCache(servicesCacheKey, incoming);
    } catch {
      // Keep showing cache on error
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
          navigation.navigate('LocationSelect', { serviceId: service.id, serviceName: service.name, serviceTags: service.tags || [], mode: 'requestcreation', });
        }}
        activeOpacity={0.8}
      >
        <View style={[styles.iconCircle, { backgroundColor: service.color || colors.greyLight }]}>
          <Ionicons name={service.icon as keyof typeof Ionicons.glyphMap || 'construct'} size={22} color={colors.violet} />
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
      <View style={{ height: spacing.xs }} />
      <ImageBackground
        source={require('../../assets/bckgnd_tile.png')}
        resizeMode="repeat"  // this makes it tile like WhatsApp
        style={{ flex: 1 }}>
          
        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent}>

          <View style={styles.introSection}>
            <Text style={styles.pageTitle}>{t('createRequest.selectService.title')}</Text>

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
            <View style={styles.loadingState}>
              <ActivityIndicator color={colors.primary} />
              <Text style={styles.loadingText}>Loading services...</Text>
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

        </ScrollView>
      </ImageBackground>
    </View>
  );
};

const styles = StyleSheet.create({
  pageTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.dark,
    marginBottom: spacing.sm,
  },
  scrollContent: {
    paddingBottom: spacing.xl,
  },
  introSection: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  searchWrapper: {
    position: 'relative',
    borderWidth: 1,
    borderColor: colors.greyBorder,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    shadowColor: colors.black,
    shadowOpacity: 0.07,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
    marginBottom: spacing.md,
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
    justifyContent: 'space-between',
  },

  serviceCard: {
    width: '31%',
    minHeight: 90,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.greyLight,
    borderRadius: radius.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    backgroundColor: colors.white,
  },
  shadow: {
    shadowColor: colors.black,
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  serviceLabel: {
    fontSize: 14,
    lineHeight: 17,
    fontWeight: '600',
    textAlign: 'center',
    color: colors.dark,
  },
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