import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import LocationSearch from '../components/LocationSearch';
import { useI18n } from '../i18n';
import Header from '../components/Header';
import { colors, spacing, radius } from '../theme';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';

const SPSelectLocationScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { user, updateUser } = useAuth();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();

  // Initialize from user data to avoid hardcoding
  const initialLoc = user?.serviceProviderInfo?.location || null;
  const initialRadius = (user?.serviceProviderInfo?.radius as number | undefined) ?? 10;

  const [selectedLocation, setSelectedLocation] = useState<any>(initialLoc);
  const [radius, setRadius] = useState<number>(initialRadius);
  const [searchOpen, setSearchOpen] = useState(false);
  const [locating, setLocating] = useState(false);

  const detectLocation = async () => {
    try {
      setLocating(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { setLocating(false); return; }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      let displayName = '';
      try {
        const results = await Location.reverseGeocodeAsync({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        if (results && results.length) {
          const r: any = results[0];
          const parts = [r.name || r.street, r.subregion || r.city || r.district].filter(Boolean);
          displayName = parts.join(', ') || r.formattedAddress || '';
        }
      } catch {}
      setSelectedLocation({ name: displayName || 'Current location', lat: pos.coords.latitude, lng: pos.coords.longitude });
    } catch {}
    finally { setLocating(false); }
  };

  const handleSave = async () => {
    if (!selectedLocation) {
      Alert.alert(t('common.error'), t('sp.selectLocation.selectLocation'));
      return;
    }
    try {
      const locPayload = selectedLocation?.place_id || selectedLocation?.placeId
        ? {
            name: selectedLocation.description || selectedLocation.name,
            lat: selectedLocation.lat,
            lng: selectedLocation.lng,
            placeId: selectedLocation.place_id || selectedLocation.placeId,
          }
        : {
            name: selectedLocation.name,
            lat: selectedLocation.lat,
            lng: selectedLocation.lng,
            placeId: selectedLocation.placeId,
          };
      await updateUser({ location: locPayload as any, radius });
      navigation.navigate('Main');
    } catch (err: any) {
      Alert.alert(t('common.error'), t('sp.selectLocation.saveFailed'));
    }
  };

  const radiusOptions = [5, 10, 15, 20];

  const displayLocationName = selectedLocation?.name || selectedLocation?.description || t('sp.selectLocation.selectLocation');

  return (
    <View style={{ flex: 1, backgroundColor: colors.light }}>
      <Header title={t('sp.selectLocation.stepLabel') || 'Step 2 of 2'} showBackButton={true} showNotification={false} />
      <View style={{ height: spacing.sm }} />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}>
        {/* Heading */}
        <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm, backgroundColor: '#fff' }}>
          <Text style={styles.pageTitle}>{t('sp.selectLocation.heading') || 'Set your service area'}</Text>
          <Text style={styles.subtitle}>{t('sp.selectLocation.subheading') || 'You will receive work requests near this location'}</Text>
        </View>

        {/* Location section */}
        <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.lg }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm }}>
            <View style={styles.stepDot}><Text style={styles.stepDotText}>1</Text></View>
            <Text style={styles.sectionTitle}>{t('sp.selectLocation.locationTitle') || 'Location'}</Text>
          </View>

          {/* Current Location Card */}
          <View style={styles.locationCard}>
            {locating && (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm }}>
                <ActivityIndicator size="small" />
                <Text style={{ marginLeft: spacing.sm, color: colors.grey }}>{t('common.loading') || 'Detecting current location…'}</Text>
              </View>
            )}
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', flex: 1 }}>
                <View style={styles.locIconCircle}>
                  <Ionicons name="location" size={16} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.locationName} numberOfLines={2}>
                    {displayLocationName}
                  </Text>
                  <Text style={styles.locationNote}>{t('sp.selectLocation.autoDetected') || 'Use the locate icon to auto-detect or search manually'}</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setSearchOpen(true)} style={styles.changeBtn}>
                <Text style={styles.changeBtnText}>{t('sp.selectLocation.change') || t('common.change')}</Text>
              </TouchableOpacity>
            </View>

            {/* Inline search input when Change pressed */}
            {searchOpen && (
              <View style={{ marginTop: spacing.md }}>
                <LocationSearch
                  onSelect={(loc) => {
                    setSelectedLocation({ name: loc.description || loc.name, place_id: loc.place_id || loc.placeId, lat: loc.lat, lng: loc.lng });
                    setSearchOpen(false);
                  }}
                  initialValue={selectedLocation?.name || selectedLocation?.description || ''}
                  rightActionIcon="locate-outline"
                  onPressRightAction={detectLocation}
                  rightActionLoading={locating}
                />
              </View>
            )}
          </View>
        </View>

        {/* Radius */}
        <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.lg }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm }}>
            <View style={styles.stepDot}><Text style={styles.stepDotText}>2</Text></View>
            <Text style={styles.sectionTitle}>{t('sp.selectLocation.radiusTitle') || 'Service Radius'}</Text>
          </View>
          <Text style={styles.radiusQuestion}>{t('sp.selectLocation.radiusQuestion') || 'How far are you willing to travel for work?'}</Text>

          <View style={styles.radiusGrid}>
            {radiusOptions.map((value) => {
              const active = radius === value;
              return (
                <TouchableOpacity key={value} style={[styles.radiusCell, active ? styles.radiusCellActive : styles.radiusCellInactive]} onPress={() => setRadius(value)}>
                  <Text style={[styles.radiusCellText, active && styles.radiusCellTextActive]}>{value} km</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </ScrollView>

      {/* Sticky save CTA */}
      <View style={[styles.bottomCta, { paddingBottom: insets.bottom + spacing.sm }] }>
        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Ionicons name="checkmark" size={18} color="#fff" style={{ marginRight: spacing.xs }} />
          <Text style={styles.saveText}>{t('sp.selectLocation.saveButton')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  pageTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.dark,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.dark,
  },
  stepDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  stepDotText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  locationCard: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: radius.md,
    padding: spacing.md,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  locIconCircle: {
    backgroundColor: '#dbeafe',
    borderRadius: 999,
    padding: 8,
    marginRight: spacing.sm,
    marginTop: 2,
  },
  locationName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  locationNote: {
    fontSize: 12,
    color: '#6b7280',
  },
  changeBtn: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    marginLeft: spacing.sm,
  },
  changeBtnText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  radiusQuestion: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: spacing.sm,
  },
  radiusGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  radiusCell: {
    flex: 1,
    marginRight: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  radiusCellInactive: {
    backgroundColor: '#fff',
    borderColor: '#d1d5db',
  },
  radiusCellActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  radiusCellText: {
    fontSize: 16,
    color: '#1f2937',
    fontWeight: '500',
  },
  radiusCellTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  bottomCta: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  saveButton: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  saveText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default SPSelectLocationScreen;