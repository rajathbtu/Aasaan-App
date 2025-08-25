// Type definitions for Razorpay integration
declare namespace Razorpay {
  interface OrderOptions {
    amount: number;
    currency: string;
    receipt?: string;
    notes?: Record<string, string>;
  }

  interface Order {
    id: string;
    entity: string;
    amount: number;
    amount_paid: number;
    amount_due: number;
    currency: string;
    receipt: string;
    offer_id?: string;
    status: 'created' | 'attempted' | 'paid';
    attempts: number;
    notes: Record<string, string>;
    created_at: number;
  }

  interface Payment {
    id: string;
    entity: string;
    amount: number;
    currency: string;
    status: 'created' | 'authorized' | 'captured' | 'refunded' | 'failed';
    order_id: string;
    invoice_id?: string;
    international: boolean;
    method: string;
    amount_refunded: number;
    refund_status?: string;
    captured: boolean;
    description?: string;
    card_id?: string;
    bank?: string;
    wallet?: string;
    vpa?: string;
    email: string;
    contact: string;
    notes: Record<string, string>;
    fee?: number;
    tax?: number;
    error_code?: string;
    error_description?: string;
    error_source?: string;
    error_step?: string;
    error_reason?: string;
    acquirer_data?: Record<string, any>;
    created_at: number;
  }

  interface VerifyPaymentParams {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }
}