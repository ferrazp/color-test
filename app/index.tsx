import { router } from 'expo-router';
import { StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BouncyButton } from '../components/BouncyButton';
import { useLanguage } from '../context/LanguageContext';
import { useScore } from '../context/ScoreContext';
import { THEME } from '../lib/theme';

export default function MenuScreen() {
  const { t } = useLanguage();
  const { bestScore, hasSeenInstructions } = useScore();

  function handlePlay() {
    router.push(hasSeenInstructions ? '/game' : '/how-to-play');
  }

  function handleHowToPlay() {
    router.push('/how-to-play');
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>{t('appName')}</Text>
      <Text style={styles.bestScore}>
        {t('bestScore')}: {bestScore}
      </Text>
      <BouncyButton label={t('play')} onPress={handlePlay} variant="primary" />
      <BouncyButton label={t('howToPlay')} onPress={handleHowToPlay} variant="link" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
  },
  title: { fontSize: 44, fontWeight: '900', color: THEME.text, letterSpacing: 0.5 },
  bestScore: { fontSize: 18, color: THEME.textMuted, fontWeight: '600' },
});
