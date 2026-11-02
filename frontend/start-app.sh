#!/bin/bash
# Aasaanly Frontend Startup Script
# Automatically kills existing Expo/Metro processes and starts fresh in Expo Go mode

cd /Users/mac/Downloads/aasaan-app/frontend

echo "🔄 Killing existing Expo/Metro processes..."
pkill -f 'expo start' 2>/dev/null
pkill -f 'metro' 2>/dev/null
pkill -f 'node_modules/.bin/expo' 2>/dev/null
sleep 3

# Verify processes are killed
REMAINING=$(ps aux | grep -E 'expo start|metro' | grep -v grep | wc -l)
if [ "$REMAINING" -gt 0 ]; then
  echo "⚠️  Force-killing remaining processes..."
  ps aux | grep -E 'expo start|metro' | grep -v grep | awk '{print $2}' | xargs -r kill -9 2>/dev/null
  sleep 2
fi

echo "🧹 Clearing Metro cache..."
echo ""
echo "=============================================="
echo "✅ Starting Expo in Expo Go mode"
echo "📱 Scan the QR code in Expo Go app"
echo "🌐 Metro running on: http://localhost:8081"
echo "=============================================="
echo ""

# Run Expo in foreground so keyboard options (s/a/i/w/etc.) work
# --go forces Expo Go mode instead of development build
# -c clears cache
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.10:3000 npx expo start --lan -c --go