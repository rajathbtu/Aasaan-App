import React, { useState, useMemo, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Animated } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../i18n';
import Header from '../components/Header';
import { Service, ServiceCategoryGrid, useServiceCatalog } from '../components/ServiceSelection';
import InfoBanner from '../components/InfoBanner';
import ErrorBanner from '../components/ErrorBanner';
import ServicesSearchBar from '../components/ServicesSearchBar';
import { colors, spacing, radius } from '../theme';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import SafeBottomBanner from '../components/SafeBottomBanner';
import BlockingLoader from '../components/BlockingLoader';

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
  const [saveError, setSaveError] = useState<unknown | null>(null);
  const [saving, setSaving] = useState(false);
  const scrollY = useRef(new Animated.Value(0)).current;
  const searchTranslateY = Animated.diffClamp(scrollY, 0, 70).interpolate({
    inputRange: [0, 70],
    outputRange: [0, -70],
  });
  const { services, query, setQuery, filtered } = useServiceCatalog(user?.id, true);
  const searchContainerHeight = 70;

  useEffect(() => {
    setSelected(initialSelected);
  }, [initialSelected.join(',')]);

  const toggleService = (id: string) => {
    setSelected(prev => {
      if (prev.includes(id)) {
        setShowLimitHint(false);
        return prev.filter(sid => sid !== id);
      }
      if (prev.length >= 3) {
        setShowLimitHint(true);
        return prev;
      }
      setShowLimitHint(false);
      return [...prev, id];
    });
  };

  const handleContinue = async () => {
    if (saving) return;
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
      setSaving(true);
      await updateUser({ services: selected });
      setSaveError(null);
      navigation.navigate('LocationSelect');
    } catch (err: any) {
      setSaveError(err);
    } finally {
      setSaving(false);
    }
  };

  const hasData = services && services.length > 0;

  const selectedServices = useMemo(() => {
    const list = services || [];
    const map: Record<string, Service> = {};
    list.forEach(s => { map[s.id] = s; });
    return selected.map(id => map[id]).filter(Boolean) as Service[];
  }, [selected, services]);

  const selectionBannerMessage = showLimitHint
    ? t('sp.selectServices.limitTitle')
    : selected.length > 0 && selected.length < 3
      ? t('sp.selectServices.limitDesc')
      : '';

  // Height of bottom CTA for padding bottom
  const bottomCtaPadding = 120 + insets.bottom; // approx height including chips; adjust as needed
  
  const placeholderTexts = [
    t('createRequest.selectService.searchPlaceholder'),
    t('createRequest.selectService.searchPlaceholder1'),
    t('createRequest.selectService.searchPlaceholder2')
  ];


  return (
    <View style={{ flex: 1, backgroundColor: colors.light }}>
      <Header 
        title={t('sp.selectServices.heading')} 
        keepTitleCenterAligned={true} 
        showBackButton={navigation.canGoBack()}
        showNotification={false} 
        extraLargeTitle={mode=== 'onboarding' } />
      {/* <View style={{ height: spacing.sm }} /> */}

      <View style={styles.scrollArea}>
        <Animated.ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingTop: searchContainerHeight, paddingBottom: bottomCtaPadding }}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: true },
          )}
          scrollEventThrottle={16}>

          {/* Loading */}
          {!hasData && (
            <View style={{ padding: spacing.lg, alignItems: 'center' }}>
              <ActivityIndicator />
              <Text style={{ color: colors.grey, marginTop: 8 }}>{t('common.fetchingCurrentLocation') || 'Loading...'}</Text>
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
        </Animated.ScrollView>
        <Animated.View style={[styles.searchOverlay, { transform: [{ translateY: searchTranslateY }] }]}>
          <ServicesSearchBar
            placeholders={placeholderTexts}
            value={query}
            onChangeText={setQuery}
            style={{ marginTop: 10 }}
          />
        </Animated.View>
      </View>

      {/* Bottom CTA sticky */}
      <View style={[styles.bottomCta] }>
          {selectionBannerMessage && (
            <View style={styles.selectionBannerWrap}>
              <InfoBanner
                message={selectionBannerMessage}
                autoDismissMs={showLimitHint ? 2500 : undefined}
                onDismiss={() => setShowLimitHint(false)}
                style={styles.selectionBanner}
                theme="grey"
              />
            </View>
          )}
        
        <View style={styles.selectedChipsRow}>
          {selectedServices.map(svc => (
            <View key={svc.id} style={styles.chip}>
              <Text style={styles.chipText}>{svc.name}</Text>
              <TouchableOpacity onPress={() => toggleService(svc.id)}>
                <Ionicons name="close" size={14} color={colors.primary} style={{ marginLeft: 6, borderRadius: 999, borderColor: colors.primary, borderWidth: 1 }} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
        <ErrorBanner error={saveError} onRetry={handleContinue} />
        <TouchableOpacity
          style={[styles.continueButton, selected.length === 0 && { opacity: 0.6 } ]}
          onPress={handleContinue}
          disabled={selected.length === 0}
        >
          <Text style={styles.continueText}>{t('common.confirm')}</Text>
          <Ionicons name="arrow-forward" size={18} color={colors.white} style={{ marginLeft: 8 }} />
        </TouchableOpacity>
      </View>
      <SafeBottomBanner />
      <BlockingLoader visible={saving} />
    </View>
  );
};

const styles = StyleSheet.create({
  scrollArea: {
    flex: 1,
  },
  searchOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    backgroundColor: colors.light,
    borderBottomWidth: 1,
    borderBottomColor: colors.greyLight,
    zIndex: 5,
  },
  subtitle: {
    fontSize: 14,
    color: colors.grey,
    marginLeft: spacing.lg,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  selectionBannerWrap: {
    paddingBottom: spacing.sm,
  },
  selectionBanner: {
    marginBottom: 0,
    justifyContent: 'center',
  },

  // Bottom CTA
  bottomCta: {
    position: 'relative',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.greyLight,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    marginBottom: 5,
  },
  selectedChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10 as any,
    marginBottom: spacing.lg,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 8,
    marginRight: 8,
    // marginBottom: 8,
  },
  chipText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '700',
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