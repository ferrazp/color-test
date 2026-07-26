import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useScore } from '../context/ScoreContext';
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
    borderRadius: 8,
    backgroundColor: '#222',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: '#666',
    fontSize: 12,
  },
});
