# Color Test Game Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the Color Test game (a Stroop-effect reflex game) from scratch, directly inside this repo, with automatic multi-language support and mocked monetization.

**Architecture:** Expo Router (file-based routing under `app/`) + React Context for global state (`context/`) + plain service modules for cross-cutting concerns (`services/`) + a pure, unit-tested game-logic module (`lib/`).

**Tech Stack:** Expo SDK 57, expo-router ~57.0.8, React 19.2.3 / React Native 0.86.0, expo-localization, expo-audio, expo-haptics, `@react-native-async-storage/async-storage`, TypeScript (strict), Jest + ts-jest for the one pure-logic unit test.

## Global Constraints

- Verify all Expo/React Native APIs against `https://docs.expo.dev/versions/v57.0.0/` before using them — SDK 57 changed APIs relative to older docs/training data (per `AGENTS.md`).
- Display name of the app is **"Color Test"** (not "Color Rush" — avoids clashing with existing published apps).
- `generateRound()` must produce `{ word, ink, options }` in one atomic call/state update — never split across two `setState` calls (this was the root cause of a prior "sometimes shows no color" bug).
- Game session: single 60-second timer, not a lives system. Correct tap → +10 points + next round. Wrong tap or timer hitting 0 → session ends immediately.
- All persistence (`AsyncStorage`) reads/writes must be wrapped in try/catch with safe defaults (`0` / `false`) — storage errors must never crash the app.
- Automated test coverage is scoped to `generateRound()` only (pure logic). Everything else (screens, navigation, timer, i18n, persistence, mock ads/IAP) is verified manually per-task via `npx tsc --noEmit` (wiring/type correctness) and, for the full app, `npx expo export --platform web` (catches bundling/import errors without needing a live server).
- If any `npm install` hits an `ERESOLVE` peer-dependency error from `expo-router`'s optional `@expo/ui`/`radix-ui` chain (a known, unrelated web-tooling conflict — already hit once during initial scaffolding), rerun with `--legacy-peer-deps`.

---

## File Structure

```
app/
  _layout.tsx        # root layout: providers + Stack
  index.tsx           # menu screen
  game.tsx             # gameplay screen
  result.tsx           # result screen
lib/
  colors.ts            # ColorId type + COLORS palette + hexFor()
  generateRound.ts      # pure round-generation logic
  generateRound.test.ts # unit tests for the above
context/
  LanguageContext.tsx   # locale detection + t()/colorName()
  ScoreContext.tsx       # score/bestScore/adsRemoved + persistence
services/
  ads.ts                # mock interstitial/banner logging
  iap.ts                 # mock remove-ads purchase
  sound.ts                # expo-audio wrapper for tap/correct/wrong sfx
  haptics.ts               # expo-haptics wrapper
components/
  ColorButton.tsx
  TimerBar.tsx
  ScoreBadge.tsx
  AdBanner.tsx
locales/
  en.json es.json pt.json fr.json de.json
assets/sounds/
  tap.wav correct.wav wrong.wav
jest.config.js
```

---

### Task 1: Switch the project entry point to Expo Router

**Files:**
- Modify: `package.json`
- Modify: `app.json`
- Delete: `App.tsx`
- Delete: `index.ts`
- Create: `app/_layout.tsx`
- Create: `app/index.tsx` (placeholder, replaced fully in Task 7)

**Interfaces:**
- Produces: a working Expo Router entry (`expo-router/entry`) with a root `Stack` in `app/_layout.tsx`, so later tasks can add real screens under `app/`.

- [ ] **Step 1: Swap `expo-av` for `expo-audio` in `package.json`**

In `package.json`, remove the `expo-av` line and add `expo-audio` (keep the rest of `dependencies` as-is):

```json
    "expo-audio": "~57.0.3",
```

(alphabetically, replacing the removed `"expo-av": "^16.0.8",` line — `expo-audio` sorts right after `expo-al...`/before `expo-constants`, i.e. directly below `"expo": "~57.0.8",`)

- [ ] **Step 2: Reinstall dependencies**

Run: `npm install --legacy-peer-deps`
Expected: exits 0, `package-lock.json` updates to include `expo-audio` and drop `expo-av`.
(If it fails without `--legacy-peer-deps` too — don't try that first, go straight to the flag; this project's dependency tree has a known unrelated peer conflict from `expo-router`'s optional web tooling.)

- [ ] **Step 3: Set the Expo Router entry point**

In `package.json`, change:
```json
  "main": "index.ts",
```
to:
```json
  "main": "expo-router/entry",
```

- [ ] **Step 4: Add `scheme` and typed routes to `app.json`**

In `app.json`, inside the `"expo"` object, add (e.g. after `"icon"`):
```json
    "scheme": "colortest",
    "experiments": {
      "typedRoutes": true
    },
```

- [ ] **Step 5: Delete the old template entry files**

```bash
git rm App.tsx index.ts
```

- [ ] **Step 6: Create the root layout**

Create `app/_layout.tsx`:
```tsx
import { Stack } from 'expo-router';

export default function RootLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
```

- [ ] **Step 7: Create a placeholder home screen**

Create `app/index.tsx`:
```tsx
import { Text, View } from 'react-native';

export default function MenuScreen() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Color Test</Text>
    </View>
  );
}
```

- [ ] **Step 8: Verify the app bundles**

Run: `npx expo export --platform web --output-dir .tmp-export-check`
Expected: exits 0, no red error output, prints an export summary.
Then remove the throwaway output: `rm -rf .tmp-export-check` (bash) or `Remove-Item -Recurse -Force .tmp-export-check` (PowerShell).

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "Switch project entry to Expo Router"
```

---

### Task 2: Color palette + round-generation logic (TDD)

**Files:**
- Create: `lib/colors.ts`
- Create: `lib/generateRound.ts`
- Test: `lib/generateRound.test.ts`
- Modify: `package.json` (add `jest`, `ts-jest`, `@types/jest` devDependencies + `test` script)
- Create: `jest.config.js`

**Interfaces:**
- Produces:
  - `type ColorId = 'red' | 'blue' | 'green' | 'yellow' | 'purple' | 'orange'` (`lib/colors.ts`)
  - `COLORS: { id: ColorId; hex: string }[]` (`lib/colors.ts`)
  - `hexFor(id: ColorId): string` (`lib/colors.ts`)
  - `type Round = { word: ColorId; ink: ColorId; options: ColorId[] }` (`lib/generateRound.ts`)
  - `generateRound(): Round` (`lib/generateRound.ts`)
- Consumed by: Task 6 (`ColorButton`), Task 7 (`app/game.tsx`).

- [ ] **Step 1: Add Jest devDependencies**

In `package.json`, inside `"devDependencies"`, add:
```json
    "jest": "^30.4.2",
    "ts-jest": "^29.4.12",
    "@types/jest": "^30.0.0",
```

And inside `"scripts"`, add:
```json
    "test": "jest",
```

- [ ] **Step 2: Install**

Run: `npm install --legacy-peer-deps`
Expected: exits 0.

- [ ] **Step 3: Create the Jest config**

Create `jest.config.js`:
```js
/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: { module: 'commonjs', esModuleInterop: true } }],
  },
  testMatch: ['**/*.test.ts'],
};
```

- [ ] **Step 4: Create the color palette**

Create `lib/colors.ts`:
```ts
export type ColorId = 'red' | 'blue' | 'green' | 'yellow' | 'purple' | 'orange';

export type ColorDef = {
  id: ColorId;
  hex: string;
};

export const COLORS: ColorDef[] = [
  { id: 'red', hex: '#E53935' },
  { id: 'blue', hex: '#1E88E5' },
  { id: 'green', hex: '#43A047' },
  { id: 'yellow', hex: '#FDD835' },
  { id: 'purple', hex: '#8E24AA' },
  { id: 'orange', hex: '#FB8C00' },
];

export function hexFor(id: ColorId): string {
  const found = COLORS.find((color) => color.id === id);
  if (!found) {
    throw new Error(`Unknown color id: ${id}`);
  }
  return found.hex;
}
```

- [ ] **Step 5: Write the failing test**

Create `lib/generateRound.test.ts`:
```ts
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
```

- [ ] **Step 6: Run the test to verify it fails**

Run: `npx jest lib/generateRound.test.ts`
Expected: FAIL — `Cannot find module './generateRound'`.

- [ ] **Step 7: Implement `generateRound`**

Create `lib/generateRound.ts`:
```ts
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
```

- [ ] **Step 8: Run the test to verify it passes**

Run: `npx jest lib/generateRound.test.ts`
Expected: PASS — 4 tests passed.

- [ ] **Step 9: Commit**

```bash
git add lib jest.config.js package.json package-lock.json
git commit -m "Add color palette and round-generation logic"
```

---

### Task 3: Localization

**Files:**
- Create: `locales/en.json`, `locales/es.json`, `locales/pt.json`, `locales/fr.json`, `locales/de.json`
- Create: `context/LanguageContext.tsx`

**Interfaces:**
- Consumes: `ColorId` from `lib/colors.ts` (Task 2).
- Produces:
  - `LanguageProvider({ children }: { children: ReactNode })` (`context/LanguageContext.tsx`)
  - `useLanguage(): { locale: 'en'|'es'|'pt'|'fr'|'de'; t: (key: string) => string; colorName: (id: ColorId) => string }` (`context/LanguageContext.tsx`)
- Consumed by: Task 7 (`app/_layout.tsx`, all screens).

- [ ] **Step 1: Create the English dictionary (source of truth for keys)**

Create `locales/en.json`:
```json
{
  "ui": {
    "appName": "Color Test",
    "bestScore": "Best score",
    "play": "Play",
    "score": "Score",
    "finalScore": "Final score",
    "newBest": "New best!",
    "playAgain": "Play again",
    "menu": "Menu",
    "removeAds": "Remove ads",
    "purchasing": "Processing..."
  },
  "colors": {
    "red": "Red",
    "blue": "Blue",
    "green": "Green",
    "yellow": "Yellow",
    "purple": "Purple",
    "orange": "Orange"
  }
}
```

- [ ] **Step 2: Create the Spanish dictionary**

Create `locales/es.json`:
```json
{
  "ui": {
    "appName": "Color Test",
    "bestScore": "Mejor puntaje",
    "play": "Jugar",
    "score": "Puntaje",
    "finalScore": "Puntaje final",
    "newBest": "¡Nuevo récord!",
    "playAgain": "Jugar de nuevo",
    "menu": "Menú",
    "removeAds": "Quitar anuncios",
    "purchasing": "Procesando..."
  },
  "colors": {
    "red": "Rojo",
    "blue": "Azul",
    "green": "Verde",
    "yellow": "Amarillo",
    "purple": "Violeta",
    "orange": "Naranja"
  }
}
```

- [ ] **Step 3: Create the Portuguese dictionary**

Create `locales/pt.json`:
```json
{
  "ui": {
    "appName": "Color Test",
    "bestScore": "Melhor pontuação",
    "play": "Jogar",
    "score": "Pontuação",
    "finalScore": "Pontuação final",
    "newBest": "Novo recorde!",
    "playAgain": "Jogar de novo",
    "menu": "Menu",
    "removeAds": "Remover anúncios",
    "purchasing": "Processando..."
  },
  "colors": {
    "red": "Vermelho",
    "blue": "Azul",
    "green": "Verde",
    "yellow": "Amarelo",
    "purple": "Roxo",
    "orange": "Laranja"
  }
}
```

- [ ] **Step 4: Create the French dictionary**

Create `locales/fr.json`:
```json
{
  "ui": {
    "appName": "Color Test",
    "bestScore": "Meilleur score",
    "play": "Jouer",
    "score": "Score",
    "finalScore": "Score final",
    "newBest": "Nouveau record !",
    "playAgain": "Rejouer",
    "menu": "Menu",
    "removeAds": "Supprimer les pubs",
    "purchasing": "Traitement..."
  },
  "colors": {
    "red": "Rouge",
    "blue": "Bleu",
    "green": "Vert",
    "yellow": "Jaune",
    "purple": "Violet",
    "orange": "Orange"
  }
}
```

- [ ] **Step 5: Create the German dictionary**

Create `locales/de.json`:
```json
{
  "ui": {
    "appName": "Color Test",
    "bestScore": "Bestwert",
    "play": "Spielen",
    "score": "Punkte",
    "finalScore": "Endstand",
    "newBest": "Neuer Rekord!",
    "playAgain": "Nochmal spielen",
    "menu": "Menü",
    "removeAds": "Werbung entfernen",
    "purchasing": "Wird verarbeitet..."
  },
  "colors": {
    "red": "Rot",
    "blue": "Blau",
    "green": "Grün",
    "yellow": "Gelb",
    "purple": "Lila",
    "orange": "Orange"
  }
}
```

- [ ] **Step 6: Create the language context**

Create `context/LanguageContext.tsx`:
```tsx
import { getLocales } from 'expo-localization';
import { ReactNode, createContext, useContext, useMemo } from 'react';
import de from '../locales/de.json';
import en from '../locales/en.json';
import es from '../locales/es.json';
import fr from '../locales/fr.json';
import pt from '../locales/pt.json';
import { ColorId } from '../lib/colors';

const DICTIONARIES = { en, es, pt, fr, de } as const;
type LocaleCode = keyof typeof DICTIONARIES;
type UiKey = keyof typeof en.ui;

function isSupportedLocale(code: string | null): code is LocaleCode {
  return code !== null && code in DICTIONARIES;
}

function resolveLocale(): LocaleCode {
  const deviceCode = getLocales()[0]?.languageCode ?? null;
  return isSupportedLocale(deviceCode) ? deviceCode : 'en';
}

type LanguageContextValue = {
  locale: LocaleCode;
  t: (key: UiKey) => string;
  colorName: (id: ColorId) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const value = useMemo<LanguageContextValue>(() => {
    const locale = resolveLocale();
    const dictionary = DICTIONARIES[locale];
    return {
      locale,
      t: (key) => dictionary.ui[key],
      colorName: (id) => dictionary.colors[id],
    };
  }, []);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
```

- [ ] **Step 7: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add locales context/LanguageContext.tsx
git commit -m "Add localization dictionaries and LanguageContext"
```

---

### Task 4: Score and persistence context

**Files:**
- Create: `context/ScoreContext.tsx`

**Interfaces:**
- Produces:
  - `ScoreProvider({ children }: { children: ReactNode })` (`context/ScoreContext.tsx`)
  - `useScore(): { score: number; bestScore: number; adsRemoved: boolean; addPoints: (points: number) => void; resetSession: () => void; endSession: () => void; setAdsRemoved: (value: boolean) => void }` (`context/ScoreContext.tsx`)
- Consumed by: Task 5 (`components/AdBanner.tsx`), Task 7 (`app/_layout.tsx`, all screens).

- [ ] **Step 1: Create the score context**

Create `context/ScoreContext.tsx`:
```tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ReactNode, createContext, useContext, useEffect, useState } from 'react';

const BEST_SCORE_KEY = 'colorTest.bestScore';
const ADS_REMOVED_KEY = 'colorTest.adsRemoved';

type ScoreContextValue = {
  score: number;
  bestScore: number;
  adsRemoved: boolean;
  addPoints: (points: number) => void;
  resetSession: () => void;
  endSession: () => void;
  setAdsRemoved: (value: boolean) => void;
};

const ScoreContext = createContext<ScoreContextValue | null>(null);

export function ScoreProvider({ children }: { children: ReactNode }) {
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [adsRemoved, setAdsRemovedState] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const storedBest = await AsyncStorage.getItem(BEST_SCORE_KEY);
        if (storedBest !== null) {
          setBestScore(Number(storedBest) || 0);
        }
      } catch {
        // Keep the default of 0 if storage is unavailable.
      }
      try {
        const storedAdsRemoved = await AsyncStorage.getItem(ADS_REMOVED_KEY);
        if (storedAdsRemoved !== null) {
          setAdsRemovedState(storedAdsRemoved === 'true');
        }
      } catch {
        // Keep the default of false if storage is unavailable.
      }
    })();
  }, []);

  function addPoints(points: number) {
    setScore((current) => current + points);
  }

  function resetSession() {
    setScore(0);
  }

  function endSession() {
    setBestScore((currentBest) => {
      if (score <= currentBest) {
        return currentBest;
      }
      AsyncStorage.setItem(BEST_SCORE_KEY, String(score)).catch(() => {
        // Best score still updates in memory even if persistence fails.
      });
      return score;
    });
  }

  function setAdsRemoved(value: boolean) {
    setAdsRemovedState(value);
    AsyncStorage.setItem(ADS_REMOVED_KEY, String(value)).catch(() => {
      // Flag still updates in memory even if persistence fails.
    });
  }

  return (
    <ScoreContext.Provider
      value={{ score, bestScore, adsRemoved, addPoints, resetSession, endSession, setAdsRemoved }}
    >
      {children}
    </ScoreContext.Provider>
  );
}

export function useScore(): ScoreContextValue {
  const context = useContext(ScoreContext);
  if (!context) {
    throw new Error('useScore must be used within a ScoreProvider');
  }
  return context;
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add context/ScoreContext.tsx
git commit -m "Add score/best-score/ads-removed context with AsyncStorage persistence"
```

---

### Task 5: Mock services (ads, IAP, sound, haptics)

**Files:**
- Create: `services/ads.ts`
- Create: `services/iap.ts`
- Create: `services/sound.ts`
- Create: `services/haptics.ts`
- Create: `assets/sounds/tap.wav`, `assets/sounds/correct.wav`, `assets/sounds/wrong.wav`

**Interfaces:**
- Produces:
  - `showInterstitial(adsRemoved: boolean): void` (`services/ads.ts`)
  - `logBannerImpression(adsRemoved: boolean): void` (`services/ads.ts`)
  - `purchaseRemoveAds(): Promise<boolean>` (`services/iap.ts`)
  - `playSound(name: 'tap' | 'correct' | 'wrong'): void` (`services/sound.ts`)
  - `tapFeedback(): void`, `successFeedback(): void`, `errorFeedback(): void` (`services/haptics.ts`)
- Consumed by: Task 6 (`components/AdBanner.tsx`), Task 7 (`app/game.tsx`, `app/result.tsx`).

- [ ] **Step 1: Generate silent placeholder sound files**

Run (Bash):
```bash
mkdir -p assets/sounds
node -e "
const fs = require('fs');
function silentWav(path, seconds) {
  const sampleRate = 8000;
  const numSamples = sampleRate * seconds;
  const dataSize = numSamples * 2;
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
  fs.writeFileSync(path, buffer);
}
silentWav('assets/sounds/tap.wav', 0.1);
silentWav('assets/sounds/correct.wav', 0.2);
silentWav('assets/sounds/wrong.wav', 0.2);
"
```
Expected: no output, exit 0, and `assets/sounds/*.wav` (3 files, tiny sizes) now exist.

- [ ] **Step 2: Create the ads mock**

Create `services/ads.ts`:
```ts
// TODO: replace with react-native-google-mobile-ads once real Ad Unit IDs exist.
export function showInterstitial(adsRemoved: boolean): void {
  if (adsRemoved) {
    return;
  }
  console.log('[ads mock] would show an interstitial ad now');
}

export function logBannerImpression(adsRemoved: boolean): void {
  if (adsRemoved) {
    return;
  }
  console.log('[ads mock] banner impression');
}
```

- [ ] **Step 3: Create the IAP mock**

Create `services/iap.ts`:
```ts
// TODO: replace with react-native-iap and a real "remove_ads" managed product.
export function purchaseRemoveAds(): Promise<boolean> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(true), 800);
  });
}
```

- [ ] **Step 4: Create the sound service**

Create `services/sound.ts`:
```ts
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

export function playSound(name: SoundName): void {
  try {
    const player = getPlayer(name);
    if (!player) {
      return;
    }
    player.seekTo(0);
    player.play();
  } catch {
    // Playback errors must never block gameplay.
  }
}
```

- [ ] **Step 5: Create the haptics service**

Create `services/haptics.ts`:
```ts
import * as Haptics from 'expo-haptics';

export function tapFeedback(): void {
  Haptics.selectionAsync().catch(() => {});
}

export function successFeedback(): void {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}

export function errorFeedback(): void {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
}
```

- [ ] **Step 6: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add services assets/sounds
git commit -m "Add mock ads/IAP services and sound/haptics wrappers"
```

---

### Task 6: Reusable UI components

**Files:**
- Create: `components/ColorButton.tsx`
- Create: `components/TimerBar.tsx`
- Create: `components/ScoreBadge.tsx`
- Create: `components/AdBanner.tsx`

**Interfaces:**
- Consumes: `ColorId`, `hexFor` (Task 2); `useScore` (Task 4); `logBannerImpression` (Task 5).
- Produces:
  - `ColorButton({ colorId, label, onPress }: { colorId: ColorId; label: string; onPress: () => void })`
  - `TimerBar({ progress }: { progress: number })`
  - `ScoreBadge({ label, value }: { label: string; value: number })`
  - `AdBanner()`
- Consumed by: Task 7 (`app/game.tsx`, `app/result.tsx`).

- [ ] **Step 1: Create `ColorButton`**

Create `components/ColorButton.tsx`:
```tsx
import { Pressable, StyleSheet, Text } from 'react-native';
import { ColorId, hexFor } from '../lib/colors';

type Props = {
  colorId: ColorId;
  label: string;
  onPress: () => void;
};

export function ColorButton({ colorId, label, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.button, { backgroundColor: hexFor(colorId) }]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: '47%',
    aspectRatio: 2,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  label: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
```

- [ ] **Step 2: Create `TimerBar`**

Create `components/TimerBar.tsx`:
```tsx
import { StyleSheet, View } from 'react-native';

type Props = {
  progress: number;
};

export function TimerBar({ progress }: Props) {
  const clamped = Math.max(0, Math.min(1, progress));
  return (
    <View style={styles.track}>
      <View style={[styles.fill, { width: `${clamped * 100}%` }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 10,
    borderRadius: 999,
    backgroundColor: '#333',
    overflow: 'hidden',
    marginBottom: 16,
  },
  fill: {
    height: '100%',
    backgroundColor: '#43A047',
  },
});
```

- [ ] **Step 3: Create `ScoreBadge`**

Create `components/ScoreBadge.tsx`:
```tsx
import { StyleSheet, Text, View } from 'react-native';

type Props = {
  label: string;
  value: number;
};

export function ScoreBadge({ label, value }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>
        {label}: {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'flex-end',
    marginBottom: 8,
  },
  text: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
```

- [ ] **Step 4: Create `AdBanner`**

Create `components/AdBanner.tsx`:
```tsx
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useScore } from '../context/ScoreContext';
import { logBannerImpression } from '../services/ads';

export function AdBanner() {
  const { adsRemoved } = useScore();

  useEffect(() => {
    logBannerImpression(adsRemoved);
  }, [adsRemoved]);

  if (adsRemoved) {
    return null;
  }

  return (
    <View style={styles.banner}>
      <Text style={styles.text}>Ad banner (mock)</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    height: 50,
    width: '100%',
    borderRadius: 8,
    backgroundColor: '#222',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: '#666',
    fontSize: 12,
  },
});
```

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add components
git commit -m "Add ColorButton, TimerBar, ScoreBadge, and AdBanner components"
```

---

### Task 7: Wire up the screens

**Files:**
- Modify: `app/_layout.tsx`
- Modify: `app/index.tsx`
- Create: `app/game.tsx`
- Create: `app/result.tsx`

**Interfaces:**
- Consumes: `LanguageProvider`/`useLanguage` (Task 3), `ScoreProvider`/`useScore` (Task 4), `showInterstitial`/`purchaseRemoveAds`/`playSound`/`tapFeedback`/`successFeedback`/`errorFeedback` (Task 5), `ColorButton`/`TimerBar`/`ScoreBadge`/`AdBanner` (Task 6), `generateRound`/`hexFor` (Task 2).

- [ ] **Step 1: Wire the providers into the root layout**

Replace `app/_layout.tsx`:
```tsx
import { Stack } from 'expo-router';
import { LanguageProvider } from '../context/LanguageContext';
import { ScoreProvider } from '../context/ScoreContext';

export default function RootLayout() {
  return (
    <LanguageProvider>
      <ScoreProvider>
        <Stack screenOptions={{ headerShown: false }} />
      </ScoreProvider>
    </LanguageProvider>
  );
}
```

- [ ] **Step 2: Build the menu screen**

Replace `app/index.tsx`:
```tsx
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLanguage } from '../context/LanguageContext';
import { useScore } from '../context/ScoreContext';
import { tapFeedback } from '../services/haptics';
import { playSound } from '../services/sound';

export default function MenuScreen() {
  const { t } = useLanguage();
  const { bestScore } = useScore();

  function handlePlay() {
    tapFeedback();
    playSound('tap');
    router.push('/game');
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>{t('appName')}</Text>
      <Text style={styles.bestScore}>
        {t('bestScore')}: {bestScore}
      </Text>
      <Pressable style={styles.playButton} onPress={handlePlay}>
        <Text style={styles.playButtonText}>{t('play')}</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
  },
  title: { fontSize: 40, fontWeight: '800', color: '#fff' },
  bestScore: { fontSize: 18, color: '#ccc' },
  playButton: {
    backgroundColor: '#43A047',
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 999,
  },
  playButtonText: { fontSize: 20, fontWeight: '700', color: '#fff' },
});
```

- [ ] **Step 3: Build the gameplay screen**

Create `app/game.tsx`:
```tsx
import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ColorButton } from '../components/ColorButton';
import { ScoreBadge } from '../components/ScoreBadge';
import { TimerBar } from '../components/TimerBar';
import { useLanguage } from '../context/LanguageContext';
import { useScore } from '../context/ScoreContext';
import { hexFor } from '../lib/colors';
import { generateRound } from '../lib/generateRound';
import { showInterstitial } from '../services/ads';
import { errorFeedback, successFeedback } from '../services/haptics';
import { playSound } from '../services/sound';

const SESSION_MS = 60_000;
const TICK_MS = 100;
const POINTS_PER_CORRECT = 10;

export default function GameScreen() {
  const { t, colorName } = useLanguage();
  const { score, adsRemoved, addPoints, resetSession, endSession } = useScore();
  const [round, setRound] = useState(() => generateRound());
  const [remainingMs, setRemainingMs] = useState(SESSION_MS);
  const endedRef = useRef(false);

  useEffect(() => {
    resetSession();
  }, [resetSession]);

  const finishGame = useCallback(() => {
    if (endedRef.current) {
      return;
    }
    endedRef.current = true;
    endSession();
    showInterstitial(adsRemoved);
    router.replace('/result');
  }, [endSession, adsRemoved]);

  useEffect(() => {
    const interval = setInterval(() => {
      setRemainingMs((current) => {
        const next = current - TICK_MS;
        if (next <= 0) {
          clearInterval(interval);
          finishGame();
          return 0;
        }
        return next;
      });
    }, TICK_MS);
    return () => clearInterval(interval);
  }, [finishGame]);

  function handleAnswer(selected: string) {
    if (endedRef.current) {
      return;
    }
    if (selected === round.ink) {
      addPoints(POINTS_PER_CORRECT);
      successFeedback();
      playSound('correct');
      setRound(generateRound());
    } else {
      errorFeedback();
      playSound('wrong');
      finishGame();
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <TimerBar progress={remainingMs / SESSION_MS} />
      <ScoreBadge label={t('score')} value={score} />
      <View style={styles.wordContainer}>
        <Text style={[styles.word, { color: hexFor(round.ink) }]}>{colorName(round.word)}</Text>
      </View>
      <View style={styles.options}>
        {round.options.map((id) => (
          <ColorButton key={id} colorId={id} label={colorName(id)} onPress={() => handleAnswer(id)} />
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111', padding: 16 },
  wordContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  word: { fontSize: 48, fontWeight: '800' },
  options: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
});
```

- [ ] **Step 4: Build the result screen**

Create `app/result.tsx`:
```tsx
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AdBanner } from '../components/AdBanner';
import { useLanguage } from '../context/LanguageContext';
import { useScore } from '../context/ScoreContext';
import { purchaseRemoveAds } from '../services/iap';
import { tapFeedback } from '../services/haptics';
import { playSound } from '../services/sound';

export default function ResultScreen() {
  const { t } = useLanguage();
  const { score, bestScore, adsRemoved, setAdsRemoved } = useScore();
  const [purchasing, setPurchasing] = useState(false);
  const isNewBest = score > 0 && score === bestScore;

  function handlePlayAgain() {
    tapFeedback();
    playSound('tap');
    router.replace('/game');
  }

  function handleMenu() {
    tapFeedback();
    playSound('tap');
    router.replace('/');
  }

  async function handleRemoveAds() {
    tapFeedback();
    playSound('tap');
    setPurchasing(true);
    try {
      const success = await purchaseRemoveAds();
      if (success) {
        setAdsRemoved(true);
      }
    } finally {
      setPurchasing(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.score}>
        {t('finalScore')}: {score}
      </Text>
      {isNewBest && <Text style={styles.newBest}>{t('newBest')}</Text>}
      <AdBanner />
      <Pressable style={styles.primaryButton} onPress={handlePlayAgain}>
        <Text style={styles.primaryButtonText}>{t('playAgain')}</Text>
      </Pressable>
      <Pressable style={styles.secondaryButton} onPress={handleMenu}>
        <Text style={styles.secondaryButtonText}>{t('menu')}</Text>
      </Pressable>
      {!adsRemoved && (
        <Pressable style={styles.linkButton} onPress={handleRemoveAds} disabled={purchasing}>
          <Text style={styles.linkButtonText}>{purchasing ? t('purchasing') : t('removeAds')}</Text>
        </Pressable>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    padding: 24,
  },
  score: { fontSize: 28, fontWeight: '800', color: '#fff' },
  newBest: { fontSize: 16, color: '#FDD835', fontWeight: '700' },
  primaryButton: {
    backgroundColor: '#43A047',
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 999,
  },
  primaryButtonText: { fontSize: 18, fontWeight: '700', color: '#fff' },
  secondaryButton: { paddingVertical: 10 },
  secondaryButtonText: { fontSize: 16, color: '#ccc' },
  linkButton: { paddingVertical: 8 },
  linkButtonText: { fontSize: 14, color: '#888' },
});
```

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Run the full test suite**

Run: `npx jest`
Expected: PASS — 4 tests passed (unchanged from Task 2; confirms nothing later broke the pure logic).

- [ ] **Step 7: Verify the app bundles end-to-end**

Run: `npx expo export --platform web --output-dir .tmp-export-check`
Expected: exits 0, no red error output.
Then: `rm -rf .tmp-export-check` (bash) or `Remove-Item -Recurse -Force .tmp-export-check` (PowerShell).

- [ ] **Step 8: Manual playthrough**

Run: `npx expo start --web`
Open the printed local URL in a browser and confirm:
- Menu screen shows "Color Test", "Best score: 0", and a "Play" button.
- Tapping "Play" starts a round: a color word renders in a different ink color, 4 color buttons appear, the timer bar starts counting down.
- Tapping the button matching the ink color scores +10 and immediately shows a new round.
- Tapping the wrong button ends the session and navigates to the result screen showing the final score.
- On the result screen, "Play again" starts a fresh session and "Menu" returns home with the best score updated.
- The browser dev console shows `[ads mock] would show an interstitial ad now` when a session ends, and `[ads mock] banner impression` when the result screen's ad banner renders.
- Tapping "Remove ads" on the result screen shows "Processing..." briefly, then the button and the ad banner disappear on subsequent sessions.
- Changing the browser/OS language to Spanish and reloading shows the UI in Spanish (menu title stays "Color Test", but buttons/labels change).

Stop the dev server (Ctrl+C) once verified.

- [ ] **Step 9: Commit**

```bash
git add app
git commit -m "Wire up menu, gameplay, and result screens"
```
