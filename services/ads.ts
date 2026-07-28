// TODO: replace with react-native-google-mobile-ads once real Ad Unit IDs exist.
// NOTE: sessions can now end in a few seconds (per-round timer), so a real
// SDK integration must apply its own frequency cap — do not fire on every
// call without one, or repeated fast losses will violate ad network policy.
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
