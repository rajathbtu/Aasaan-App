// WebView-based Razorpay integration for Expo Go compatibility
import { api } from './index';
import { CreateOrderResponse, VerifyPaymentRequest, VerifyPaymentResponse } from '../types/razorpay';
import { RazorpayWebPaymentOptions, RazorpayWebResponse } from './razorpayWeb';

// Razorpay configuration
const RAZORPAY_KEY_ID = process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_your_key_id';

export interface PaymentOptions {
  amount: number;
  description: string;
  orderId: string;
  userEmail?: string;
  userContact?: string;
  userName?: string;
}

/**
 * Create Razorpay payment options for WebView
 */
export function createRazorpayOptions(options: PaymentOptions): RazorpayWebPaymentOptions {
  return {
    key: RAZORPAY_KEY_ID,
    amount: options.amount,
    currency: 'INR',
    order_id: options.orderId,
    name: 'Aasaan',
    description: options.description,
    image: 'https://i.imgur.com/3g7nmJC.png', // Your app logo URL
    prefill: {
      email: options.userEmail || '',
      contact: options.userContact || '',
      name: options.userName || '',
    },
    theme: {
      color: '#3399cc',
    },
  };
}

/**
 * Create order for boosting work request
 */
export async function createBoostOrder(token: string, requestId: string): Promise<CreateOrderResponse> {
  try {
    const response = await api.post(
      '/payments/create-boost-order',
      { requestId },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
  } catch (error) {
    console.error('Error creating boost order:', error);
    throw error;
  }
}

/**
 * Verify boost payment
 */
export async function verifyBoostPayment(
  token: string,
  paymentData: VerifyPaymentRequest
): Promise<VerifyPaymentResponse> {
  try {
    const response = await api.post(
      '/payments/verify-boost-payment',
      paymentData,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
  } catch (error) {
    console.error('Error verifying boost payment:', error);
    throw error;
  }
}

/**
 * Create order for subscription
 */
export async function createSubscriptionOrder(
  token: string,
  plan: 'basic' | 'pro'
): Promise<CreateOrderResponse> {
  try {
    const response = await api.post(
      '/payments/create-subscription-order',
      { plan },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
  } catch (error) {
    console.error('Error creating subscription order:', error);
    throw error;
  }
}

/**
 * Verify subscription payment
 */
export async function verifySubscriptionPayment(
  token: string,
  paymentData: VerifyPaymentRequest
): Promise<VerifyPaymentResponse> {
  try {
    const response = await api.post(
      '/payments/verify-subscription-payment',
      paymentData,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
  } catch (error) {
    console.error('Error verifying subscription payment:', error);
    throw error;
  }
}

/**
 * Process complete boost payment flow
 * Note: This now returns payment options instead of processing the payment directly
 * Use RazorpayWebView component to handle the actual payment
 */
export async function createBoostPaymentOptions(
  token: string,
  requestId: string,
  userDetails: { email?: string; contact?: string; name?: string }
): Promise<{ orderData: CreateOrderResponse; paymentOptions: RazorpayWebPaymentOptions }> {
  try {
    // Step 1: Create order
    const orderData = await createBoostOrder(token, requestId);
    
    // Step 2: Create payment options for WebView
    const paymentOptions = createRazorpayOptions({
      amount: orderData.amount,
      description: 'Boost Work Request',
      orderId: orderData.orderId,
      userEmail: userDetails.email,
      userContact: userDetails.contact,
      userName: userDetails.name,
    });

    return { orderData, paymentOptions };
  } catch (error) {
    console.error('Error creating boost payment options:', error);
    throw error;
  }
}

/**
 * Process complete subscription payment flow
 * Note: This now returns payment options instead of processing the payment directly
 * Use RazorpayWebView component to handle the actual payment
 */
export async function createSubscriptionPaymentOptions(
  token: string,
  plan: 'basic' | 'pro',
  userDetails: { email?: string; contact?: string; name?: string }
): Promise<{ orderData: CreateOrderResponse; paymentOptions: RazorpayWebPaymentOptions }> {
  try {
    // Step 1: Create order
    const orderData = await createSubscriptionOrder(token, plan);
    
    // Step 2: Create payment options for WebView
    const paymentOptions = createRazorpayOptions({
      amount: orderData.amount,
      description: `Subscribe to ${plan.charAt(0).toUpperCase() + plan.slice(1)} Plan`,
      orderId: orderData.orderId,
      userEmail: userDetails.email,
      userContact: userDetails.contact,
      userName: userDetails.name,
    });

    return { orderData, paymentOptions };
  } catch (error) {
    console.error('Error creating subscription payment options:', error);
    throw error;
  }
}
