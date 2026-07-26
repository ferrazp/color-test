import { AudioPlayer, createAudioPlayer } from 'expo-audio';

const SOURCES = {
  tap: require('../assets/sounds/tap.wav'),
  correct: require('../assets/sounds/correct.wav'),
  wrong: require('../assets/sounds/wrong.wav'),
} as const;

type SoundName = keyof typeof SOURCES;

const players: Partial<Record<SoundName, AudioPlayer>> = {};

function getPlayer(name: SoundName): AudioPlayer | null {
  try {
    if (!players[name]) {
      players[name] = createAudioPlayer(SOURCES[name]);
    }
    return players[name] ?? null;
  } catch {
    return null;
  }
}

export async function playSound(name: SoundName): Promise<void> {
  try {
    const player = getPlayer(name);
    if (!player) {
      return;
    }
    await player.seekTo(0);
    player.play();
  } catch {
    // Playback errors must never block gameplay.
  }
}
