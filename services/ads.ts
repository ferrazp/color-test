// TODO: replace with react-native-google-mobile-ads once real Ad Unit IDs exist.
export function showInterstitial(adsRemoved: boolean): void {
  if (adsRemoved) {
    return;
  }
  console.log('[ads mock] would show an interstitial ad now');
}

export function logBannerImpression(adsRemoved: boolean): void {
  if (adsRemoved) {
    return;
  }
  console.log('[ads mock] banner impression');
}
