import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { services } from '../data/services';
import { colors, spacing, radius } from '../theme';

/**
 * Entry point for end users to create a new work request.  Displays a
 * searchable list of all available services grouped by category.  When
 * the user selects a service the flow proceeds to the details form.
 */
const WorkRequestSelectServiceScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [query, setQuery] = useState('');

  // Predefine a few recently used services.  In a production app this would
  // come from persistent storage or the user profile.  Here we choose a
  // handful of commonly used services to populate the section.
  const recentIds = ['electrician', 'plumber', 'cook'];

  const serviceIconMap: Record<string, { icon: keyof typeof Ionicons.glyphMap; color: string }> = {
    maid: { icon: 'broom', color: '#fce7f3' },
    cook: { icon: 'restaurant', color: '#dcfce7' },
    babysitter: { icon: 'baby', color: '#fde68a' },
    cleaner: { icon: 'sparkles', color: '#e0f2fe' },
    servant: { icon: 'people', color: '#ede9fe' },
    carCleaner: { icon: 'car', color: '#fee2e2' },
    electrician: { icon: 'flash', color: '#eef2ff' },
    plumber: { icon: 'water', color: '#ecfdf5' },
    carpenter: { icon: 'hammer', color: '#fef2f2' },
    painter: { icon: 'color-palette', color: '#fffbeb' },
    acRepair: { icon: 'snow', color: '#e0f2fe' },
    pestControl: { icon: 'bug', color: '#fff7ed' },
    photographer: { icon: 'camera', color: '#fef9c3' },
    yogaTrainer: { icon: 'heart', color: '#ecfdf5' },
    tutor: { icon: 'book', color: '#e0e7ff' },
    dietician: { icon: 'leaf', color: '#f0fdf4' },
    makeupArtist: { icon: 'brush', color: '#f3e8ff' },
    eventPlanner: { icon: 'calendar', color: '#fef9c3' },
    gardener: { icon: 'flower', color: '#f0fdf4' },
    caterer: { icon: 'fast-food', color: '#ffedd5' },
    interiorDesigner: { icon: 'home', color: '#e0e7ff' },
  };

  const grouped = useMemo(() => {
    const map: Record<string, typeof services> = {};
    services.forEach(s => {
      if (!map[s.category]) map[s.category] = [];
      map[s.category].push(s);
    });
    return map;
  }, []);

  const filtered = useMemo(() => {
    if (!query.trim()) return grouped;
    const lower = query.trim().toLowerCase();
    const map: Record<string, typeof services> = {};
    Object.keys(grouped).forEach(cat => {
      const list = grouped[cat].filter(s => s.name.toLowerCase().includes(lower));
      if (list.length > 0) {
        map[cat] = list;
      }
    });
    return map;
  }, [query, grouped]);

  const renderServiceCard = (service: (typeof services)[0]) => {
    const iconConfig = serviceIconMap[service.id] || { icon: 'construct', color: '#e5e7eb' };
    return (
      <TouchableOpacity
        key={service.id}
        style={styles.serviceCard}
        onPress={() => navigation.navigate('WorkRequestAddDetails', { serviceId: service.id })}
      >
        <View style={[styles.iconCircle, { backgroundColor: iconConfig.color }]}> 
          <Ionicons name={iconConfig.icon} size={20} color={colors.primary} />
        </View>
        <Text style={styles.serviceLabel}>{service.name}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.light }} contentContainerStyle={{ paddingBottom: spacing.lg }}>
      {/* Header */}
      <View style={styles.headerRow}>
        <Text style={styles.appTitle}>Aasaan</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Notifications')} style={styles.notificationButton}>
          <Ionicons name="notifications-outline" size={22} color={colors.dark} />
          {/* In a real app the count badge would be dynamic */}
          <View style={styles.notificationBadge}>
            <Text style={styles.notificationBadgeText}>2</Text>
          </View>
        </TouchableOpacity>
      </View>

      <Text style={styles.pageTitle}>Get your work done!</Text>
      <Text style={styles.subtitle}>Select type of work</Text>
      {/* Search bar */}
      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color={colors.grey} style={{ marginRight: spacing.sm }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search for services..."
          placeholderTextColor={colors.grey}
          value={query}
          onChangeText={setQuery}
        />
      </View>
      {/* Recently Used */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recently Used</Text>
        <View style={styles.recentRow}>
          {recentIds.map(id => {
            const svc = services.find(s => s.id === id);
            return svc ? renderServiceCard(svc) : null;
          })}
        </View>
      </View>
      {/* All Services */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>All Services</Text>
        {Object.keys(filtered).map(category => (
          <View key={category} style={styles.categorySection}>
            <Text style={styles.categoryTitle}>{category}</Text>
            <View style={styles.servicesGrid}>
              {filtered[category].map(svc => renderServiceCard(svc))}
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    marginBottom: spacing.md,
  },
  appTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primary,
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
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  notificationBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.dark,
    paddingHorizontal: spacing.lg,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: colors.grey,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.greyLight,
    backgroundColor: '#fff',
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.dark,
    paddingVertical: spacing.sm,
  },
  section: {
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.dark,
    marginBottom: spacing.sm,
  },
  recentRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  categorySection: {
    marginBottom: spacing.lg,
  },
  categoryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
  },
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  serviceCard: {
    width: '30%',
    marginRight: '3.3333%',
    marginBottom: spacing.md,
    alignItems: 'center',
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
    fontSize: 12,
    textAlign: 'center',
    color: colors.dark,
  },
});

export default WorkRequestSelectServiceScreen;