import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  TextInput,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import type { BasePalette } from '../theme/palette';
import { useI18n } from '../i18n';
import Header from '../components/Header';
import { Service, useServiceCatalog } from '../components/ServiceSelection';
import InfoBanner from '../components/InfoBanner';
import ErrorBanner from '../components/ErrorBanner';
import SafeBottomBanner from '../components/SafeBottomBanner';
import BlockingLoader from '../components/BlockingLoader';
import SvgIcon from '../assets/icons';

/* Category icons — available for the three approved design categories. */
const CATEGORY_ICONS: Record<string, string> = {
  'Appliance Repair': 'ss-appliance',
  'Beauty & Personal Care': 'ss-beauty',
  Cleaning: 'ss-cleaning',
};

/* Real catalogue service ids → handoff SVG icons. */
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

const SPSelectServicesScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { user, updateUser } = useAuth();
  const { t } = useI18n();
  const { base: C, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);

  const mode: 'edit' | 'onboarding' = (route.params?.mode as any) === 'edit' ? 'edit' : 'onboarding';
  const initialSelected: string[] = Array.isArray(route.params?.initialSelected) ? route.params?.initialSelected : [];
  const onDone: undefined | ((sel: string[]) => void) = route.params?.onDone;

  const [selected, setSelected] = useState<string[]>(initialSelected);
  const [showLimitHint, setShowLimitHint] = useState(false);
  const [saveError, setSaveError] = useState<unknown | null>(null);
  const [saving, setSaving] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  const servicesScrollRef = useRef<React.ComponentRef<typeof ScrollView> | null>(null);
  const { services, setQuery, filtered } = useServiceCatalog(user?.id, true);

  useEffect(() => {
    setSelected(initialSelected);
  }, [initialSelected.join(',')]);

  useEffect(() => {
    setQuery(searchQuery);
  }, [searchQuery, setQuery]);

  const MAX_SELECTION = 3;

  const toggleService = (id: string) => {
    setSelected(prev => {
      if (prev.includes(id)) {
        setShowLimitHint(false);
        return prev.filter(sid => sid !== id);
      }
      if (prev.length >= MAX_SELECTION) {
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

  const allCategories = useMemo(() => {
    const names = new Set<string>();
    (services || []).forEach(service => {
      if (service.category) names.add(service.category);
    });
    return Array.from(names);
  }, [services]);

  const categoryTabs = useMemo(
    () => [{ key: 'all', label: t('sp.selectServices.allTab'), icon: undefined as string | undefined }]
      .concat(allCategories.map(name => ({ key: name, label: name, icon: CATEGORY_ICONS[name] }))),
    [allCategories, t]
  );

  const isSearching = searchQuery.trim().length > 0;

  const selectedServices = useMemo(() => {
    const list = services || [];
    const map: Record<string, Service> = {};
    list.forEach(s => { map[s.id] = s; });
    return selected.map(id => map[id]).filter(Boolean) as Service[];
  }, [selected, services]);

  const servicesByCategory = useMemo(() => {
    const map: Record<string, Service[]> = {};
    const f = filtered as Record<string, Service[]>;
    Object.keys(f).forEach(category => {
      if (activeCategory === 'all' || activeCategory === category) {
        map[category] = f[category];
      }
    });
    return map;
  }, [filtered, activeCategory]);

  const selectionBannerMessage = showLimitHint
    ? t('sp.selectServices.limitTitle')
    : selected.length > 0 && selected.length < MAX_SELECTION
      ? t('sp.selectServices.limitDesc')
      : '';

  const toggleSection = (category: string) => {
    setExpandedSections(prev => ({ ...prev, [category]: !(prev[category] !== false) }));
  };

  const isSectionExpanded = (category: string) =>
    isSearching || expandedSections[category] !== false;

  const isServiceSelected = (id: string) => selected.includes(id);

  const handleCategoryPress = (key: string) => {
    setActiveCategory(key);
    servicesScrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.white }}>
      <Header
        title={t('sp.selectServices.heading')}
        subheader={t('sp.selectServices.subheading')}
        showBackButton={true}
        showNotification={false}
        titleStyle={styles.headerTitle}
      />

      {/* Rounded search pill */}
      <View style={styles.searchWrap}>
        <View style={styles.searchBox}>
          <SvgIcon name="ss-search" size={21} color={C.grey} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder={t('sp.selectServices.searchPlaceholder')}
            placeholderTextColor={C.searchPlaceholder}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            keyboardAppearance={isDark ? 'dark' : 'light'}
          />
          {searchQuery.trim() !== '' && (
            <TouchableOpacity style={styles.clearSearch} onPress={() => setSearchQuery('')} activeOpacity={0.7} accessibilityLabel="Clear search">
              <SvgIcon name="ss-close" size={17} color={C.grey} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Horizontal category tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryTabsScroll}
        contentContainerStyle={styles.categoryTabs}
      >
        {categoryTabs.map(tab => {
          const active = activeCategory === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.categoryTab, active && styles.categoryTabActive]}
              onPress={() => handleCategoryPress(tab.key)}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={tab.label}
            >
              {tab.icon && (
                <SvgIcon name={tab.icon as any} size={18} color={active ? C.onPrimary : C.brandDark} />
              )}
              <Text style={[styles.categoryTabText, active && styles.categoryTabTextActive]} numberOfLines={1}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Scrollable service content */}
      <ScrollView
        ref={servicesScrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: 2,
          paddingBottom: 24,
          paddingHorizontal: 15,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {!hasData && (
          <View style={{ padding: 24, alignItems: 'center' }}>
            <ActivityIndicator />
          </View>
        )}

        {hasData && (
          <>
            {Object.keys(servicesByCategory).map(category => {
              const categoryServices = servicesByCategory[category];
              if (!categoryServices || categoryServices.length === 0) return null;
              const expanded = isSectionExpanded(category);
              const isFourColumn = categoryServices.length === 4;
              return (
                <View key={category} style={styles.serviceSection}>
                  <TouchableOpacity
                    style={[styles.sectionHeading, !expanded && styles.sectionHeadingCollapsed]}
                    onPress={() => toggleSection(category)}
                    activeOpacity={0.8}
                    accessibilityRole="button"
                    accessibilityState={{ expanded }}
                    accessibilityLabel={`${category} services`}
                  >
                    <View style={styles.sectionAccent} />
                    {CATEGORY_ICONS[category] && (
                      <SvgIcon name={CATEGORY_ICONS[category] as any} size={22} color={C.brand} />
                    )}
                    <Text style={[styles.sectionTitle, { minWidth: 0 }]} numberOfLines={1} ellipsizeMode="tail">
                      {category}
                    </Text>
                    <SvgIcon
                      name={expanded ? 'chevron-up' : 'chevron-down'}
                      size={19}
                      color={C.grey}
                    />
                  </TouchableOpacity>
                  {expanded && (
                    <View style={[styles.serviceGrid, isFourColumn && styles.serviceGridFour]}>
                      {categoryServices.map(service => {
                        const svgIcon = getServiceIcon(service);
                        const selectedService = isServiceSelected(service.id);
                        return (
                          <TouchableOpacity
                            key={service.id}
                            style={[
                              styles.serviceCard,
                              isFourColumn ? styles.serviceCardFour : styles.serviceCardThree,
                              selectedService && styles.serviceCardSelected,
                            ]}
                            onPress={() => toggleService(service.id)}
                            activeOpacity={0.85}
                            accessibilityRole="button"
                            accessibilityState={{ selected: selectedService }}
                            accessibilityLabel={service.name}
                          >
                            {selectedService && (
                              <View style={styles.selectionCheck}>
                                <SvgIcon name="check" size={13} color={C.onPrimary} />
                              </View>
                            )}
                            <View style={[styles.serviceIcon, isFourColumn && styles.serviceIconFour]}>
                              {svgIcon ? (
                                <SvgIcon name={svgIcon as any} size={isFourColumn ? 31 : 34} color={C.brand} />
                              ) : (
                                <Ionicons
                                  name={(service.icon && (Ionicons as any).glyphMap[service.icon] ? service.icon : 'construct') as any}
                                  size={isFourColumn ? 30 : 33}
                                  color={C.brand}
                                />
                              )}
                            </View>
                            <Text
                              style={[styles.serviceName, isFourColumn && styles.serviceNameFour]}
                              numberOfLines={2}
                              ellipsizeMode="tail"
                            >
                              {service.name}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}
                </View>
              );
            })}

            {Object.keys(servicesByCategory).length === 0 && (
              <View style={styles.noResults}>
                <Text style={styles.noResultsText}>{t('sp.selectServices.noResults')}</Text>
              </View>
            )}
          </>
        )}
      </ScrollView>

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

      {/* Fixed bottom selection panel */}
      <View style={styles.bottomPanel}>
        <View style={styles.selectionHeading}>
          <Text style={styles.selectionCountText}>
            <Text style={styles.selectionCountBold}>
              {t('sp.selectServices.selectedCount', { count: selected.length })}
            </Text>
          </Text>
          <TouchableOpacity onPress={() => { setSelected([]); setShowLimitHint(false); }} activeOpacity={0.8} accessibilityLabel={t('sp.selectServices.clearAll')}>
            <Text style={[styles.clearAllText, { minWidth: 0 }]} numberOfLines={1}>
              {t('sp.selectServices.clearAll')}
            </Text>
          </TouchableOpacity>
        </View>
        <View style={styles.footerBottom}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.selectedChipsContainer} contentContainerStyle={styles.selectedChipsContent}>
            {selectedServices.map(svc => (
              <View key={svc.id} style={styles.chip}>
                <Text style={[styles.chipText, { minWidth: 0 }]} numberOfLines={1} ellipsizeMode="tail">
                  {svc.name}
                </Text>
                <TouchableOpacity onPress={() => toggleService(svc.id)} style={styles.chipRemoveWrap} activeOpacity={0.7} accessibilityLabel={`Remove ${svc.name}`}>
                  <SvgIcon name="ss-close" size={12} color={C.brand} />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
          <TouchableOpacity
            style={[styles.confirmButton, selected.length === 0 && styles.confirmButtonDisabled]}
            onPress={handleContinue}
            activeOpacity={0.8}
            disabled={selected.length === 0 || saving}
          >
            <Text style={styles.confirmButtonText}>
              {t('common.confirm')}
            </Text>
            <SvgIcon name="ss-arrow-right" size={19} color={C.onPrimary} />
          </TouchableOpacity>
        </View>
        <ErrorBanner error={saveError} onRetry={handleContinue} />
      </View>

      <SafeBottomBanner />
      <BlockingLoader visible={saving} />
    </View>
  );
};

const makeStyles = (C: BasePalette) => StyleSheet.create({
  headerTitle: {
    fontSize: 20,
    letterSpacing: -0.75,
  },
  searchWrap: {
    paddingTop: 9,
    paddingBottom: 12,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: C.headerBorder,
    backgroundColor: C.white,
  },
  searchBox: {
    height: 47,
    borderWidth: 1,
    borderColor: C.searchBorder,
    borderRadius: 24,
    backgroundColor: C.white,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingHorizontal: 14,
    shadowColor: '#12271C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  searchIcon: {
    opacity: 0.7,
    flexGrow: 0,
    flexShrink: 0,
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    fontSize: 15,
    color: C.dark,
    backgroundColor: 'transparent',
    paddingVertical: 0,
    fontFamily: 'Inter',
  },
  clearSearch: {
    padding: 4,
    flexGrow: 0,
    flexShrink: 0,
  },
  categoryTabsScroll: {
    flexGrow: 0,
  },
  categoryTabs: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 15,
    paddingTop: 10,
    paddingBottom: 9,
  },
  categoryTab: {
    height: 37,
    paddingHorizontal: 13,
    borderWidth: 1,
    borderColor: C.tabBorder,
    borderRadius: 22,
    backgroundColor: C.white,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    flexGrow: 0,
    flexShrink: 0,
    shadowColor: '#12271C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  categoryTabActive: {
    backgroundColor: C.brand,
    borderColor: C.brand,
    minWidth: 56,
  },
  categoryTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: C.tabText,
    fontFamily: 'Inter-SemiBold',
  },
  categoryTabTextActive: {
    color: C.onPrimary,
  },
  serviceSection: {
    paddingTop: 7,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.headerBorder,
  },
  sectionHeading: {
    width: '100%',
    height: 39,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 1,
    marginBottom: 7,
  },
  sectionHeadingCollapsed: {
    marginBottom: 0,
  },
  sectionAccent: {
    width: 4,
    height: 21,
    borderRadius: 5,
    backgroundColor: C.sectionAccent,
    flexGrow: 0,
    flexShrink: 0,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: C.dark,
    letterSpacing: -0.35,
    flex: 1,
    minWidth: 0,
    fontFamily: 'Inter-Bold',
  },
  serviceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  serviceGridFour: {
    gap: 7,
  },
  serviceCard: {
    borderWidth: 1,
    borderColor: C.cardBorder,
    borderRadius: 19,
    backgroundColor: C.white,
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 6,
    shadowColor: '#12271C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  serviceCardThree: {
    width: '31.6%',
    minHeight: 106,
    paddingTop: 10,
    paddingBottom: 9,
    paddingHorizontal: 5,
  },
  serviceCardFour: {
    width: '23.5%',
    minHeight: 88,
    paddingTop: 9,
    paddingBottom: 8,
    paddingHorizontal: 3,
  },
  serviceCardSelected: {
    borderWidth: 1.5,
    borderColor: C.brand,
    backgroundColor: C.greenSelected,
    shadowColor: C.brand,
    shadowOpacity: 0.12,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  serviceIcon: {
    width: '100%',
    height: 39,
    alignItems: 'center',
    justifyContent: 'center',
  },
  serviceIconFour: {
    height: 35,
  },
  serviceName: {
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '500',
    color: C.serviceName,
    textAlign: 'center',
    minWidth: 0,
  },
  serviceNameFour: {
    fontSize: 11,
  },
  selectionCheck: {
    position: 'absolute',
    right: -5,
    top: -7,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: C.brand,
    borderWidth: 2,
    borderColor: C.white,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  noResults: {
    paddingVertical: 32,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  noResultsText: {
    fontSize: 14,
    color: C.grey,
    textAlign: 'center',
  },
  bottomPanel: {
    backgroundColor: C.white,
    borderTopWidth: 1,
    borderTopColor: C.footerBorder,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 10,
    shadowColor: '#162A1E',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -3 },
    elevation: 6,
  },
  selectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    gap: 8,
  },
  selectionCountText: {
    fontSize: 14,
    fontWeight: '800',
    color: C.selectionHeadingText,
    fontFamily: 'Inter-Bold',
  },
  selectionCountBold: {
    fontWeight: '800',
  },
  clearAllText: {
    fontSize: 12,
    fontWeight: '700',
    color: C.brand,
    fontFamily: 'Inter-SemiBold',
    paddingVertical: 5,
    paddingHorizontal: 5,
  },
  footerBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    minWidth: 0,
  },
  selectedChipsContainer: {
    flex: 1,
    minWidth: 0,
  },
  selectedChipsContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingVertical: 3,
    paddingHorizontal: 1,
  },
  chip: {
    flexShrink: 0,
    minHeight: 32,
    paddingLeft: 10,
    paddingRight: 7,
    borderRadius: 18,
    backgroundColor: C.greenSoft,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  chipText: {
    fontSize: 10,
    fontWeight: '600',
    color: C.chipText,
    fontFamily: 'Inter-SemiBold',
  },
  chipRemoveWrap: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: C.white,
    alignItems: 'center',
    justifyContent: 'center',
    flexGrow: 0,
    flexShrink: 0,
  },
  confirmButton: {
    flexGrow: 0,
    flexShrink: 0,
    height: 48,
    minWidth: 105,
    paddingHorizontal: 12,
    borderRadius: 13,
    backgroundColor: C.brand,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    shadowColor: '#007841',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 3,
  },
  confirmButtonDisabled: {
    opacity: 0.45,
    shadowOpacity: 0,
    elevation: 0,
  },
  confirmButtonText: {
    color: C.onPrimary,
    fontSize: 15,
    fontWeight: '800',
    fontFamily: 'Inter-Bold',
  },
  selectionBannerWrap: {
    paddingBottom: 8,
  },
  selectionBanner: {
    marginBottom: 0,
    justifyContent: 'center',
  },
});

export default SPSelectServicesScreen;
