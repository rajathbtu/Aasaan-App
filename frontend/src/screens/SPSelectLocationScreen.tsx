import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import LocationSearch from '../components/LocationSearch';
import { useI18n } from '../i18n';
import Header from '../components/Header';
import { colors, spacing, radius } from '../theme';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const SPSelectLocationScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { user, updateUser } = useAuth();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();

  // Initialize from user data to avoid hardcoding
  const initialLoc = user?.serviceProviderInfo?.location || null;
  const initialRadius = (user?.serviceProviderInfo?.radius as number | undefined) ?? 20;

  const [selectedLocation, setSelectedLocation] = useState<any>(initialLoc);
  const [radius, setRadius] = useState<number>(initialRadius);
  const [isRadiusExpanded, setIsRadiusExpanded] = useState(false);

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
      <Header title={t('sp.selectLocation.pageTitle') || 'Step 2 of 2'} showBackButton={true} showNotification={false} />
      {/* <View style={{ height: spacing.sm }} /> */}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}>
        
        <LocationSearch
              onSelect={(loc) => {
                setSelectedLocation((!loc)? null: { name: loc.description || loc.name, place_id: loc.place_id || loc.placeId, lat: loc.lat, lng: loc.lng });
              }}
              enableMap={true}
              mapHeight={350}
              initialValue={selectedLocation?.name || selectedLocation?.description || ''}/>
        
      </ScrollView>
      
      
      <View style={[styles.bottomCta, { paddingBottom: insets.bottom + spacing.sm }] }>
        {displayLocationName && displayLocationName !== t('sp.selectLocation.selectLocation') && (
            <View style={styles.locationCard}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', flex: 1 }}>
                <View style={styles.locIconCircle}>
                  <Ionicons name="location" size={16} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.locationName} numberOfLines={2}>
                    {displayLocationName}
                  </Text>
                </View>
              </View>
            </View>
        )}

        {/* Radius */}
        <View style={{ paddingHorizontal: spacing.lg, padding: spacing.lg }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flexShrink: 1 }}>
            <Text style={[styles.radiusSummaryText, { flexShrink: 1 }]} numberOfLines={2} ellipsizeMode="tail">
              {`You'll see work requests within ${radius} kms of ${selectedLocation?.name || selectedLocation?.description || 'your selected location'}`}
            </Text>
            <TouchableOpacity onPress={() => setIsRadiusExpanded((prev) => !prev)} style={styles.radiusLink}>
              <Text style={styles.radiusLinkText}>{t('sp.selectLocation.changeRadius')}</Text>
            </TouchableOpacity>
          </View>

          {isRadiusExpanded && (
            <View style={{ marginTop: spacing.md }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm }}>
                <Text style={styles.sectionTitle}>{t('sp.selectLocation.radiusQuestion') || 'How far can you travel for work?'}</Text>
              </View>
              
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
          )}
        </View>
        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Ionicons name="checkmark" size={18} color={colors.white} style={{ marginRight: spacing.xs }} />
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
    color: colors.grey,
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
    color: colors.white,
    fontSize: 12,
    fontWeight: '700',
  },
  locationCard: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.greyLight,
    borderRadius: radius.md,
    padding: spacing.md,
    shadowColor: colors.black,
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  locIconCircle: {
    backgroundColor: colors.primaryLight,
    borderRadius: 999,
    padding: 8,
    marginRight: spacing.sm,
    marginTop: 2,
  },
  locationName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.dark,
  },
  locationNote: {
    fontSize: 12,
    color: colors.grey,
  },
  changeBtn: {
    backgroundColor: colors.primaryLight,
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
  radiusSummaryText: {
    fontSize: 12,
    color: colors.dark,
    // fontWeight: '600',
  },
  radiusLink: {
    marginLeft: spacing.xs,
    paddingVertical: spacing.xs,
  },
  radiusLinkText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  radiusQuestion: {
    fontSize: 12,
    color: colors.grey,
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
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  radiusCellInactive: {
    backgroundColor: colors.white,
    borderColor: colors.greyBorder,
  },
  radiusCellActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  radiusCellText: {
    fontSize: 13,
    color: colors.dark,
    fontWeight: '500',
  },
  radiusCellTextActive: {
    color: colors.white,
    fontWeight: '700',
  },
  bottomCta: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.greyLight,
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
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default SPSelectLocationScreen;