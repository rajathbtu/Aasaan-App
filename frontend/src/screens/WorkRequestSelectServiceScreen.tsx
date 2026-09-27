import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing, radius } from '../theme';
import Header from '../components/Header';
import ErrorBanner from '../components/ErrorBanner';
import { Service, ServiceCard, ServiceCategoryGrid, useServiceCatalog } from '../components/ServiceSelection';
import ServicesSearchBar from '../components/ServicesSearchBar';
import { useI18n } from '../i18n';
import { useAuth } from '../contexts/AuthContext';
import { readOfflineCache, writeOfflineCache } from '../utils/offlineCache';

const RECENT_SERVICES_KEY = (userId: string) => `recent_services_${userId}`;
const MAX_RECENT_SERVICES = 3;

const WorkRequestSelectServiceScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { t } = useI18n();

  const userId = useAuth()?.user?.id;
  const { services, query, setQuery, filtered, servicesError, refreshInBackground } = useServiceCatalog(userId);
  const [recentServices, setRecentServices] = useState<Service[]>([]);

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
    navigation.navigate('LocationSelect', { serviceId: service.id, serviceName: service.name, serviceTags: service.tags || [], mode: 'requestcreation' });
  };

  const hasData = services && services.length > 0;

  const placeholderTexts = [
    t('createRequest.selectService.searchPlaceholder'),
    t('createRequest.selectService.searchPlaceholder1'),
    t('createRequest.selectService.searchPlaceholder2')
  ];

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
  gridRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    columnGap: spacing.lg,
  },

  shadow: {
    shadowColor: colors.black,
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
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