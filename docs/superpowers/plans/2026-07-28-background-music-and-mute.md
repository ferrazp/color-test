# Background Music and Mute Toggle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a looping background music placeholder that plays across every screen, and a speaker icon on the menu that mutes/unmutes all sound (music + tap/correct/wrong effects), with the mute preference persisted across sessions.

**Architecture:** A new `SettingsContext` (mirroring the existing `ScoreContext` persistence pattern) holds the `soundEnabled` flag. `services/sound.ts` and a new `services/music.ts` stay plain, non-React-aware modules — screens read `soundEnabled` from context and pass it in as a parameter, matching the existing `services/ads.ts` pattern of taking flags rather than reading context internally.

**Tech Stack:** Same as the rest of the app — `expo-audio` (already installed, already used by `services/sound.ts`), `@react-native-async-storage/async-storage` (already installed, already used by `ScoreContext`), no new dependencies.

## Global Constraints

- The mute toggle silences **all sound** (music + tap/correct/wrong effects) with one control, per the confirmed spec — not music-only.
- Haptics (vibration) are **not** affected by the mute toggle — leave `services/haptics.ts` and every `tapFeedback()`/`successFeedback()`/`errorFeedback()` call site untouched.
- The music is an honest synthesized placeholder (same raw-PCM-to-WAV technique already used for `tap.wav`/`correct.wav`/`wrong.wav`), not a real composed track — this is expected and matches the existing `services/ads.ts`/`services/iap.ts` mock pattern in this codebase.
- No new npm dependencies.
- `lib/` stays pure (no RN/React imports) — the new `IconButton` component is not pure UI-agnostic logic, so it belongs in `components/`, not `lib/`.
- This project has no ESLint configured — no `eslint-disable` comments.
- Verification: `npx tsc --noEmit` and `npx jest` (expect 8/8, unchanged — this plan adds no new pure-logic files) after every task; a final manual playthrough (build + real-device or `expo start` check) after the last task, consistent with how every prior UI-facing plan in this project was verified.

---

## File Structure

```
context/
  SettingsContext.tsx      # new: soundEnabled flag, persisted
app/
  _layout.tsx                # modified: wire SettingsProvider + start/stop music
  index.tsx                    # modified: speaker icon button
services/
  music.ts                      # new: loop background music, respects soundEnabled
  sound.ts                       # modified: playSound() takes a soundEnabled parameter
components/
  BouncyButton.tsx                 # modified: passes soundEnabled to playSound
  IconButton.tsx                     # new: small circular icon button (speaker toggle)
locales/
  en.json es.json pt.json fr.json de.json   # modified: + muteSound/unmuteSound keys
assets/sounds/
  music-loop.wav                       # new: synthesized placeholder loop
```

---

### Task 1: SettingsContext

**Files:**
- Create: `context/SettingsContext.tsx`

**Interfaces:**
- Produces: `SettingsProvider({ children }: { children: ReactNode })`, `useSettings(): { soundEnabled: boolean; setSoundEnabled: (value: boolean) => void }`.
- Consumed by: Task 2 (`app/_layout.tsx`), Task 4 (`components/BouncyButton.tsx`, `app/game.tsx`), Task 5 (`app/index.tsx`).

- [ ] **Step 1: Create the context**

Create `context/SettingsContext.tsx`:
```tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ReactNode, createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const SOUND_ENABLED_KEY = 'colorTest.soundEnabled';

type SettingsContextValue = {
  soundEnabled: boolean;
  setSoundEnabled: (value: boolean) => void;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [soundEnabled, setSoundEnabledState] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(SOUND_ENABLED_KEY);
        if (stored !== null) {
          setSoundEnabledState(stored === 'true');
        }
      } catch {
        // Keep the default of true if storage is unavailable.
      }
    })();
  }, []);

  const setSoundEnabled = useCallback((value: boolean) => {
    setSoundEnabledState(value);
    AsyncStorage.setItem(SOUND_ENABLED_KEY, String(value)).catch(() => {
      // Flag still updates in memory even if persistence fails.
    });
  }, []);

  const value = useMemo(() => ({ soundEnabled, setSoundEnabled }), [soundEnabled, setSoundEnabled]);

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add context/SettingsContext.tsx
git commit -m "Add SettingsContext for persisted sound-enabled preference"
```

---

### Task 2: Wire SettingsProvider into the root layout

**Files:**
- Modify: `app/_layout.tsx`

**Interfaces:**
- Consumes: `SettingsProvider` (Task 1).

- [ ] **Step 1: Add the provider**

Replace `app/_layout.tsx`:
```tsx
import { Stack } from 'expo-router';
import { LanguageProvider } from '../context/LanguageContext';
import { ScoreProvider } from '../context/ScoreContext';
import { SettingsProvider } from '../context/SettingsContext';

export default function RootLayout() {
  return (
    <LanguageProvider>
      <ScoreProvider>
        <SettingsProvider>
          <Stack screenOptions={{ headerShown: false }} />
        </SettingsProvider>
      </ScoreProvider>
    </LanguageProvider>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/_layout.tsx
git commit -m "Wire SettingsProvider into the root layout"
```

---

### Task 3: Background music service + placeholder track + playback wiring

**Files:**
- Create: `assets/sounds/music-loop.wav`
- Create: `services/music.ts`
- Modify: `app/_layout.tsx`

**Interfaces:**
- Consumes: `useSettings` (Task 1/2).
- Produces: `startMusic(soundEnabled: boolean): void`, `stopMusic(): void` (`services/music.ts`).

- [ ] **Step 1: Generate the placeholder music loop**

Create a temporary generator script at the project root, `scripts-tmp-gen-music.js`:
```js
const fs = require('fs');
const path = require('path');

function writeWav(filePath, samples, sampleRate) {
  const dataSize = samples.length * 2;
  const buffer = Buffer.alloc(44 + dataSize);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);
  for (let i = 0; i < samples.length; i++) {
    buffer.writeInt16LE(samples[i], 44 + i * 2);
  }
  fs.writeFileSync(filePath, buffer);
}

function noteSamples(freq, durationSec, sampleRate, amplitude) {
  const n = Math.floor(sampleRate * durationSec);
  const samples = new Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    const envelope = Math.sin((Math.PI * i) / n);
    samples[i] = Math.round(Math.sin(2 * Math.PI * freq * t) * amplitude * envelope);
  }
  return samples;
}

const sampleRate = 22050;
const amplitude = 6000;
const noteDuration = 0.18;
const notes = [261.63, 329.63, 392.0, 523.25, 392.0, 329.63, 261.63, 329.63];

let samples = [];
for (const freq of notes) {
  samples = samples.concat(noteSamples(freq, noteDuration, sampleRate, amplitude));
}

writeWav(path.join(__dirname, 'assets/sounds/music-loop.wav'), samples, sampleRate);
console.log('wrote assets/sounds/music-loop.wav', samples.length, 'samples at', sampleRate, 'Hz');
```

- [ ] **Step 2: Run the generator and remove the temporary script**

Run: `node scripts-tmp-gen-music.js`
Expected: prints `wrote assets/sounds/music-loop.wav ...` and creates the file.

Then: `rm scripts-tmp-gen-music.js` (bash) or `Remove-Item scripts-tmp-gen-music.js` (PowerShell).

Each note in this sequence uses a bell-shaped envelope (`sin(π·i/n)`) that starts and ends at zero amplitude, so consecutive notes never click and the whole file starts and ends at silence — this makes it loop cleanly when played with `loop = true` (Step 4 below), with no seam pop.

- [ ] **Step 3: Create the music service**

Create `services/music.ts`:
```ts
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
```

- [ ] **Step 4: Wire music start/stop into the root layout**

Replace `app/_layout.tsx`:
```tsx
import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { LanguageProvider } from '../context/LanguageContext';
import { ScoreProvider } from '../context/ScoreContext';
import { SettingsProvider, useSettings } from '../context/SettingsContext';
import { startMusic, stopMusic } from '../services/music';

function MusicController() {
  const { soundEnabled } = useSettings();

  useEffect(() => {
    if (soundEnabled) {
      startMusic(true);
    } else {
      stopMusic();
    }
  }, [soundEnabled]);

  return null;
}

export default function RootLayout() {
  return (
    <LanguageProvider>
      <ScoreProvider>
        <SettingsProvider>
          <MusicController />
          <Stack screenOptions={{ headerShown: false }} />
        </SettingsProvider>
      </ScoreProvider>
    </LanguageProvider>
  );
}
```

Note: on web, browsers can block audio autoplay before any user gesture on the page — `startMusic`'s try/catch means this fails silently rather than crashing, consistent with every other audio call in this codebase. This is a known, accepted limitation, not a bug to fix here.

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add assets/sounds/music-loop.wav services/music.ts app/_layout.tsx
git commit -m "Add synthesized placeholder background music with loop playback"
```

---

### Task 4: Mute-aware sound effects

**Files:**
- Modify: `services/sound.ts`
- Modify: `components/BouncyButton.tsx`
- Modify: `app/game.tsx`

**Interfaces:**
- Consumes: `useSettings` (Task 1/2).
- Produces: `playSound(name: 'tap' | 'correct' | 'wrong', soundEnabled: boolean): Promise<void>` (`services/sound.ts`) — signature change, now takes a required second parameter.

- [ ] **Step 1: Add the `soundEnabled` parameter to `playSound`**

In `services/sound.ts`, change:
```ts
export async function playSound(name: SoundName): Promise<void> {
  try {
```
to:
```ts
export async function playSound(name: SoundName, soundEnabled: boolean): Promise<void> {
  if (!soundEnabled) {
    return;
  }
  try {
```

- [ ] **Step 2: Update `BouncyButton`'s call site**

In `components/BouncyButton.tsx`, add the import and hook, and pass the flag through:
```tsx
import { useSettings } from '../context/SettingsContext';
```
(add alongside the other imports)

Change:
```tsx
  function handlePress() {
    tapFeedback();
    playSound('tap');
    onPress();
  }
```
to:
```tsx
  const { soundEnabled } = useSettings();

  function handlePress() {
    tapFeedback();
    playSound('tap', soundEnabled);
    onPress();
  }
```

(Place the `useSettings()` call with the component's other hooks, above `handlePressIn`/`handlePressOut`/`handlePress`.)

- [ ] **Step 3: Update `app/game.tsx`'s call sites**

In `app/game.tsx`, add the import:
```tsx
import { useSettings } from '../context/SettingsContext';
```

Add the hook call alongside the existing `useLanguage()`/`useScore()` calls:
```tsx
  const { soundEnabled } = useSettings();
```

Update both `playSound` call sites to pass the flag:
```tsx
      playSound('correct', soundEnabled);
```
and
```tsx
      playSound('wrong', soundEnabled);
```

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Run the test suite**

Run: `npx jest`
Expected: PASS — 8/8, unaffected.

- [ ] **Step 6: Commit**

```bash
git add services/sound.ts components/BouncyButton.tsx app/game.tsx
git commit -m "Make playSound respect the soundEnabled setting"
```

---

### Task 5: Speaker icon on the menu + final playthrough

**Files:**
- Create: `components/IconButton.tsx`
- Modify: `locales/en.json`, `locales/es.json`, `locales/pt.json`, `locales/fr.json`, `locales/de.json`
- Modify: `app/index.tsx`

**Interfaces:**
- Consumes: `useSettings` (Task 1/2), `THEME` (existing `lib/theme.ts`).
- Produces: `IconButton({ icon, onPress, accessibilityLabel, style }: { icon: string; onPress: () => void; accessibilityLabel: string; style?: StyleProp<ViewStyle> })`.

- [ ] **Step 1: Add the two new locale keys**

In `locales/en.json`, inside the `"ui"` object, add two keys (anywhere among the existing ones, e.g. after `"purchasing"`):
```json
    "muteSound": "Mute sound",
    "unmuteSound": "Unmute sound"
```

In `locales/es.json`:
```json
    "muteSound": "Silenciar sonido",
    "unmuteSound": "Activar sonido"
```

In `locales/pt.json`:
```json
    "muteSound": "Silenciar som",
    "unmuteSound": "Ativar som"
```

In `locales/fr.json`:
```json
    "muteSound": "Couper le son",
    "unmuteSound": "Activer le son"
```

In `locales/de.json`:
```json
    "muteSound": "Ton stumm schalten",
    "unmuteSound": "Ton aktivieren"
```

Keep the JSON valid (comma-separate correctly with the surrounding keys) — every locale's `"ui"` object must end up with the exact same set of keys as every other, matching the existing project-wide invariant.

- [ ] **Step 2: Create `IconButton`**

Create `components/IconButton.tsx`:
```tsx
import { Platform, Pressable, StyleProp, StyleSheet, Text, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { THEME } from '../lib/theme';

type Props = {
  icon: string;
  onPress: () => void;
  accessibilityLabel: string;
  style?: StyleProp<ViewStyle>;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function IconButton({ icon, onPress, accessibilityLabel, style }: Props) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  function handlePressIn() {
    scale.value = withSpring(0.9, { damping: 12, stiffness: 300 });
  }

  function handlePressOut() {
    scale.value = withSpring(1, { damping: 10, stiffness: 200 });
  }

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[styles.button, style, animatedStyle]}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      <Text style={styles.icon}>{icon}</Text>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderWidth: 3,
    borderColor: THEME.border,
    ...Platform.select({
      web: { boxShadow: `3px 3px 0px ${THEME.border}` },
      default: {
        shadowColor: THEME.border,
        shadowOffset: { width: 3, height: 3 },
        shadowOpacity: 1,
        shadowRadius: 0,
        elevation: 3,
      },
    }),
  },
  icon: {
    fontSize: 22,
  },
});
```

Note: this uses `Platform.select` for the shadow from the start (web gets `boxShadow`, native gets the classic `shadow*`/`elevation` props) — the same fix already applied to `ColorButton`/`BouncyButton` after the first real-device test showed `boxShadow` rendering incorrectly on Android.

- [ ] **Step 3: Wire the icon into the menu screen**

Replace `app/index.tsx`:
```tsx
import { router } from 'expo-router';
import { StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BouncyButton } from '../components/BouncyButton';
import { IconButton } from '../components/IconButton';
import { useLanguage } from '../context/LanguageContext';
import { useScore } from '../context/ScoreContext';
import { useSettings } from '../context/SettingsContext';
import { THEME } from '../lib/theme';

export default function MenuScreen() {
  const { t } = useLanguage();
  const { bestScore, hasSeenInstructions } = useScore();
  const { soundEnabled, setSoundEnabled } = useSettings();

  function handlePlay() {
    router.push(hasSeenInstructions ? '/game' : '/how-to-play');
  }

  function handleHowToPlay() {
    router.push('/how-to-play');
  }

  function handleToggleSound() {
    setSoundEnabled(!soundEnabled);
  }

  return (
    <SafeAreaView style={styles.container}>
      <IconButton
        icon={soundEnabled ? '🔊' : '🔇'}
        onPress={handleToggleSound}
        accessibilityLabel={soundEnabled ? t('muteSound') : t('unmuteSound')}
        style={styles.soundButton}
      />
      <Text style={styles.title}>{t('appName')}</Text>
      <Text style={styles.bestScore}>
        {t('bestScore')}: {bestScore}
      </Text>
      <BouncyButton label={t('play')} onPress={handlePlay} variant="primary" />
      <BouncyButton label={t('howToPlay')} onPress={handleHowToPlay} variant="link" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
  },
  soundButton: {
    position: 'absolute',
    top: 16,
    right: 16,
  },
  title: { fontSize: 44, fontWeight: '900', color: THEME.text, letterSpacing: 0.5 },
  bestScore: { fontSize: 18, color: THEME.textMuted, fontWeight: '600' },
});
```

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors. (If TypeScript complains about a locale file's `ui` object shape, double-check all 5 locale JSON files have exactly the same key set after Step 1.)

- [ ] **Step 5: Run the test suite**

Run: `npx jest`
Expected: PASS — 8/8, unaffected.

- [ ] **Step 6: Verify the app bundles**

Run: `npx expo export --platform web --output-dir .tmp-export-check`
Expected: exit 0, no red errors.
Then remove the throwaway dir: `rm -rf .tmp-export-check` (bash) or `Remove-Item -Recurse -Force .tmp-export-check` (PowerShell).

- [ ] **Step 7: Manual verification**

This app has real users testing on a physical Android device (a prior native-only rendering bug — `boxShadow` painting as a solid black shape — was only caught this way, not by web testing). Run `npx expo start --web` and confirm structurally (menu shows the speaker icon top-right, tapping it flips between 🔊/🔇, no console errors), but treat this as necessary and not sufficient: recommend in your final report that a new EAS preview build (`eas build --profile preview --platform android`) be produced and installed on a real device to confirm music actually plays, the mute icon visually renders correctly (not another native-only shadow surprise), and toggling it actually silences both music and tap/correct/wrong sounds.

Stop the dev server (Ctrl+C) once verified.

- [ ] **Step 8: Commit**

```bash
git add components/IconButton.tsx locales app/index.tsx
git commit -m "Add speaker icon to toggle all sound on the menu screen"
```
