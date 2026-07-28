import { router } from 'expo-router';
import { Pressable, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLanguage } from '../context/LanguageContext';
import { useScore } from '../context/ScoreContext';
import { tapFeedback } from '../services/haptics';
import { playSound } from '../services/sound';

export default function MenuScreen() {
  const { t } = useLanguage();
  const { bestScore, hasSeenInstructions } = useScore();

  function handlePlay() {
    tapFeedback();
    playSound('tap');
    router.push(hasSeenInstructions ? '/game' : '/how-to-play');
  }

  function handleHowToPlay() {
    tapFeedback();
    playSound('tap');
    router.push('/how-to-play');
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>{t('appName')}</Text>
      <Text style={styles.bestScore}>
        {t('bestScore')}: {bestScore}
      </Text>
      <Pressable style={styles.playButton} onPress={handlePlay}>
        <Text style={styles.playButtonText}>{t('play')}</Text>
      </Pressable>
      <Pressable style={styles.linkButton} onPress={handleHowToPlay}>
        <Text style={styles.linkButtonText}>{t('howToPlay')}</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
  },
  title: { fontSize: 40, fontWeight: '800', color: '#fff' },
  bestScore: { fontSize: 18, color: '#ccc' },
  playButton: {
    backgroundColor: '#43A047',
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 999,
  },
  playButtonText: { fontSize: 20, fontWeight: '700', color: '#fff' },
  linkButton: { paddingVertical: 8 },
  linkButtonText: { fontSize: 14, color: '#888' },
});
