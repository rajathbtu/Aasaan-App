import React, { useState } from 'react';
import {
  Modal,
  View,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Alert,
  TouchableOpacity,
  Text,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { RazorpayWebPaymentOptions, RazorpayWebResponse, RazorpayWeb } from '../api/razorpayWeb';

interface RazorpayWebViewProps {
  visible: boolean;
  options: RazorpayWebPaymentOptions;
  onSuccess: (response: RazorpayWebResponse) => void;
  onError: (error: any) => void;
  onCancel: () => void;
}

export const RazorpayWebView: React.FC<RazorpayWebViewProps> = ({
  visible,
  options,
  onSuccess,
  onError,
  onCancel,
}) => {
  const [loading, setLoading] = useState(true);

  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      
      switch (data.type) {
        case 'success':
          onSuccess(data.data);
          break;
        case 'error':
          onError(data.data || { description: data.message || 'Payment failed' });
          break;
        case 'cancel':
          onCancel();
          break;
        default:
          console.log('Unknown message type:', data.type);
      }
    } catch (error) {
      console.error('Error parsing WebView message:', error);
      onError({ description: 'Failed to process payment response' });
    }
  };

  const handleClose = () => {
    Alert.alert(
      'Cancel Payment',
      'Are you sure you want to cancel this payment?',
      [
        {
          text: 'Continue Payment',
          style: 'cancel',
        },
        {
          text: 'Cancel Payment',
          style: 'destructive',
          onPress: onCancel,
        },
      ]
    );
  };

  if (!visible) return null;

  const html = RazorpayWeb.generatePaymentHTML(options);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Payment</Text>
          <View style={styles.placeholder} />
        </View>

        {/* WebView */}
        <WebView
          source={{ html }}
          style={styles.webview}
          onMessage={handleMessage}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          startInLoadingState={true}
          onLoadStart={() => setLoading(true)}
          onLoadEnd={() => setLoading(false)}
          onError={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            console.error('WebView error:', nativeEvent);
            onError({ description: 'Failed to load payment page' });
          }}
          onHttpError={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            console.error('WebView HTTP error:', nativeEvent);
            onError({ description: 'Payment service unavailable' });
          }}
          mixedContentMode="compatibility"
          allowsInlineMediaPlayback={true}
          mediaPlaybackRequiresUserAction={false}
          bounces={false}
          scrollEnabled={true}
          showsVerticalScrollIndicator={false}
          showsHorizontalScrollIndicator={false}
        />

        {loading && (
          <View style={styles.loadingOverlay}>
            <Text style={styles.loadingText}>Loading payment...</Text>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  closeButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  placeholder: {
    width: 40,
  },
  webview: {
    flex: 1,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 10,
  },
});

export default RazorpayWebView;
