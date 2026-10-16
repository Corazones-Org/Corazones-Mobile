// Build the Expo modules for iOS from source instead of using the precompiled XCFrameworks that
// ship in the npm packages. Those are compiled with a fixed Swift version (6.3.1 in SDK 57), and
// a newer Xcode (Swift 6.4) refuses to import them ("failed to build module 'ExpoModulesCore'").
// The Podfile template reads this key from ios/Podfile.properties.json, which prebuild regenerates
// (`npm run clean`), so it has to be set by a plugin. Remove once Expo ships frameworks that match
// the Xcode in use.
const { withPodfileProperties } = require('expo/config-plugins');

function setPodfileProperties(properties) {
  return { ...properties, EXPO_USE_PRECOMPILED_MODULES: 'false' };
}

function withIosSourceBuiltModules(config) {
  return withPodfileProperties(config, (mod) => {
    mod.modResults = setPodfileProperties(mod.modResults);
    return mod;
  });
}

module.exports = withIosSourceBuiltModules;
module.exports.setPodfileProperties = setPodfileProperties;
