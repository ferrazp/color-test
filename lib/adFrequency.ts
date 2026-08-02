const INTERSTITIAL_FREQUENCY = 3;

export function shouldShowInterstitial(gameOverCount: number): boolean {
  return gameOverCount % INTERSTITIAL_FREQUENCY === 0;
}
