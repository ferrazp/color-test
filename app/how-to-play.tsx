import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BouncyButton } from '../components/BouncyButton';
import { useLanguage } from '../context/LanguageContext';
import { useScore } from '../context/ScoreContext';
import { THEME } from '../lib/theme';

export default function HowToPlayScreen() {
  const { t, instructionsSteps } = useLanguage();
  const { setHasSeenInstructions } = useScore();

  function handleStart() {
    setHasSeenInstructions(true);
    router.replace('/game');
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>{t('instructionsTitle')}</Text>
        <View style={styles.steps}>
          {instructionsSteps.map((step, index) => (
            <View key={index} style={styles.stepRow}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>{index + 1}</Text>
              </View>
              <Text style={styles.stepText}>{step}</Text>
            </View>
          ))}
        </View>
        <BouncyButton label={t('start')} onPress={handleStart} variant="primary" />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: THEME.background },
  container: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 28,
    padding: 24,
  },
  title: { fontSize: 32, fontWeight: '900', color: THEME.text, letterSpacing: 0.5 },
  steps: { gap: 14, alignSelf: 'stretch' },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: THEME.border,
    padding: 12,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: THEME.text,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  stepNumberText: { color: THEME.background, fontSize: 14, fontWeight: '900' },
  stepText: { flex: 1, fontSize: 15, lineHeight: 21, color: THEME.text, fontWeight: '600' },
});
