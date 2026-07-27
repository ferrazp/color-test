const ROUND_MS_INITIAL = 5_000;
const ROUND_MS_FAST = 3_000;
const FAST_MODE_THRESHOLD_CORRECT = 10;

export function roundDurationFor(correctCount: number): number {
  return correctCount >= FAST_MODE_THRESHOLD_CORRECT ? ROUND_MS_FAST : ROUND_MS_INITIAL;
}
