import { Stack } from 'expo-router';
import { LanguageProvider } from '../context/LanguageContext';
import { ScoreProvider } from '../context/ScoreContext';
import { SettingsProvider } from '../context/SettingsContext';

export default function RootLayout() {
  return (
    <LanguageProvider>
      <ScoreProvider>
        <SettingsProvider>
          <Stack screenOptions={{ headerShown: false }} />
        </SettingsProvider>
      </ScoreProvider>
    </LanguageProvider>
  );
}
