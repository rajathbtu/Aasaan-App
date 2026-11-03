import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing } from '../theme';
import { consumerColors, consumerFonts } from '../theme';
import ErrorBanner from '../components/ErrorBanner';
import type { Location } from '../components/LocationSearch';
import { Service, useServiceCatalog } from '../components/ServiceSelection';
import ServicesSearchBar from '../components/ServicesSearchBar';
import { useI18n } from '../i18n';
import { useAuth } from '../contexts/AuthContext';
import { useNotificationCount } from '../contexts/NotificationCountContext';
import { offlineCacheKey, readOfflineCache, writeOfflineCache } from '../utils/offlineCache';
import { locationManager } from '../services/LocationManager';
import { reverseGeocode } from '../services/googlePlacesApi';
import useScrolledPastBoundary from '../hooks/useScrolledPastBoundary';
import { BrandWord } from '../components/BrandWord';
import { HomeHeroIllustration } from '../assets/images';
import SvgIcon from '../assets/icons';

/**
 * Service selection (Create tab) — implemented from the
 * Work_Request_Selection_Handoff design: location header with notification
 * bell, "Get work done with aasaanly" hero, search bar (sticky under the
 * header once scrolled past), category chips, Recently Used and the grouped
 * All Services grid.
 *
 * The service list is the shared catalog (same source as the
 * service-provider flow), and the service cards reuse the exact
 * SPSelectServicesScreen card spec: fixed three-per-row dimensions,
 * single-green ss-* icons without a circular background and the same
 * bordered white container. Typography stays on the app's standard scale
 * and labels wrap instead of truncating.
 */

const RECENT_SERVICES_KEY = (userId: string) => `recent_services_${userId}`;
const MAX_RECENT_SERVICES = 4;

/* Icon + card tokens copied from SPSelectServicesScreen so both flows
   render service cards identically. */
const SS = {
  green: '#079B5C',
  cardBorder: '#E3E8E5',
  serviceName: '#101714',
} as const;

/* Real catalogue service ids → handoff SVG icons (SPSelectServicesScreen map). */
const SERVICE_ICON_MAP: Record<string, string> = {
  ac_service_repair: 'ss-ac',
  chimney_hob: 'ss-chimney',
  gas_stove_hob: 'ss-flame',
  geyser_service: 'ss-geyser',
  inverter_ups: 'ss-battery',
  microwave_oven: 'ss-microwave',
  refrigerator_service: 'ss-fridge',
  ro_water_purifier: 'ss-water',
  tv_home_entertainment: 'ss-tv',
  makeup_artist: 'ss-brush',
  massage_spa: 'ss-spa',
  mehendi_artist: 'ss-flower',
  salon_beautician_at_home: 'ss-scissors',
  home_cleaning: 'ss-cleaning',
  specialized_cleaning: 'ss-cleaning',
  floor_surface_cleaning: 'ss-cleaning',
  pest_control: 'ss-cleaning',
  water_tank_cleaning: 'ss-cleaning',
};

const getServiceIcon = (service: Service): string | null => {
  const mapped = SERVICE_ICON_MAP[service.id];
  if (mapped) return mapped;
  const name = (service.name || '').toLowerCase();
  if (name.includes('air condition') || /\bac\b/.test(name)) return 'ss-ac';
  if (name.includes('chimney') || name.includes('hob')) return 'ss-chimney';
  if (name.includes('gas') || name.includes('stove') || name.includes('flame')) return 'ss-flame';
  if (name.includes('geyser')) return 'ss-geyser';
  if (name.includes('inverter') || name.includes('ups')) return 'ss-battery';
  if (name.includes('microwave') || name.includes('oven')) return 'ss-microwave';
  if (name.includes('refrigerator') || name.includes('fridge')) return 'ss-fridge';
  if (name.includes('purifier') || name.includes('water')) return 'ss-water';
  if (name.includes('tv') || name.includes('television') || name.includes('entertainment')) return 'ss-tv';
  if (name.includes('makeup')) return 'ss-brush';
  if (name.includes('massage') || name.includes('spa')) return 'ss-spa';
  if (name.includes('mehendi')) return 'ss-flower';
  if (name.includes('salon') || name.includes('beautician') || name.includes('scissor')) return 'ss-scissors';
  if (name.includes('clean')) return 'ss-cleaning';
  return null;
};

/* Category chip icons — mirrors the category mapping used by the
   service-provider flow (SPSelectServicesScreen). */
const CATEGORY_ICON_RULES: Array<[RegExp, string]> = [
  [/appliance/i, 'appliance'],
  [/clean|pest/i, 'cleaning'],
  [/home|maid|cook|baby|servant|garden/i, 'home'],
  [/vehicle|car\b|driver/i, 'car'],
  [/beauty|salon|spa|personal/i, 'ss-scissors'],
];

const categoryIcon = (category: string): string => {
  for (const [pattern, icon] of CATEGORY_ICON_RULES) {
    if (pattern.test(category)) return icon;
  }
  return 'grid';
};

const WorkRequestSelectServiceScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { t } = useI18n();
  const { unreadCount } = useNotificationCount();
  const insets = useSafeAreaInsets();
  const topPadding = Math.max(insets.top, StatusBar.currentHeight ?? 0);

  const userId = useAuth()?.user?.id;
  const { services, query, setQuery, servicesError, refreshInBackground } = useServiceCatalog(userId);
  const { isPastBoundary: showStickySearch, onTargetLayout: onSearchBarLayout, onScroll } =
    useScrolledPastBoundary();
  const locationAttemptedRef = useRef(false);
  const [recentServices, setRecentServices] = useState<Service[]>([]);
  const [savedLocation, setSavedLocation] = useState<Location | null>(null);
  const [currentCityLabel, setCurrentCityLabel] = useState<string | null>(null);
  const [selectedChip, setSelectedChip] = useState<string>('all');

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      void (async () => {
        const locations = userId
          ? await readOfflineCache<Location[]>(offlineCacheKey('saved-locations', userId))
          : null;
        if (isActive) setSavedLocation(locations?.[0] ?? null);
      })();
      return () => {
        isActive = false;
      };
    }, [userId])
  );

  /* Live current city for the header — fetched once per session. */
  useEffect(() => {
    if (locationAttemptedRef.current) return;
    locationAttemptedRef.current = true;
    let active = true;
    (async () => {
      try {
        const gps = await locationManager.getGPSLocation(true);
        if (!gps || !active) return;
        const data = await reverseGeocode({ latlng: `${gps.latitude},${gps.longitude}` });
        if (!active) return;
        const result = data?.results?.[0];
        if (!result) return;
        const components: Array<{ long_name: string; types: string[] }> =
          result.address_components || [];
        const city =
          components.find((c) => c.types.includes('locality'))?.long_name ||
          components.find((c) => c.types.includes('sublocality'))?.long_name ||
          components.find((c) => c.types.includes('administrative_area_level_1'))?.long_name;
        setCurrentCityLabel(city || result.formatted_address || null);
      } catch {
        // Location unavailable or permission denied — fall back to the saved
        // location or the generic placeholder.
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
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

  const hasData = services && services.length > 0;

  const placeholderTexts = [
    t('createRequest.selectService.searchPlaceholder'),
    t('createRequest.selectService.searchPlaceholder1'),
    t('createRequest.selectService.searchPlaceholder2')
  ];

  const filteredServices = useMemo(() => {
    if (!services) return [];
    const q = query.trim().toLowerCase();
    return services.filter((s) => {
      const catMatch = selectedChip === 'all' || s.category === selectedChip;
      const qMatch =
        !q ||
        s.name.toLowerCase().includes(q) ||
        (Array.isArray(s.alias) && s.alias.some((alias) => alias.toLowerCase().includes(q))) ||
        (Array.isArray(s.tags) && s.tags.some((tag) => tag.toLowerCase().includes(q)));
      return catMatch && qMatch;
    });
  }, [services, query, selectedChip]);

  /* Grouped by the service's own category — the same grouping the
     service-provider flow uses. */
  const groupedServices = useMemo(() => {
    const map: Record<string, Service[]> = {};
    filteredServices.forEach((s) => {
      const key = s.category || 'Other';
      if (!map[key]) map[key] = [];
      map[key].push(s);
    });
    return map;
  }, [filteredServices]);

  const groupKeys = useMemo(() => Object.keys(groupedServices), [groupedServices]);

  const categories = useMemo(
    () => Array.from(new Set((services || []).map((s) => s.category).filter(Boolean))) as string[],
    [services]
  );

  const noResults = hasData && filteredServices.length === 0 && query.trim() !== '';
  /* Header shows the live current city (GPS → reverse geocoded); falls back
     to the confirmed saved location, then the generic placeholder. */
  const headerLocationLabel = currentCityLabel || savedLocation?.description || 'Select your location';

  const renderServiceCard = (service: Service, recent = false) => {
    const svgIcon = getServiceIcon(service);
    return (
      <TouchableOpacity
        key={service.id}
        style={[styles.serviceCard, recent && styles.recentCard]}
        onPress={() => handleServicePress(service)}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={service.name}>
        <View style={styles.serviceIconWrap}>
          {svgIcon ? (
            <SvgIcon name={svgIcon as any} size={34} color={SS.green} />
          ) : (
            <Ionicons
              name={(service.icon && (Ionicons as any).glyphMap[service.icon] ? service.icon : 'construct') as any}
              size={32}
              color={SS.green}
            />
          )}
        </View>
        <Text style={styles.serviceLabel}>{service.name}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header: safe-area padded so it never sits under the status bar */}
      <View style={[styles.header, { paddingTop: topPadding + 8 }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.locationButton}
            onPress={openLocationSelection}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={`${headerLocationLabel}, change location`}>
            <SvgIcon name="pin" size={18} color="#263638" />
            <Text style={styles.locationText}>{headerLocationLabel}</Text>
            <SvgIcon name="chevron-down" size={14} color={consumerColors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.bellButton}
            onPress={() => navigation.navigate('Notifications')}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}>
            <SvgIcon name="bell" size={24} color={colors.dark} />
            {unreadCount > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>
                  {unreadCount > 20 ? '20+' : unreadCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Search bar becomes sticky under the header once the in-content
            search scrolls past */}
        {showStickySearch && (
          <View style={styles.stickySearchWrap}>
            <ServicesSearchBar placeholders={placeholderTexts} value={query} onChangeText={setQuery} />
          </View>
        )}
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ ...styles.scrollContent, paddingBottom: 100 + Math.max(0, insets.bottom) }}
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        keyboardShouldPersistTaps="handled">

        {/* Hero: compact copy left, illustration right */}
        <View style={styles.hero}>
          <View style={styles.heroTextWrap}>
            <Text style={styles.heroTitle}>
              Get work done with <BrandWord />
            </Text>
            <Text style={styles.heroSubtitle}>Trusted professionals, at your service</Text>
          </View>
          <HomeHeroIllustration width={150} height={107} />
        </View>

        {/* Search */}
        <View style={styles.searchWrap} onLayout={onSearchBarLayout}>
          <ServicesSearchBar
            placeholders={placeholderTexts}
            value={query}
            onChangeText={setQuery}
          />
        </View>

        {/* Horizontal category chip strip — real categories from the shared
            service catalog (same list as the service-provider flow) */}
        {!hasData ? null : (
          <View style={styles.chipStrip}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              decelerationRate="fast"
              contentContainerStyle={styles.chipScrollContent}
            >
              <TouchableOpacity
                style={[styles.chip, selectedChip === 'all' && styles.chipActive]}
                onPress={() => setSelectedChip('all')}
                activeOpacity={0.75}
                accessibilityRole="button"
                accessibilityState={{ selected: selectedChip === 'all' }}>
                <SvgIcon name="grid" size={18} color={consumerColors.primary} />
                <Text style={[styles.chipLabel, selectedChip === 'all' && styles.chipLabelActive]}>
                  All
                </Text>
              </TouchableOpacity>
              {categories.map((category) => {
                const active = category === selectedChip;
                return (
                  <TouchableOpacity
                    key={category}
                    style={[styles.chip, active && styles.chipActive]}
                    onPress={() => setSelectedChip(category)}
                    activeOpacity={0.75}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}>
                    <SvgIcon name={categoryIcon(category) as any} size={18} color={consumerColors.primary} />
                    <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>
                      {category}
                    </Text>
                  </TouchableOpacity>
                );
              })}
              <View style={styles.chipSpacer} />
            </ScrollView>
          </View>
        )}

        {!hasData && (
          <View style={styles.loadingState}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.loadingText}>Loading services...</Text>
          </View>
        )}

        {/* Recently Used */}
        {hasData && query.trim() === '' && recentServices.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHead}>
              <Text style={styles.sectionTitle}>{t('createRequest.selectService.recentlyUsed')}</Text>
              <TouchableOpacity
                style={styles.viewAll}
                onPress={() => { setSelectedChip('all'); setQuery(''); }}
                activeOpacity={0.75}
                accessibilityRole="button"
                accessibilityLabel="View All">
                <Text style={styles.viewAllText}>View All ›</Text>
              </TouchableOpacity>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.recentRow}
            >
              {recentServices.map((svc) => renderServiceCard(svc, true))}
            </ScrollView>
          </View>
        )}

        {/* All Services — grouped by the catalog's own categories */}
        {hasData && (
          <View style={styles.section}>
            {query.trim() === '' && <Text style={styles.sectionTitle}>{t('createRequest.selectService.allServices')}</Text>}
            {groupKeys.map((key) => {
              const items = groupedServices[key];
              if (!items || items.length === 0) return null;
              return (
                <View key={key} style={styles.groupSection}>
                  <View style={styles.groupRow}>
                    <View style={styles.groupMarker} />
                    <Text style={styles.groupTitle}>{key}</Text>
                  </View>
                  <View style={styles.gridRow}>
                    {items.map((item) => renderServiceCard(item))}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {hasData && noResults && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No matching services found</Text>
          </View>
        )}

      </ScrollView>
      <ErrorBanner error={servicesError} onRetry={refreshInBackground} />
    </View>
  );
};

const styles = StyleSheet.create({
  // -- Container --
  container: {
    flex: 1,
    backgroundColor: consumerColors.page,
  },

  // -- Header --
  header: {
    backgroundColor: consumerColors.page,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 8,
    gap: 10,
  },
  locationButton: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
  },
  locationText: {
    color: '#263638',
    fontSize: 15.5,
    fontFamily: consumerFonts.bold,
    flexShrink: 1,
  },
  bellButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: consumerColors.mint,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationBadge: {
    position: 'absolute',
    top: 5,
    right: 5,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: consumerColors.primary,
    borderWidth: 1,
    borderColor: consumerColors.white,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  notificationBadgeText: {
    color: consumerColors.white,
    fontSize: 10,
    fontWeight: '700',
    fontFamily: consumerFonts.bold,
  },
  stickySearchWrap: {
    paddingHorizontal: 22,
    paddingTop: 2,
    paddingBottom: 10,
  },

  // -- Hero --
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  heroTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  heroTitle: {
    color: colors.dark,
    fontSize: 24,
    fontFamily: consumerFonts.bold,
    fontWeight: '800',
    letterSpacing: -0.7,
    lineHeight: 29,
    marginBottom: 8,
    includeFontPadding: false,
  },
  heroSubtitle: {
    color: consumerColors.muted,
    fontSize: 14.5,
    fontFamily: consumerFonts.regular,
    lineHeight: 20,
  },

  // -- Search --
  searchWrap: {
    marginTop: 12,
    marginBottom: 14,
  },

  // -- Chips --
  chipStrip: {
    marginHorizontal: -22,
    marginBottom: 8,
  },
  chipScrollContent: {
    paddingHorizontal: 22,
    paddingTop: 2,
    paddingBottom: 12,
    gap: 9,
    alignItems: 'center',
  },
  chipSpacer: {
    width: 22,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderWidth: 1,
    borderColor: consumerColors.border,
    backgroundColor: consumerColors.white,
    borderRadius: 999,
    paddingVertical: 9,
    paddingHorizontal: 14,
    shadowColor: '#1a4331',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 3,
  },
  chipActive: {
    backgroundColor: consumerColors.selectedMint,
    borderColor: consumerColors.selectedMint,
  },
  chipLabel: {
    color: consumerColors.ink,
    fontSize: 14,
    fontFamily: consumerFonts.regular,
  },
  chipLabelActive: {
    color: '#087f50',
    fontFamily: consumerFonts.bold,
  },

  // -- Sections --
  scrollContent: {
    paddingHorizontal: 22,
  },
  section: {
    marginTop: 12,
  },
  sectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    color: consumerColors.ink,
    fontSize: 19,
    fontFamily: consumerFonts.bold,
    letterSpacing: -0.4,
  },
  viewAll: {
    backgroundColor: '#e1f8ed',
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 13,
  },
  viewAllText: {
    color: '#087e50',
    fontSize: 13,
    fontWeight: '700',
  },
  recentRow: {
    gap: 8,
  },

  // -- Service card — exact SPSelectServicesScreen three-column spec --
  serviceCard: {
    borderWidth: 1,
    borderColor: SS.cardBorder,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 6,
    minHeight: 106,
    paddingTop: 10,
    paddingBottom: 9,
    paddingHorizontal: 5,
    width: '31.6%',
    shadowColor: '#12271C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  recentCard: {
    width: 110,
  },
  serviceIconWrap: {
    width: '100%',
    height: 39,
    alignItems: 'center',
    justifyContent: 'center',
  },
  serviceLabel: {
    fontSize: 12.5,
    lineHeight: 15.5,
    fontWeight: '500',
    color: SS.serviceName,
    textAlign: 'center',
    alignSelf: 'stretch',
  },

  // -- Group headings --
  groupSection: {
    marginBottom: 12,
  },
  groupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 2,
    marginBottom: 10,
  },
  groupMarker: {
    width: 4,
    height: 20,
    borderRadius: 4,
    backgroundColor: '#10b879',
  },
  groupTitle: {
    color: consumerColors.ink,
    fontSize: 17,
    fontFamily: consumerFonts.bold,
  },
  gridRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
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
    paddingVertical: 40,
  },
  emptyText: {
    color: consumerColors.muted,
    fontSize: 15,
    textAlign: 'center',
  },
});

export default WorkRequestSelectServiceScreen;
