#!/bin/bash
# Aasaanly Frontend Startup Script
# Automatically kills existing Expo/Metro processes and starts fresh in Expo Go mode
# Auto-detects the Mac's LAN IP so the app can reach the backend on your phone.
# NOTE: never hardcode an IP here — it goes stale when Wi-Fi renames/reassigns IPs.
# Expo reads EXPO_PUBLIC_API_BASE_URL from frontend/.env; a shell-prefix var
# like `EXPO_PUBLIC_API_BASE_URL=... npx expo start` silently overrides it.

set -e
cd "$(dirname "$0")"

echo "🔄 Killing existing Expo/Metro processes..."
pkill -f 'expo start' 2>/dev/null || true
pkill -f 'metro' 2>/dev/null || true
pkill -f 'node_modules/.bin/expo' 2>/dev/null || true
sleep 3

# Verify processes are killed
REMAINING=$(ps aux | grep -E 'expo start|metro' | grep -v grep | wc -l)
if [ "$REMAINING" -gt 0 ]; then
  echo "⚠️  Force-killing remaining processes..."
  ps aux | grep -E 'expo start|metro' | grep -v grep | awk '{print $2}' | xargs -r kill -9 2>/dev/null || true
  sleep 2
fi

# --- Auto-detect LAN IPv4 (macOS) ---
LAN_IP=$(ipconfig getifaddr en0 2>/dev/null || true)
[ -z "$LAN_IP" ] && LAN_IP=$(ipconfig getifaddr en1 2>/dev/null || true)
if [ -z "$LAN_IP" ]; then
  # Fallback scan of ifconfig output
  LAN_IP=$(ifconfig | awk '/inet / && $2 != "127.0.0.1" {print $2; exit}')
fi
# ---

if [ -n "$LAN_IP" ]; then
  export EXPO_PUBLIC_API_BASE_URL="http://${LAN_IP}:3000"
  echo "🌐 Detected LAN IP: ${LAN_IP}"
  echo "   Using backend: ${EXPO_PUBLIC_API_BASE_URL}"

  # Keep frontend/.env in sync so plain `npx expo start` also works
  if [ -f .env ]; then
    if grep -q "EXPO_PUBLIC_API_BASE_URL=http://${LAN_IP}:3000" .env; then
      echo "   ✅ .env matches current LAN IP"
    else
      echo "   ⚠️  .env has a different EXPO_PUBLIC_API_BASE_URL:"
      grep "EXPO_PUBLIC_API_BASE_URL" .env || true
      echo "   → updating .env to ${EXPO_PUBLIC_API_BASE_URL}"
      # macOS sed -i requires argument; portable approach:
      if sed --version >/dev/null 2>&1; then
        sed -i "s|^EXPO_PUBLIC_API_BASE_URL=.*|EXPO_PUBLIC_API_BASE_URL=${EXPO_PUBLIC_API_BASE_URL}|" .env
      else
        sed -i '' "s|^EXPO_PUBLIC_API_BASE_URL=.*|EXPO_PUBLIC_API_BASE_URL=${EXPO_PUBLIC_API_BASE_URL}|" .env
      fi
    fi
  fi
else
  # No LAN IP detected — fall through to .env as-is (don't override with a stale IP)
  echo "⚠️  Could not detect LAN IP — using .env as-is."
fi

echo "🧹 Clearing Metro cache..."
echo ""
echo "=============================================="
echo "✅ Starting Expo in Expo Go mode"
echo "📱 Scan the QR code in Expo Go app"
echo "🌐 Metro running on: http://localhost:8081 (scan via --lan QR)"
echo "=============================================="
echo ""

# Run Expo in foreground so keyboard options (s/a/i/w/etc.) work
# --go forces Expo Go mode instead of development build
# -c clears cache
npx expo start --lan -c --go