import AsyncStorage from '@react-native-async-storage/async-storage';
import { AdEventType, AdsConsent, InterstitialAd, MobileAds } from 'react-native-google-mobile-ads';
import { shouldShowInterstitial } from '../lib/adFrequency';
import { INTERSTITIAL_AD_UNIT_ID } from '../lib/adUnits';

const GAME_OVER_COUNT_KEY = 'colorTest.gameOverCount';

let preloadedInterstitial: InterstitialAd | null = null;

function preloadInterstitial(): void {
  const interstitial = InterstitialAd.createForAdRequest(INTERSTITIAL_AD_UNIT_ID);
  interstitial.addAdEventListener(AdEventType.CLOSED, () => {
    preloadedInterstitial = null;
    preloadInterstitial();
  });
  interstitial.load();
  preloadedInterstitial = interstitial;
}

export async function initAds(): Promise<void> {
  try {
    const consentInfo = await AdsConsent.gatherConsent();
    if (!consentInfo.canRequestAds) {
      return;
    }
    await MobileAds().initialize();
    preloadInterstitial();
  } catch {
    // Ads must never block gameplay.
  }
}

async function nextGameOverCount(): Promise<number> {
  try {
    const stored = await AsyncStorage.getItem(GAME_OVER_COUNT_KEY);
    const next = (Number(stored) || 0) + 1;
    await AsyncStorage.setItem(GAME_OVER_COUNT_KEY, String(next));
    return next;
  } catch {
    return 1;
  }
}

export function showInterstitial(adsRemoved: boolean): void {
  if (adsRemoved) {
    return;
  }
  nextGameOverCount()
    .then((count) => {
      if (!shouldShowInterstitial(count)) {
        return;
      }
      if (preloadedInterstitial?.loaded) {
        preloadedInterstitial.show().catch(() => {
          // Ads must never block gameplay.
        });
      }
    })
    .catch(() => {
      // Ads must never block gameplay.
    });
}
