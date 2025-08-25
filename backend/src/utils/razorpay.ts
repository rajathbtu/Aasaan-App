import Razorpay from 'razorpay';
import crypto from 'crypto';

// Initialize Razorpay instance
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || '',
  key_secret: process.env.RAZORPAY_KEY_SECRET || '',
});

export interface CreateOrderParams {
  amount: number; // amount in paise (smallest currency unit)
  currency?: string;
  receipt?: string;
  notes?: Record<string, string>;
}

export interface VerifyPaymentParams {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

/**
 * Create a new Razorpay order
 */
export async function createOrder(params: CreateOrderParams) {
  try {
    // Generate a short receipt ID (max 40 characters)
    const shortId = Math.random().toString(36).substring(2, 15);
    const receipt = params.receipt || `rcpt_${shortId}`;
    
    const options = {
      amount: params.amount, // amount in smallest currency unit
      currency: params.currency || 'INR',
      receipt: receipt.substring(0, 40), // Ensure max 40 characters
      notes: params.notes || {},
    };

    const order = await razorpay.orders.create(options);
    return order;
  } catch (error) {
    console.error('Error creating Razorpay order:', error);
    throw new Error('Failed to create payment order');
  }
}

/**
 * Verify Razorpay payment signature for security
 */
export function verifyPaymentSignature(params: VerifyPaymentParams): boolean {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = params;
    
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '')
      .update(body.toString())
      .digest('hex');

    return expectedSignature === razorpay_signature;
  } catch (error) {
    console.error('Error verifying payment signature:', error);
    return false;
  }
}

/**
 * Fetch payment details from Razorpay
 */
export async function getPaymentDetails(paymentId: string) {
  try {
    const payment = await razorpay.payments.fetch(paymentId);
    return payment;
  } catch (error) {
    console.error('Error fetching payment details:', error);
    throw new Error('Failed to fetch payment details');
  }
}

/**
 * Capture payment (for payments that are authorized but not captured)
 */
export async function capturePayment(paymentId: string, amount: number) {
  try {
    const payment = await razorpay.payments.capture(paymentId, amount, 'INR');
    return payment;
  } catch (error) {
    console.error('Error capturing payment:', error);
    throw new Error('Failed to capture payment');
  }
}

/**
 * Create refund for a payment
 */
export async function createRefund(paymentId: string, amount?: number, notes?: Record<string, string>) {
  try {
    const refundOptions: any = {
      notes: notes || {},
    };
    
    if (amount) {
      refundOptions.amount = amount;
    }

    const refund = await razorpay.payments.refund(paymentId, refundOptions);
    return refund;
  } catch (error) {
    console.error('Error creating refund:', error);
    throw new Error('Failed to create refund');
  }
}

export default razorpay;
