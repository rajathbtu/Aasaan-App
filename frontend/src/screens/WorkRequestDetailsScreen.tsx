import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';

/**
 * Displays detailed information about a specific work request.  End users
 * and service providers can view the status of the request, tags and
 * accepted providers.  Additional actions such as calling a provider
 * could be added here in the future.
 */
const WorkRequestDetailsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { request } = (route.params as any) || {};

  if (!request) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Request not found</Text>
      </View>
    );
  }

  const handleCall = () => {
    Alert.alert('Call Provider', 'Calling feature is not implemented in this demo');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Work Request Details</Text>
      <View style={styles.card}>
        <Text style={styles.item}><Text style={styles.label}>Service:</Text> {request.service}</Text>
        <Text style={styles.item}><Text style={styles.label}>Location:</Text> {request.location?.name}</Text>
        {request.tags && request.tags.length > 0 && (
          <Text style={styles.item}><Text style={styles.label}>Tags:</Text> {request.tags.join(', ')}</Text>
        )}
        <Text style={styles.item}><Text style={styles.label}>Status:</Text> {request.status}</Text>
        {request.boosted && (
          <Text style={styles.item}><Text style={styles.label}>Boosted:</Text> Yes</Text>
        )}
        {request.acceptedProviders && request.acceptedProviders.length > 0 && (
          <Text style={styles.item}><Text style={styles.label}>Accepted By:</Text> {request.acceptedProviders.map((p: any) => p.providerId).join(', ')}</Text>
        )}
      </View>
      {request.acceptedProviders && request.acceptedProviders.length > 0 && (
        <TouchableOpacity style={styles.button} onPress={handleCall}>
          <Text style={styles.buttonText}>Call Provider</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: '#f9fafb',
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 16,
    color: '#111827',
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 24,
  },
  item: {
    fontSize: 16,
    marginBottom: 8,
    color: '#1f2937',
  },
  label: {
    fontWeight: '600',
  },
  button: {
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

export default WorkRequestDetailsScreen;