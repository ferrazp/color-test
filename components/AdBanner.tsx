import { StyleSheet, View } from 'react-native';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';
import { useScore } from '../context/ScoreContext';
import { BANNER_AD_UNIT_ID } from '../lib/adUnits';

export function AdBanner() {
  const { adsRemoved } = useScore();

  if (adsRemoved) {
    return null;
  }

  return (
    <View style={styles.container}>
      <BannerAd unitId={BANNER_AD_UNIT_ID} size={BannerAdSize.LARGE_ANCHORED_ADAPTIVE_BANNER} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
  },
});
