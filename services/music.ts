import { AudioPlayer, createAudioPlayer } from 'expo-audio';

const MUSIC_SOURCE = require('../assets/sounds/music-loop.wav');

let musicPlayer: AudioPlayer | null = null;

function getMusicPlayer(): AudioPlayer | null {
  try {
    if (!musicPlayer) {
      musicPlayer = createAudioPlayer(MUSIC_SOURCE);
      musicPlayer.loop = true;
    }
    return musicPlayer;
  } catch {
    return null;
  }
}

export function startMusic(soundEnabled: boolean): void {
  if (!soundEnabled) {
    return;
  }
  try {
    const player = getMusicPlayer();
    if (!player || player.playing) {
      return;
    }
    player.play();
  } catch {
    // Music must never block gameplay.
  }
}

export function stopMusic(): void {
  try {
    musicPlayer?.pause();
  } catch {
    // Music must never block gameplay.
  }
}
