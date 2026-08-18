import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView, ImageBackground } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius } from '../theme';
import Header from '../components/Header';
import LocationSearch from '../components/LocationSearch';
import { useI18n } from '../i18n';
import BottomCTA from '../components/BottomCTA';

/**
 * Form for end users to provide details about their work request.
 * Users specify the location where the service is needed.
 * After confirming the location, they proceed to select tags on the next screen.
 */
const WorkRequestAddDetailsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { serviceId, serviceName, serviceTags } = (route.params as any) || {};
  const service = { id: serviceId, name: serviceName, tags: (serviceTags || []) as string[] };
  const [selectedLocation, setSelectedLocation] = useState<any>(null);
  const { t } = useI18n();

  if (!serviceId || !serviceName) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>{t('createRequest.addDetails.unknownService')}</Text>
      </View>
    );
  }

  const handleConfirm = () => {
    if (!selectedLocation || !selectedLocation.lat || !selectedLocation.lng) {
      Alert.alert(t('createRequest.addDetails.locationRequiredTitle'), t('createRequest.addDetails.locationRequiredDesc'));
      return;
    }
    navigation.navigate('WorkRequestSelectTags', { 
      serviceId: service.id, 
      serviceName: service.name, 
      serviceTags: service.tags,
      selectedLocation 
    });
  };

  return (
    <View style={{ flex: 1 }}>
      <Header title={service.name} subheader={t('createRequest.addDetails.headerSubTitle')} showNotification={false} showBackButton={true} />
      {/* Spacer to prevent overlap and add small bottom margin below header */}
      <View style={{ height: spacing.xs }} />

      <ImageBackground
        source={require('../../assets/bckgnd_tile.png')}
        resizeMode="repeat"  // this makes it tile like WhatsApp
        style={{ flex: 1 }}>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: spacing.xl }}>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="location" size={18} color={colors.primary} style={{ marginRight: spacing.sm }} />
              <Text style={styles.sectionTitle}>{t('createRequest.addDetails.locationTitle')}</Text>
            </View>
            <LocationSearch
              onSelect={(location) =>setSelectedLocation((!location)? null: location)}
              initialValue={selectedLocation?.name || selectedLocation?.description || ''}
              placeholder={t('createRequest.addDetails.locationSearchPlaceholder')}
              enableMap={true}
              initialLocation={selectedLocation}
              mapHeight={450}
            />
            <Text style={styles.locationNote}> {t('createRequest.addDetails.locationNote')}</Text>
          </View>

          {/* @todo Show cancel button to go back */}
          {/* <TouchableOpacity style={styles.cancelButton} onPress={() => navigation.goBack()}>
            <Ionicons name="close" size={18} color={colors.grey} style={{ marginRight: spacing.sm }} />
            <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
          </TouchableOpacity> */}

        </ScrollView>
      </ImageBackground>
      <View style={styles.actionsSection}>
        <BottomCTA
          buttonText={t('createRequest.addDetails.confirmLocationButton')}
          onPress={handleConfirm}
          isSticky={true}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 18,
    color: colors.dark,
  },
  section: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    marginTop: spacing.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.dark,
  },
  locationNote: {
    fontSize: 12,
    color: colors.grey,
    margin: spacing.xs,
  },
  actionsSection: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.lg,
  },
});

export default WorkRequestAddDetailsScreen;