// Test script to verify GA4 connection
require('dotenv').config();
const { trackCustomEvent } = require('./dist/utils/analytics');

console.log('Testing GA4 connection...');
console.log('GA4_MEASUREMENT_ID:', process.env.GA4_MEASUREMENT_ID);
console.log('GA4_API_SECRET:', process.env.GA4_API_SECRET ? '✓ Set' : '✗ Missing');

// Test analytics call
trackCustomEvent('test-user-123', 'test_event', {
  test_property: 'analytics_setup',
  timestamp: new Date().toISOString()
});

console.log('Test event sent to GA4!');