const appJson = require('./app.json');

// CI overrides (see .github/workflows/deploy.yml -> android-release).
// These are read ONLY when the env vars are set, so local builds keep using
// the values committed in app.json and app behaviour is unchanged.
const ciVersionCode = Number(process.env.AASAAN_ANDROID_VERSION_CODE);
const ciBuildNumber = Number(process.env.AASAAN_IOS_BUILD_NUMBER);

module.exports = {
  ...appJson,
  expo: {
    ...appJson.expo,
    ios: {
      ...appJson.expo.ios,
      ...(Number.isInteger(ciBuildNumber) && ciBuildNumber > 0
        ? { buildNumber: String(ciBuildNumber) }
        : {}),
    },
    android: {
      ...appJson.expo.android,
      // Monotonic versionCode. Google Play rejects an upload whose versionCode
      // is not strictly greater than the last published one, so CI supplies a
      // guaranteed-increasing value instead of the static app.json value.
      ...(Number.isInteger(ciVersionCode) && ciVersionCode > 0
        ? { versionCode: ciVersionCode }
        : {}),
      config: {
        ...appJson.expo.android.config,
        googleMaps: {
          ...appJson.expo.android.config?.googleMaps,
          apiKey: process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY || '',
        },
      },
    },
  },
};