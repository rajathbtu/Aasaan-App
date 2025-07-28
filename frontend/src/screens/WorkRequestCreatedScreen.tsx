import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';

/**
 * Confirmation screen displayed after a work request has been created.
 * Shows a summary of the request and offers the user the option to
 * boost the request for increased visibility or proceed to their list
 * of requests.  Boosting triggers a payment flow handled in a
 * separate screen.
 */
const WorkRequestCreatedScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { request } = (route.params as any) || {};

  const goToMyRequests = () => {
    // Navigate to the main tab navigator and specify the MyRequests tab
    navigation.navigate('Main', { screen: 'MyRequests' });
  };

  const handleBoost = () => {
    navigation.navigate('BoostRequest', { request });
  };

  if (!request) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Request created!</Text>
        <TouchableOpacity style={styles.primaryButton} onPress={goToMyRequests}>
          <Text style={styles.primaryText}>Go to My Requests</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Request Created</Text>
      <View style={styles.summaryCard}>
        <Text style={styles.summaryItem}><Text style={styles.summaryLabel}>Service:</Text> {request.service}</Text>
        <Text style={styles.summaryItem}><Text style={styles.summaryLabel}>Location:</Text> {request.location.name}</Text>
        {request.tags && request.tags.length > 0 && (
          <Text style={styles.summaryItem}><Text style={styles.summaryLabel}>Tags:</Text> {request.tags.join(', ')}</Text>
        )}
      </View>
      <TouchableOpacity style={styles.primaryButton} onPress={handleBoost}>
        <Text style={styles.primaryText}>Boost Request</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.secondaryButton} onPress={goToMyRequests}>
        <Text style={styles.secondaryText}>View My Requests</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    backgroundColor: '#f9fafb',
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 20,
    textAlign: 'center',
    color: '#111827',
  },
  summaryCard: {
    backgroundColor: '#eef2ff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
  },
  summaryItem: {
    fontSize: 16,
    marginBottom: 8,
    color: '#1f2937',
  },
  summaryLabel: {
    fontWeight: '600',
  },
  primaryButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#e5e7eb',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  secondaryText: {
    color: '#1f2937',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default WorkRequestCreatedScreen;