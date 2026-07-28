import { COLORS, ColorId } from './colors';

export type Round = {
  word: ColorId;
  ink: ColorId;
  options: ColorId[];
};

const ALL_IDS: ColorId[] = COLORS.map((color) => color.id);
const OPTIONS_COUNT = 4;

function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function generateRound(): Round {
  const word = pickRandom(ALL_IDS);
  const ink = pickRandom(ALL_IDS.filter((id) => id !== word));
  const decoyPool = ALL_IDS.filter((id) => id !== ink);
  const decoys = shuffle(decoyPool).slice(0, OPTIONS_COUNT - 1);
  const options = shuffle([ink, ...decoys]);

  return { word, ink, options };
}
