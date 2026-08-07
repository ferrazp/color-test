const { withProjectBuildGradle } = require('@expo/config-plugins');

// expo-build-properties' android.kotlinVersion only feeds the "expoLibs" version
// catalog override, which ExpoRootProjectPlugin reads via versionCatalogs.getVersionOrDefault
// — on Expo SDK 57 that override isn't taking effect, so every native module's own
// buildscript block (which reads rootProject.ext.kotlinVersion) still resolves to
// react-native's bundled default (2.1.20), causing Kotlin metadata mismatches against
// newer deps like play-services-ads. Setting ext.kotlinVersion directly, before
// "expo-root-project" applies its setIfNotExist, forces every reader to agree.
module.exports = function withKotlinVersion(config, kotlinVersion) {
  return withProjectBuildGradle(config, (config) => {
    if (config.modResults.language === 'groovy') {
      config.modResults.contents = config.modResults.contents.replace(
        'buildscript {',
        `buildscript {\n  ext.kotlinVersion = "${kotlinVersion}"`
      );
    }
    return config;
  });
};
