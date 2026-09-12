const appJson = require('./app.json');

module.exports = {
  ...appJson,
  expo: {
    ...appJson.expo,
    android: {
      ...appJson.expo.android,
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