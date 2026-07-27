import { roundDurationFor } from './roundDuration';

describe('roundDurationFor', () => {
  it('starts at 5 seconds before any correct answers', () => {
    expect(roundDurationFor(0)).toBe(5000);
  });

  it('stays at 5 seconds up through 9 correct answers', () => {
    expect(roundDurationFor(9)).toBe(5000);
  });

  it('drops to 3 seconds starting at the 10th correct answer', () => {
    expect(roundDurationFor(10)).toBe(3000);
  });

  it('stays at 3 seconds well beyond the threshold', () => {
    expect(roundDurationFor(50)).toBe(3000);
  });
});
