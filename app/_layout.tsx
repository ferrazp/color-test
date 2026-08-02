import { setAudioModeAsync } from 'expo-audio';
import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { LanguageProvider } from '../context/LanguageContext';
import { ScoreProvider } from '../context/ScoreContext';
import { SettingsProvider, useSettings } from '../context/SettingsContext';
import { startMusic, stopMusic } from '../services/music';
import { initAds } from '../services/ads';
import { initIapConnection } from '../services/iap';

function MusicController() {
  const { soundEnabled, settingsLoaded } = useSettings();

  useEffect(() => {
    if (!settingsLoaded) {
      return;
    }
    if (soundEnabled) {
      startMusic(soundEnabled);
    } else {
      stopMusic();
    }
  }, [soundEnabled, settingsLoaded]);

  return null;
}

export default function RootLayout() {
  useEffect(() => {
    setAudioModeAsync({
      playsInSilentMode: true,
      interruptionMode: 'mixWithOthers',
      shouldPlayInBackground: false,
    }).catch(() => {
      // Audio mode is a nice-to-have; failure to set it must not block the app.
    });
  }, []);

  useEffect(() => {
    initAds();
    initIapConnection();
  }, []);

  return (
    <LanguageProvider>
      <ScoreProvider>
        <SettingsProvider>
          <MusicController />
          <Stack screenOptions={{ headerShown: false }} />
        </SettingsProvider>
      </ScoreProvider>
    </LanguageProvider>
  );
}
