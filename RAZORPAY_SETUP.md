# Razorpay Payment Integration Setup Guide

This guide will help you set up secure Razorpay payment integration for the Aasaan app.

## Prerequisites

1. A Razorpay account (Sign up at https://razorpay.com)
2. Razorpay API keys (Test and Live)
3. Backend and Frontend development environments

## Backend Setup

### 1. Environment Variables

Create a `.env` file in the backend directory:

```bash
# Razorpay Configuration
RAZORPAY_KEY_ID=rzp_test_your_key_id_here
RAZORPAY_KEY_SECRET=your_key_secret_here

# Database and other configs...
DATABASE_URL="postgresql://username:password@localhost:5432/aasaan_db"
PORT=3000
NODE_ENV=development
```

### 2. Security Considerations

- **Never expose your Key Secret** in frontend code or version control
- Always verify payment signatures on the backend
- Use HTTPS in production
- Implement proper error handling and logging
- Store payment records for audit trails

### 3. Webhook Setup (Optional but Recommended)

Set up webhooks in your Razorpay dashboard to handle:
- Payment success/failure notifications
- Refund notifications
- Subscription updates

## Frontend Setup

### 1. Environment Variables

Create a `.env` file in the frontend directory:

```bash
# Razorpay Configuration (Public Key Only)
EXPO_PUBLIC_RAZORPAY_KEY_ID=rzp_test_your_key_id_here

# API Configuration
# EXPO_PUBLIC_API_BASE_URL=http://localhost:3000
```

### 2. React Native Razorpay Configuration

The app uses `react-native-razorpay` which requires proper configuration:

- For iOS: No additional setup required
- For Android: Follow the react-native-razorpay documentation for ProGuard rules

## Payment Flow

### 1. Boost Request Payment Flow

```mermaid
sequenceDiagram
    participant User
    participant App
    participant Backend
    participant Razorpay

    User->>App: Click "Pay with Money"
    App->>Backend: POST /payments/create-boost-order
    Backend->>Razorpay: Create Order
    Razorpay-->>Backend: Order Details
    Backend-->>App: Order ID, Amount, Currency
    App->>Razorpay: Open Payment Gateway
    Razorpay-->>App: Payment Response
    App->>Backend: POST /payments/verify-boost-payment
    Backend->>Razorpay: Verify Signature
    Backend->>Backend: Update Request Status
    Backend-->>App: Success Response
```

### 2. Subscription Payment Flow

Similar flow but uses different endpoints:
- `POST /payments/create-subscription-order`
- `POST /payments/verify-subscription-payment`

## Security Features Implemented

### 1. Payment Signature Verification

- All payments are verified using HMAC SHA256 signature
- Prevents tampering with payment amounts or status
- Implements Razorpay's recommended security practices

### 2. Server-Side Validation

- Payment verification happens on the backend
- Double-check payment status with Razorpay API
- Prevent replay attacks and unauthorized access

### 3. Error Handling

- Comprehensive error handling for all Razorpay error codes
- Graceful fallback to credit-based payments
- User-friendly error messages in multiple languages

## Testing

### 1. Test Cards

Use these test card numbers in development:

- **Success**: 4111 1111 1111 1111
- **Failure**: 4000 0000 0000 0002
- **Authentication Required**: 4000 0000 0000 3220

### 2. Test Amounts

- Amounts ending in 00 (e.g., ₹100.00) will succeed
- Amounts ending in 01 (e.g., ₹100.01) will fail

## Production Checklist

### Before Going Live:

1. [ ] Replace test API keys with live keys
2. [ ] Update BASE_URL to production server
3. [ ] Enable webhooks for payment notifications
4. [ ] Set up proper SSL certificates
5. [ ] Implement payment logging and monitoring
6. [ ] Test with real payment methods
7. [ ] Set up refund handling if needed
8. [ ] Configure payment failure notifications
9. [ ] Implement payment retry logic
10. [ ] Add analytics and tracking

### Monitoring and Maintenance:

1. Monitor payment success rates
2. Set up alerts for payment failures
3. Regular security audits
4. Keep Razorpay SDK updated
5. Monitor for new Razorpay features

## Troubleshooting

### Common Issues:

1. **Payment Gateway Not Opening**
   - Check if Razorpay Key ID is correct
   - Ensure proper network connectivity
   - Verify app permissions

2. **Signature Verification Failed**
   - Check Key Secret in backend environment
   - Ensure order ID matches
   - Verify payment ID is valid

3. **Payment Stuck in Processing**
   - Implement webhook handlers
   - Add payment status polling
   - Provide manual verification option

### Error Codes:

- `BAD_REQUEST_ERROR`: Invalid request parameters
- `GATEWAY_ERROR`: Payment gateway issue
- `NETWORK_ERROR`: Connection problems
- `SERVER_ERROR`: Razorpay server issues

## Support

For Razorpay specific issues:
- Documentation: https://razorpay.com/docs/
- Support: https://razorpay.com/support/

For integration issues:
- Check console logs for detailed error messages
- Verify environment variables are set correctly
- Test with Razorpay's test environment first
