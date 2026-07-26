import { generateRound } from './generateRound';

describe('generateRound', () => {
  it('always renders the word in a different ink color', () => {
    for (let i = 0; i < 200; i++) {
      const round = generateRound();
      expect(round.word).not.toBe(round.ink);
    }
  });

  it('always includes the ink color among the options', () => {
    for (let i = 0; i < 200; i++) {
      const round = generateRound();
      expect(round.options).toContain(round.ink);
    }
  });

  it('never repeats a color id within the options', () => {
    for (let i = 0; i < 200; i++) {
      const round = generateRound();
      const unique = new Set(round.options);
      expect(unique.size).toBe(round.options.length);
    }
  });

  it('always returns exactly 4 options', () => {
    const round = generateRound();
    expect(round.options).toHaveLength(4);
  });
});
