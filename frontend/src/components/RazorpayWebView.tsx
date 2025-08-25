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

  // Prevent popup windows and handle target=_blank by redirecting inside the same WebView.
  // Also avoid trying to open about:srcdoc externally (causes warnings in RN Linking).
  const injectedJS = `
    (function() {
      try {
        const origOpen = window.open;
        window.open = function(url) {
          if (!url || url.startsWith('about:')) {
            return null;
          }
          window.location.href = url;
          return null;
        };
        document.addEventListener('click', function(e) {
          const a = e.target && e.target.closest ? e.target.closest('a[target="_blank"]') : null;
          if (a && a.href) {
            e.preventDefault();
            if (!a.href.startsWith('about:')) {
              window.location.href = a.href;
            }
          }
        }, true);
      } catch (e) {}
    })();
    true; // note: required for injectedJavaScript
  `;

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
          source={{ html, baseUrl: 'https://checkout.razorpay.com' }}
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
          originWhitelist={["*"]}
          injectedJavaScript={injectedJS}
          javaScriptCanOpenWindowsAutomatically={true}
          // Android: open target=_blank in same WebView instead of new window
          setSupportMultipleWindows={false}
          // iOS/Android: prevent external attempts to open about:srcdoc
          onShouldStartLoadWithRequest={(request) => {
            const url = request.url || '';
            if (url.startsWith('about:srcdoc') || url === 'about:blank') {
              return false; // block external handling
            }
            return true; // allow navigation inside WebView
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
