import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useScore } from '../context/ScoreContext';
import { THEME } from '../lib/theme';
import { logBannerImpression } from '../services/ads';

export function AdBanner() {
  const { adsRemoved } = useScore();

  useEffect(() => {
    logBannerImpression(adsRemoved);
  }, [adsRemoved]);

  if (adsRemoved) {
    return null;
  }

  return (
    <View style={styles.banner}>
      <Text style={styles.text}>Ad banner (mock)</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    height: 50,
    width: '100%',
    borderRadius: 16,
    backgroundColor: '#fff',
    borderWidth: 3,
    borderColor: THEME.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: THEME.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
});
