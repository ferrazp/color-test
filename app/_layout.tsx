import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { LanguageProvider } from '../context/LanguageContext';
import { ScoreProvider } from '../context/ScoreContext';
import { SettingsProvider, useSettings } from '../context/SettingsContext';
import { startMusic, stopMusic } from '../services/music';

function MusicController() {
  const { soundEnabled } = useSettings();

  useEffect(() => {
    if (soundEnabled) {
      startMusic(true);
    } else {
      stopMusic();
    }
  }, [soundEnabled]);

  return null;
}

export default function RootLayout() {
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
