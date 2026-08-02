import { shouldShowInterstitial } from './adFrequency';

describe('shouldShowInterstitial', () => {
  it('does not show on the 1st or 2nd game-over', () => {
    expect(shouldShowInterstitial(1)).toBe(false);
    expect(shouldShowInterstitial(2)).toBe(false);
  });

  it('shows on the 3rd game-over', () => {
    expect(shouldShowInterstitial(3)).toBe(true);
  });

  it('does not show on the 4th or 5th game-over', () => {
    expect(shouldShowInterstitial(4)).toBe(false);
    expect(shouldShowInterstitial(5)).toBe(false);
  });

  it('shows again on the 6th game-over', () => {
    expect(shouldShowInterstitial(6)).toBe(true);
  });

  it('shows on the 9th game-over (three cycles in)', () => {
    expect(shouldShowInterstitial(9)).toBe(true);
  });
});
