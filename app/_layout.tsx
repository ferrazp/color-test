import { Stack } from 'expo-router';
import { LanguageProvider } from '../context/LanguageContext';
import { ScoreProvider } from '../context/ScoreContext';

export default function RootLayout() {
  return (
    <LanguageProvider>
      <ScoreProvider>
        <Stack screenOptions={{ headerShown: false }} />
      </ScoreProvider>
    </LanguageProvider>
  );
}
