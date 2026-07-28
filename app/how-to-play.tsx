import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLanguage } from '../context/LanguageContext';
import { useScore } from '../context/ScoreContext';
import { tapFeedback } from '../services/haptics';
import { playSound } from '../services/sound';

export default function HowToPlayScreen() {
  const { t, instructionsSteps } = useLanguage();
  const { setHasSeenInstructions } = useScore();

  function handleStart() {
    tapFeedback();
    playSound('tap');
    setHasSeenInstructions(true);
    router.replace('/game');
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>{t('instructionsTitle')}</Text>
      <View style={styles.steps}>
        {instructionsSteps.map((step, index) => (
          <Text key={index} style={styles.step}>
            {index + 1}. {step}
          </Text>
        ))}
      </View>
      <Pressable style={styles.startButton} onPress={handleStart}>
        <Text style={styles.startButtonText}>{t('start')}</Text>
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
    padding: 24,
  },
  title: { fontSize: 28, fontWeight: '800', color: '#fff' },
  steps: { gap: 12, alignSelf: 'stretch' },
  step: { fontSize: 16, color: '#ccc', lineHeight: 22 },
  startButton: {
    backgroundColor: '#43A047',
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 999,
  },
  startButtonText: { fontSize: 20, fontWeight: '700', color: '#fff' },
});
