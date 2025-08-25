declare module 'react-native-razorpay' {
  export interface RazorpayOptions {
    description: string;
    image?: string;
    currency: string;
    key: string;
    amount: number;
    name: string;
    order_id?: string;
    prefill?: {
      email?: string;
      contact?: string;
      name?: string;
    };
    theme?: {
      color?: string;
    };
    modal?: {
      backdropclose?: boolean;
      escape?: boolean;
      handleback?: boolean;
      confirm_close?: boolean;
      ondismiss?: () => void;
      animation?: boolean;
    };
    notes?: Record<string, string>;
    retry?: {
      enabled?: boolean;
      max_count?: number;
    };
    remember_customer?: boolean;
    timeout?: number;
    readonly?: {
      email?: boolean;
      contact?: boolean;
      name?: boolean;
    };
    hidden?: {
      email?: boolean;
      contact?: boolean;
      name?: boolean;
    };
    send_sms_hash?: boolean;
    allow_rotation?: boolean;
    orientation?: number;
    external?: {
      wallets?: string[];
    };
  }

  export interface RazorpayResponse {
    razorpay_payment_id: string;
    razorpay_order_id?: string;
    razorpay_signature?: string;
  }

  export interface RazorpayErrorResponse {
    code: string;
    description: string;
    source: string;
    step: string;
    reason: string;
    metadata: {
      order_id?: string;
      payment_id?: string;
    };
  }

  interface RazorpayStatic {
    open(options: RazorpayOptions): Promise<RazorpayResponse>;
  }

  const RazorpayCheckout: RazorpayStatic;
  export default RazorpayCheckout;
}

// Additional types for our payment integration
export interface PaymentOrder {
  orderId: string;
  amount: number;
  currency: string;
  receipt: string;
  plan?: 'basic' | 'pro';
}

export interface CreateOrderResponse {
  orderId: string;
  amount: number;
  currency: string;
  receipt: string;
  plan?: string;
}

export interface VerifyPaymentRequest {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  requestId?: string;
  plan?: 'basic' | 'pro';
}

export interface VerifyPaymentResponse {
  success: boolean;
  workRequest?: any;
  user?: any;
  paymentId: string;
}