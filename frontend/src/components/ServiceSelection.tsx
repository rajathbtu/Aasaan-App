import React, { useEffect, useMemo, useState } from 'react';
import { LayoutAnimation, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from '../theme';
import { getServices } from '../api';
import ServiceIcon from './ServiceIcon';
import { offlineCacheKey, readOfflineCache, writeOfflineCache } from '../utils/offlineCache';

export type Service = {
  id: string;
  name: string;
  category: string;
  alias?: string[];
  tags?: string[];
  icon?: string;
  color?: string;
};

export const useServiceCatalog = (userId: string | null | undefined, animateRefresh = false) => {
  const [services, setServices] = useState<Service[] | null>(null);
  const [query, setQuery] = useState('');
  const [servicesError, setServicesError] = useState<unknown | null>(null);
  const servicesCacheKey = userId ? offlineCacheKey('services', userId) : null;

  const refreshInBackground = async () => {
    try {
      const data = await getServices();
      const incoming = data.services as Service[];
      const changed = JSON.stringify(services || []) !== JSON.stringify(incoming);
      if (changed) {
        if (animateRefresh) LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setServices(incoming);
        if (servicesCacheKey) await writeOfflineCache(servicesCacheKey, incoming);
      }
      setServicesError(null);
    } catch (error) {
      setServicesError(error);
    }
  };

  useEffect(() => {
    (async () => {
      if (servicesCacheKey) {
        const cached = await readOfflineCache<Service[]>(servicesCacheKey);
        if (cached) setServices(cached);
      }
      refreshInBackground();
    })();
  }, [servicesCacheKey]);

  const grouped = useMemo(() => {
    const map: Record<string, Service[]> = {};
    (services || []).forEach(service => {
      if (!map[service.category]) map[service.category] = [];
      map[service.category].push(service);
    });
    return map;
  }, [services]);

  const filtered = useMemo(() => {
    if (!query.trim()) return grouped;
    const lower = query.trim().toLowerCase();
    const matchesQuery = (service: Service) =>
      service.name.toLowerCase().includes(lower) ||
      (Array.isArray(service.alias) && service.alias.some(alias => alias.toLowerCase().includes(lower))) ||
      (Array.isArray(service.tags) && service.tags.some(tag => tag.toLowerCase().includes(lower)));
    const map: Record<string, Service[]> = {};
    Object.keys(grouped).forEach(category => {
      const matches = grouped[category].filter(matchesQuery);
      if (matches.length) map[category] = matches;
    });
    return map;
  }, [grouped, query]);

  return { services, query, setQuery, filtered, servicesError, refreshInBackground };
};

type ServiceCategoryGridProps = {
  servicesByCategory: Record<string, Service[]>;
  selectedIds?: string[];
  onServicePress: (service: Service) => void;
};

export const ServiceCategoryGrid: React.FC<ServiceCategoryGridProps> = ({
  servicesByCategory,
  selectedIds = [],
  onServicePress,
}) => (
  <>
    {Object.keys(servicesByCategory).map(category => (
      <View key={category} style={styles.categorySection}>
        <View style={styles.categoryHeading}>
          <View style={styles.categoryMarker} />
          <Text style={styles.categoryTitle}>{category}</Text>
        </View>
        <View style={styles.gridRow}>
          {servicesByCategory[category].map(service => (
            <ServiceCard
              key={service.id}
              service={service}
              selected={selectedIds.includes(service.id)}
              onPress={() => onServicePress(service)}
            />
          ))}
        </View>
      </View>
    ))}
  </>
);

export type ServiceCardProps = {
  service: Service;
  selected?: boolean;
  onPress: () => void;
};

export const ServiceCard: React.FC<ServiceCardProps> = ({ service, selected = false, onPress }) => (
  <TouchableOpacity
    style={[styles.serviceCard, selected && styles.serviceCardSelected]}
    onPress={onPress}
    activeOpacity={0.7}
  >
    {selected && (
      <View style={styles.checkBadge}>
        <Ionicons name="checkmark" size={13} color={colors.white} />
      </View>
    )}
    <ServiceIcon icon={service.icon} color={service.color} circleSize={72} iconSize={34} />
    <Text style={[styles.serviceName, selected && styles.serviceNameSelected]} numberOfLines={2}>
      {service.name}
    </Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  categorySection: { marginBottom: spacing.xl },
  categoryHeading: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  categoryMarker: { width: 4, height: 18, borderRadius: 2, backgroundColor: colors.primary, marginRight: spacing.sm },
  categoryTitle: { fontSize: 16, fontWeight: '700', color: colors.dark },
  gridRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start', columnGap: spacing.lg },
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
    shadowColor: colors.black,
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  serviceCardSelected: { borderWidth: 2, borderColor: colors.primary, backgroundColor: colors.primarySoft },
  serviceName: { fontSize: 13, lineHeight: 16, fontWeight: '600', letterSpacing: 0.1, textAlign: 'center', color: colors.dark, minHeight: 36 },
  serviceNameSelected: { color: colors.primary, fontWeight: '700' },
  checkBadge: {
    position: 'absolute',
    top: -7,
    right: -7,
    backgroundColor: colors.primary,
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
});