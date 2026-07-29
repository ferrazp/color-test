# Background music + mute toggle — design

## Context

Two additions requested after the first real-device playthrough of the
Bold Playful redesign:

1. Background music that matches the game's mood.
2. A speaker icon to turn sound on/off.

No composer or licensed track is available. Following the same honest-mock
pattern already established in this codebase for ads/IAP (`services/ads.ts`,
`services/iap.ts` — functional, clearly marked `TODO`, ready to swap for the
real thing), the music is a short synthesized placeholder loop generated
the same way the existing tap/correct/wrong sound effects were (raw PCM
written to a `.wav` file), not a real composed track.

## Scope confirmed with the user

- The mute toggle silences **all sound** (music + tap/correct/wrong sound
  effects) with one control — not music-only.
- Haptics (vibration) are **not** affected by the mute toggle — vibration
  isn't "sound."
- The mute preference persists across sessions (same `AsyncStorage`
  try/catch pattern already used for `bestScore`/`adsRemoved`/
  `hasSeenInstructions`).

## Architecture

A new `context/SettingsContext.tsx` holds `soundEnabled`/`setSoundEnabled`,
persisted the same way as the existing `ScoreContext` flags. This is a
**deliberate new context**, not an addition to `ScoreContext` — a prior
code review of this branch already flagged that a third unrelated
persisted flag on `ScoreContext` would be the right trigger to split
preferences out, and `soundEnabled` is that third flag (after
`adsRemoved`, `hasSeenInstructions`). `ScoreContext` itself is untouched.

`services/sound.ts` and the new `services/music.ts` stay plain,
non-React-aware modules (matching `services/ads.ts`'s existing pattern of
taking a boolean flag as a parameter rather than reading context
internally) — callers pass `soundEnabled` in.

## Components/files

- **`context/SettingsContext.tsx`** (new): `SettingsProvider` +
  `useSettings()` returning `{ soundEnabled, setSoundEnabled }`. Wired into
  `app/_layout.tsx` alongside the existing `LanguageProvider`/`ScoreProvider`.
- **`services/music.ts`** (new): `startMusic(soundEnabled: boolean)`,
  `stopMusic()` — an imperative `expo-audio` player (same technique as
  `services/sound.ts`) that loops a background track. No-ops if
  `soundEnabled` is false. Playback errors are caught and ignored, same as
  every other audio call in this codebase — music must never block
  gameplay.
- **`services/sound.ts`** (modified): `playSound(name, soundEnabled)`
  gains a second required parameter — a no-op when `soundEnabled` is
  false. Every existing call site (`BouncyButton`, `app/game.tsx`) is
  updated to pass it.
- **`app/_layout.tsx`** (modified): starts/stops music based on
  `soundEnabled`, once, at the app root — music plays continuously across
  every screen (menu, how-to-play, game, result), not per-screen.
- **`app/index.tsx`** (modified): adds a speaker icon button (🔊/🔇, styled
  as a small circular comic-panel button consistent with the rest of the
  theme) that calls `setSoundEnabled(!soundEnabled)`. Placed top-right of
  the menu screen.
- **`assets/sounds/music-loop.wav`** (new): a short (a few seconds),
  cheerful, synthesized arcade-style arpeggio loop, generated with the
  same raw-PCM-to-WAV technique already used for `tap.wav`/`correct.wav`/
  `wrong.wav`, marked as a placeholder pending a real licensed/composed
  track.

## Non-goals

- No real composed/licensed music — clearly a placeholder, same honesty
  standard as the ads/IAP mocks.
- No separate volume slider or per-effect mute (music-only vs. SFX-only) —
  one toggle for everything, per the confirmed scope.
- No change to haptics behavior.
- No new npm dependencies — `expo-audio` is already installed and used by
  `services/sound.ts`.
