const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// This is to address an issue with symlinks and monorepos in Metro.
// It's a common workaround for ensuring modules are resolved correctly.
config.resolver.unstable_enableSymlinks = true;

// Fix for @react-native-firebase packages which use `mjs` files.
// Metro doesn't handle them by default.
// See: https://github.com/invertase/react-native-firebase/issues/7527
config.resolver.sourceExts.push('mjs');

module.exports = config;

