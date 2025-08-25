import { Alert } from 'react-native';

/**
 * Utility functions for payment processing and error handling
 */

export interface PaymentErrorInfo {
  title: string;
  message: string;
  retryable: boolean;
}

/**
 * Map Razorpay error codes to user-friendly messages
 */
export function getPaymentErrorInfo(error: any, t: (key: string) => string): PaymentErrorInfo {
  if (!error) {
    return {
      title: t('common.error'),
      message: t('payment.unknown'),
      retryable: true,
    };
  }

  // Handle Razorpay specific error codes
  switch (error.code) {
    case 'BAD_REQUEST_ERROR':
      return {
        title: t('common.error'),
        message: t('payment.badRequest'),
        retryable: false,
      };
    
    case 'GATEWAY_ERROR':
      return {
        title: t('payment.gatewayError'),
        message: t('payment.gatewayError'),
        retryable: true,
      };
    
    case 'NETWORK_ERROR':
      return {
        title: t('payment.networkError'),
        message: t('payment.networkError'),
        retryable: true,
      };
    
    case 'SERVER_ERROR':
      return {
        title: t('payment.serverError'),
        message: t('payment.serverError'),
        retryable: true,
      };
    
    case 'PAYMENT_CANCELLED':
      return {
        title: t('payment.cancelled'),
        message: t('payment.cancelled'),
        retryable: true,
      };
    
    case 'PAYMENT_TIMEOUT':
      return {
        title: t('payment.timeout'),
        message: t('payment.timeout'),
        retryable: true,
      };
    
    default:
      return {
        title: t('common.error'),
        message: error.description || error.message || t('payment.unknown'),
        retryable: true,
      };
  }
}

/**
 * Show payment error alert with appropriate retry options
 */
export function showPaymentErrorAlert(
  error: any, 
  t: (key: string) => string, 
  onRetry?: () => void
): void {
  const errorInfo = getPaymentErrorInfo(error, t);
  
  const buttons: any[] = [
    {
      text: t('common.cancel'),
      style: 'cancel',
    },
  ];
  
  if (errorInfo.retryable && onRetry) {
    buttons.push({
      text: 'Retry',
      onPress: onRetry,
    });
  }
  
  Alert.alert(errorInfo.title, errorInfo.message, buttons);
}

/**
 * Format amount for display (convert paise to rupees)
 */
export function formatAmount(amountInPaise: number): string {
  const rupees = amountInPaise / 100;
  return `₹${rupees.toFixed(2)}`;
}

/**
 * Convert rupees to paise for Razorpay
 */
export function rupeesToPaise(rupees: number): number {
  return Math.round(rupees * 100);
}

/**
 * Validate payment amount
 */
export function isValidPaymentAmount(amount: number): boolean {
  return amount > 0 && amount <= 1500000; // Max ₹15,000 per transaction
}

/**
 * Generate unique receipt ID
 */
export function generateReceiptId(prefix: string, userId: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}_${userId}_${timestamp}_${random}`;
}

/**
 * Mask sensitive payment information for logging
 */
export function maskPaymentInfo(paymentInfo: any): any {
  if (!paymentInfo) return paymentInfo;
  
  const masked = { ...paymentInfo };
  
  // Mask sensitive fields
  if (masked.razorpay_payment_id) {
    masked.razorpay_payment_id = maskString(masked.razorpay_payment_id);
  }
  
  if (masked.razorpay_signature) {
    masked.razorpay_signature = maskString(masked.razorpay_signature);
  }
  
  if (masked.contact) {
    masked.contact = maskPhoneNumber(masked.contact);
  }
  
  if (masked.email) {
    masked.email = maskEmail(masked.email);
  }
  
  return masked;
}

function maskString(str: string): string {
  if (!str || str.length < 8) return '***';
  return str.substring(0, 4) + '***' + str.substring(str.length - 4);
}

function maskPhoneNumber(phone: string): string {
  if (!phone || phone.length < 6) return '***';
  return phone.substring(0, 2) + '***' + phone.substring(phone.length - 2);
}

function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return '***';
  const [local, domain] = email.split('@');
  const maskedLocal = local.length > 2 
    ? local.substring(0, 2) + '***' 
    : '***';
  return `${maskedLocal}@${domain}`;
}
