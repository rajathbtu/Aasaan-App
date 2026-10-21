import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { colors, spacing, radius, shadows } from '../theme';
import Header from '../components/Header';
import ErrorBanner from '../components/ErrorBanner';
import type { Location } from '../components/LocationSearch';
import { Service, ServiceCard, ServiceCategoryGrid, useServiceCatalog } from '../components/ServiceSelection';
import ServicesSearchBar from '../components/ServicesSearchBar';
import { useI18n } from '../i18n';
import { useAuth } from '../contexts/AuthContext';
import { offlineCacheKey, readOfflineCache, writeOfflineCache } from '../utils/offlineCache';

const RECENT_SERVICES_KEY = (userId: string) => `recent_services_${userId}`;
const MAX_RECENT_SERVICES = 3;

const WorkRequestSelectServiceScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { t } = useI18n();

  const userId = useAuth()?.user?.id;
  const { services, query, setQuery, filtered, servicesError, refreshInBackground } = useServiceCatalog(userId);
  const [recentServices, setRecentServices] = useState<Service[]>([]);
  const [savedLocation, setSavedLocation] = useState<Location | null>(null);
  const [savedLocationLoaded, setSavedLocationLoaded] = useState(false);

  useFocusEffect(useCallback(() => {
    let isActive = true;
    setSavedLocationLoaded(false);
    void (async () => {
      const locations = userId
        ? await readOfflineCache<Location[]>(offlineCacheKey('saved-locations', userId))
        : null;
      if (isActive) {
        setSavedLocation(locations?.[0] ?? null);
        setSavedLocationLoaded(true);
      }
    })();
    return () => {
      isActive = false;
    };
  }, [userId]));

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

  const updateRecentServices = async (service: Service) => {
    try {
      const updatedRecent = [service, ...recentServices.filter((s) => s.id !== service.id)].slice(0, MAX_RECENT_SERVICES);
      setRecentServices(updatedRecent);
      if (userId) await writeOfflineCache(RECENT_SERVICES_KEY(userId), updatedRecent);
    } catch {
      // Handle error silently
    }
  };

  const handleServicePress = (service: Service) => {
    updateRecentServices(service);
    const serviceParams = { serviceId: service.id, serviceName: service.name, serviceTags: service.tags || [], mode: 'requestcreation' };
    if (savedLocation && Number.isFinite(savedLocation.lat) && Number.isFinite(savedLocation.lng)) {
      navigation.navigate('WorkRequestSelectTags', { ...serviceParams, selectedLocation: savedLocation });
    } else {
      navigation.navigate('LocationSelect', { ...serviceParams, selectedLocation: savedLocation });
    }
  };

  const openLocationSelection = () => {
    navigation.navigate('LocationSelect', {
      mode: 'requestcreation',
      returnToServiceSelection: true,
      selectedLocation: savedLocation,
    });
  };

  const savedLocationName = savedLocation?.description;
  const hasData = services && services.length > 0;

  const placeholderTexts = [
    t('createRequest.selectService.searchPlaceholder'),
    t('createRequest.selectService.searchPlaceholder1'),
    t('createRequest.selectService.searchPlaceholder2')
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.light }}>
      {/* Top bar */}
      <Header title="aasaanly" showNotification={true} showBackButton={false}
        keepTitleCenterAligned={true}
        titleStyle={[styles.logo]}/>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

          {savedLocationLoaded && (
            <View>
              {savedLocationName ? (
                <View style={styles.locationCard}>
                  <View style={styles.locationIcon}>
                    <Ionicons name="location" size={18} color={colors.primary} />
                  </View>
                  <View style={styles.locationText}>
                    <Text style={styles.locationName} numberOfLines={2}>{savedLocationName}</Text>
                  </View>
                  <TouchableOpacity onPress={openLocationSelection} accessibilityRole="button">
                    <Text style={styles.locationAction}>{t('common.change')}</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                  <TouchableOpacity
                    style={styles.locationPromptButton}
                    onPress={openLocationSelection}
                    accessibilityRole="button">
                    <Ionicons name="add-circle-outline" size={18} color={colors.dark} />
                    <Text style={styles.locationPromptButtonText}>{t('sp.selectLocation.selectLocation')}</Text>
                  </TouchableOpacity>
              )}
            </View>
          )}

          {/* Hero: title + illustration */}
          <View style={styles.heroSection}>
            <View style={styles.heroTextWrap}>
              <Text style={[styles.heroTitle]}>
                Get work done
                <Text style={styles.heroTitleAccent}> aasaanly</Text>
              </Text>
              <Text style={styles.heroSubtitle}>Trusted professionals, at your service</Text>
            </View>
            <Image
              source={require('../../assets/sofa_graphic_banner.png')}
              style={styles.heroArt}
              resizeMode="contain"
            />
          </View>

          {/* Search bar */}
          <View style={styles.searchSection}>
            <ServicesSearchBar
              placeholders={placeholderTexts}
              value={query}
              onChangeText={setQuery}
            />
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
                {recentServices.map((svc) => <ServiceCard key={svc.id} service={svc} onPress={() => handleServicePress(svc)} />)}
              </View>
            </View>
          )}

          {/* All Services */}
          {hasData && (
            <View style={styles.section}>
              {query.trim() === '' && <Text style={styles.sectionTitle}>{t('createRequest.selectService.allServices')}</Text>}
              <ServiceCategoryGrid servicesByCategory={filtered} onServicePress={handleServicePress} />
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
            <View style={styles.trustBanner}>
              <View style={styles.trustIconWrap}>
                <Ionicons name="sparkles-outline" size={26} color={colors.primary} />
              </View>
              <View style={styles.trustTextWrap}>
                <Text style={styles.trustTitle}>Find the right help, aasaanly</Text>
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
  logo: {
    fontSize: 22,
    fontFamily: 'Quicksand-Bold',
    color: colors.primary,
    textTransform: 'lowercase',
  },
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
    fontSize: 24,
    fontFamily: 'Google Sans Flex-Bold',
    color: colors.dark,
  },
  heroTitleAccent: {
    color: colors.primary,
  },
  heroSubtitle: {
    fontSize: 14,
    fontFamily: 'Google Sans Flex',
    color: colors.grey,
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

  // -- Sections --
  scrollContent: {
    paddingBottom: spacing.xl,
  },
  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
  },
  locationIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  locationText: {
    flex: 1,
  },
  locationName: {
    color: colors.dark,
    fontSize: 13,
    fontFamily: 'Google Sans Flex',
  },
  locationAction: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: 12,
    padding: spacing.sm,
  },
  locationPromptButton: {
    alignSelf: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  locationPromptButtonText: {
    color: colors.dark,
    textDecorationLine: 'underline',
    fontSize: 12,
    fontWeight: '700',
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
  gridRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    columnGap: spacing.lg,
  },

  // -- Trust banner --
  trustBanner: {
    ...shadows.md,
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