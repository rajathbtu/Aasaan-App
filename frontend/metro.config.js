const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Comprehensive fix for React Native Firebase ESM import issues with Node.js v22
config.resolver.alias = {
  "@react-native-firebase/app/lib/common": "@react-native-firebase/app/lib/common/index.js",
  "@react-native-firebase/analytics/lib": "@react-native-firebase/analytics/lib/index.js",
};

// Force CommonJS module resolution
config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];
config.resolver.sourceExts = [...(config.resolver?.sourceExts || []), 'cjs'];

module.exports = config;
