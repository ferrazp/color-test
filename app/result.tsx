import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AdBanner } from '../components/AdBanner';
import { useLanguage } from '../context/LanguageContext';
import { useScore } from '../context/ScoreContext';
import { purchaseRemoveAds } from '../services/iap';
import { tapFeedback } from '../services/haptics';
import { playSound } from '../services/sound';

export default function ResultScreen() {
  const { t } = useLanguage();
  const { score, bestScore, adsRemoved, wasNewBest, setAdsRemoved } = useScore();
  const [purchasing, setPurchasing] = useState(false);

  function handlePlayAgain() {
    tapFeedback();
    playSound('tap');
    router.replace('/game');
  }

  function handleMenu() {
    tapFeedback();
    playSound('tap');
    router.replace('/');
  }

  async function handleRemoveAds() {
    tapFeedback();
    playSound('tap');
    setPurchasing(true);
    try {
      const success = await purchaseRemoveAds();
      if (success) {
        setAdsRemoved(true);
      }
    } finally {
      setPurchasing(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.score}>
        {t('finalScore')}: {score}
      </Text>
      {wasNewBest && <Text style={styles.newBest}>{t('newBest')}</Text>}
      <AdBanner />
      <Pressable style={styles.primaryButton} onPress={handlePlayAgain}>
        <Text style={styles.primaryButtonText}>{t('playAgain')}</Text>
      </Pressable>
      <Pressable style={styles.secondaryButton} onPress={handleMenu}>
        <Text style={styles.secondaryButtonText}>{t('menu')}</Text>
      </Pressable>
      {!adsRemoved && (
        <Pressable style={styles.linkButton} onPress={handleRemoveAds} disabled={purchasing}>
          <Text style={styles.linkButtonText}>{purchasing ? t('purchasing') : t('removeAds')}</Text>
        </Pressable>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    padding: 24,
  },
  score: { fontSize: 28, fontWeight: '800', color: '#fff' },
  newBest: { fontSize: 16, color: '#FDD835', fontWeight: '700' },
  primaryButton: {
    backgroundColor: '#43A047',
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 999,
  },
  primaryButtonText: { fontSize: 18, fontWeight: '700', color: '#fff' },
  secondaryButton: { paddingVertical: 10 },
  secondaryButtonText: { fontSize: 16, color: '#ccc' },
  linkButton: { paddingVertical: 8 },
  linkButtonText: { fontSize: 14, color: '#888' },
});
