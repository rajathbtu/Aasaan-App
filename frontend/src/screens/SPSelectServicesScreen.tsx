import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert, ActivityIndicator, LayoutAnimation, Platform, UIManager } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../i18n';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getServices } from '../api';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type Service = { id: string; name: string; category: string; tags?: string[] };
const CACHE_KEY = 'services_cache_v1';

const SPSelectServicesScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { updateUser } = useAuth();
  const { t } = useI18n();
  const mode: 'edit' | 'onboarding' = (route.params?.mode as any) === 'edit' ? 'edit' : 'onboarding';
  const initialSelected: string[] = Array.isArray(route.params?.initialSelected) ? route.params?.initialSelected : [];
  const onDone: undefined | ((sel: string[]) => void) = route.params?.onDone;

  const [selected, setSelected] = useState<string[]>(initialSelected);
  const [services, setServices] = useState<Service[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setSelected(initialSelected);
  }, [initialSelected.join(',')]);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(CACHE_KEY);
        if (raw) setServices(JSON.parse(raw));
      } catch {}
      refreshInBackground();
    })();
  }, []);

  const refreshInBackground = async () => {
    try {
      setLoading(true);
      const data = await getServices();
      const incoming = data.services as Service[];
      const cur = JSON.stringify(services || []);
      const inc = JSON.stringify(incoming);
      if (cur !== inc) {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setServices(incoming);
        await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(incoming));
      }
    } catch (e) {
      // ignore and keep cache
    } finally {
      setLoading(false);
    }
  };

  const grouped = useMemo(() => {
    const list = services || [];
    const map: Record<string, Service[]> = {};
    list.forEach(s => { if (!map[s.category]) map[s.category] = []; map[s.category].push(s); });
    return map;
  }, [services]);

  const toggleService = (id: string) => {
    setSelected(prev => {
      if (prev.includes(id)) {
        return prev.filter(sid => sid !== id);
      }
      if (prev.length >= 3) {
        Alert.alert(t('sp.selectServices.limitTitle'), t('sp.selectServices.limitDesc'));
        return prev;
      }
      return [...prev, id];
    });
  };

  const handleContinue = async () => {
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
      await updateUser({ services: selected });
      navigation.navigate('SPSelectLocation');
    } catch (err: any) {
      Alert.alert('Error', t('sp.selectServices.saveFailed'));
    }
  };

  const hasData = services && services.length > 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 32 }}>
      <Text style={styles.title}>{t('sp.selectServices.title')}</Text>

      {!hasData && (
        <View style={{ paddingVertical: 16, alignItems: 'center' }}>
          <ActivityIndicator />
          <Text style={{ marginTop: 8, color: '#6b7280' }}>{t('common.loading') || 'Loading…'}</Text>
        </View>
      )}

      {hasData && Object.keys(grouped).map(category => (
        <View key={category} style={styles.categorySection}>
          <Text style={styles.categoryTitle}>{category}</Text>
          <View style={styles.servicesRow}>
            {grouped[category].map(service => {
              const isSelected = selected.includes(service.id);
              return (
                <TouchableOpacity key={service.id} style={[styles.serviceCard, isSelected && styles.serviceCardSelected]} onPress={() => toggleService(service.id)}>
                  <Text style={[styles.serviceName, isSelected && styles.serviceNameSelected]}>{service.name}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      ))}
      <TouchableOpacity style={[styles.button, selected.length === 0 && { opacity: 0.6 }]} onPress={handleContinue} disabled={selected.length === 0}>
        <Text style={styles.buttonText}>{mode === 'edit' ? t('sp.selectServices.done') : t('common.continue')}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
    color: '#111827',
    textAlign: 'center',
  },
  categorySection: {
    marginBottom: 20,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#1f2937',
  },
  servicesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  serviceCard: {
    backgroundColor: '#ffffff',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    marginRight: 8,
    marginBottom: 8,
  },
  serviceCardSelected: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  serviceName: {
    fontSize: 14,
    color: '#1f2937',
  },
  serviceNameSelected: {
    color: '#ffffff',
    fontWeight: '600',
  },
  button: {
    marginTop: 16,
    backgroundColor: '#2563eb',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default SPSelectServicesScreen;