import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';

/**
 * A simple splash screen shown on startup.  It displays the app name
 * briefly and then navigates to the language selection page.  In a real
 * application you might perform initialisation such as preloading
 * resources or checking the authentication state here.  We defer to the
 * authentication context in the root navigator for persistent login.
 */
const LaunchScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  useEffect(() => {
    const timer = setTimeout(() => {
      navigation.navigate('LanguageSelection');
    }, 1000);
    return () => clearTimeout(timer);
  }, [navigation]);
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Aasaan</Text>
      <Text style={styles.subtitle}>Connecting you with local help</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#2563eb',
  },
  title: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#e0e7ff',
  },
});

export default LaunchScreen;