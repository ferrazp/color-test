const { withProjectBuildGradle } = require('@expo/config-plugins');

// expo-build-properties' android.kotlinVersion only feeds the "expoLibs" version
// catalog override, which ExpoRootProjectPlugin reads via versionCatalogs.getVersionOrDefault
// — on Expo SDK 57 that override isn't taking effect, so the root build.gradle's own
// `classpath('org.jetbrains.kotlin:kotlin-gradle-plugin')` (no version pinned) still
// resolves to react-native's bundled default (2.1.20).
//
// Setting ext.kotlinVersion alone isn't enough to fix this: every native module's own
// build.gradle interpolates that value into its OWN buildscript's classpath correctly,
// but Gradle's buildscript classloaders are parent-first — the root project's
// classloader is the parent of every subproject's buildscript classloader. Since root
// loads kotlin-gradle-plugin 2.1.20 first (from the unversioned entry), that's the
// class instance every subproject's `apply plugin: 'kotlin-android'` resolves to,
// silently shadowing their own newer classpath declarations. The metadata mismatch
// against newer deps like play-services-ads only surfaces at compileKotlin.
//
// Fix: pin the root's own classpath entry to the same version so nothing upstream
// ever loads an older Kotlin Gradle Plugin in the first place.
module.exports = function withKotlinVersion(config, kotlinVersion) {
  return withProjectBuildGradle(config, (config) => {
    if (config.modResults.language === 'groovy') {
      config.modResults.contents = config.modResults.contents
        .replace('buildscript {', `buildscript {\n  ext.kotlinVersion = "${kotlinVersion}"`)
        .replace(
          "classpath('org.jetbrains.kotlin:kotlin-gradle-plugin')",
          `classpath('org.jetbrains.kotlin:kotlin-gradle-plugin:${kotlinVersion}')`
        );
    }
    return config;
  });
};
