import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AdBanner } from '../components/AdBanner';
import { BouncyButton } from '../components/BouncyButton';
import { useLanguage } from '../context/LanguageContext';
import { useScore } from '../context/ScoreContext';
import { hexFor } from '../lib/colors';
import { THEME } from '../lib/theme';
import { purchaseRemoveAds } from '../services/iap';

export default function ResultScreen() {
  const { t } = useLanguage();
  const { score, adsRemoved, wasNewBest, setAdsRemoved } = useScore();
  const [purchasing, setPurchasing] = useState(false);

  function handlePlayAgain() {
    router.replace('/game');
  }

  function handleMenu() {
    router.replace('/');
  }

  async function handleRemoveAds() {
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
      <BouncyButton label={t('playAgain')} onPress={handlePlayAgain} variant="primary" />
      <BouncyButton label={t('menu')} onPress={handleMenu} variant="secondary" />
      {!adsRemoved && (
        <BouncyButton
          label={purchasing ? t('purchasing') : t('removeAds')}
          onPress={handleRemoveAds}
          variant="link"
          disabled={purchasing}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    padding: 24,
  },
  score: { fontSize: 30, fontWeight: '900', color: THEME.text },
  newBest: { fontSize: 16, color: hexFor('orange'), fontWeight: '800' },
});
