# Instructions Screen + Per-Round Timer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a first-run "how to play" screen, and replace the game's fixed 60-second session timer with a per-round countdown that resets on every correct answer and speeds up after 10 correct answers.

**Architecture:** Extends the existing Expo Router + Context + `lib/` pure-logic pattern from the base game — no new architectural layer. One new screen, one new pure function + test, additions to the existing `ScoreContext`, `LanguageContext`, locale files, menu screen, and game screen.

**Tech Stack:** Same as the base game (Expo SDK 57, expo-router, React 19.2.3, TypeScript strict, Jest for the pure-logic tests).

## Global Constraints

- Round duration starts at **5000ms**, drops to **3000ms** after **10** correct answers in the same session (one step, not a continuous ramp) — exact values, copied verbatim from the spec.
- A wrong tap **and** a round timer reaching 0 both end the session identically (same `finishGame()` path as today).
- The `useState(() => generateRound())` atomic-round-state rule from the base game still applies: nothing changes about how a round's word/ink/options are generated or read.
- All `AsyncStorage` reads/writes for the new `hasSeenInstructions` flag follow the exact same try/catch-with-safe-default pattern already used for `bestScore`/`adsRemoved` in `context/ScoreContext.tsx`.
- The "how to play" screen's "Start playing" button always navigates to `/game` (regardless of whether it was reached via first-run auto-navigation or via the menu's persistent "How to play" link).
- Automated test coverage stays scoped to pure logic in `lib/` (this plan adds one such function, `roundDurationFor`, with tests in the same style as `lib/generateRound.test.ts`). Screens are verified manually, same as the base game.

---

## File Structure

```
lib/
  roundDuration.ts          # new: pure difficulty-tier function
  roundDuration.test.ts      # new: unit tests
context/
  ScoreContext.tsx            # modified: + hasSeenInstructions flag
  LanguageContext.tsx          # modified: + instructionsSteps accessor
locales/
  en.json es.json pt.json fr.json de.json   # modified: + howToPlay/instructionsTitle/start keys, + instructionsSteps array
app/
  how-to-play.tsx             # new: instructions screen
  index.tsx                    # modified: conditional Play routing + "How to play" link
  game.tsx                      # modified: per-round timer + difficulty ramp
```

---

### Task 1: `hasSeenInstructions` flag on ScoreContext

**Files:**
- Modify: `context/ScoreContext.tsx`

**Interfaces:**
- Produces: `useScore()` now also returns `hasSeenInstructions: boolean` and `setHasSeenInstructions: (value: boolean) => void`.
- Consumed by: Task 4 (`app/how-to-play.tsx`), Task 5 (`app/index.tsx`).

- [ ] **Step 1: Add the storage key, state, and read-on-mount**

In `context/ScoreContext.tsx`, add a new key constant near the top (after the existing two):
```ts
const HAS_SEEN_INSTRUCTIONS_KEY = 'colorTest.hasSeenInstructions';
```

Add `hasSeenInstructions` and `setHasSeenInstructions` to the `ScoreContextValue` type:
```ts
type ScoreContextValue = {
  score: number;
  bestScore: number;
  adsRemoved: boolean;
  wasNewBest: boolean;
  hasSeenInstructions: boolean;
  addPoints: (points: number) => void;
  resetSession: () => void;
  endSession: () => void;
  setAdsRemoved: (value: boolean) => void;
  setHasSeenInstructions: (value: boolean) => void;
};
```

Add the state declaration alongside the existing ones inside `ScoreProvider`:
```ts
  const [hasSeenInstructions, setHasSeenInstructionsState] = useState(false);
```

In the mount `useEffect`'s IIFE, add a third try/catch block (after the `adsRemoved` one), reading the new key:
```ts
      try {
        const storedHasSeenInstructions = await AsyncStorage.getItem(HAS_SEEN_INSTRUCTIONS_KEY);
        if (storedHasSeenInstructions !== null) {
          setHasSeenInstructionsState(storedHasSeenInstructions === 'true');
        }
      } catch {
        // Keep the default of false if storage is unavailable.
      }
```

- [ ] **Step 2: Add the setter**

Add a new `useCallback`, following the exact same shape as `setAdsRemoved`:
```ts
  const setHasSeenInstructions = useCallback((value: boolean) => {
    setHasSeenInstructionsState(value);
    AsyncStorage.setItem(HAS_SEEN_INSTRUCTIONS_KEY, String(value)).catch(() => {
      // Flag still updates in memory even if persistence fails.
    });
  }, []);
```

- [ ] **Step 3: Expose it through the context value**

Update the `useMemo` call to include the new state and setter, in both the returned object and the dependency array:
```ts
  const value = useMemo(
    () => ({
      score,
      bestScore,
      adsRemoved,
      wasNewBest,
      hasSeenInstructions,
      addPoints,
      resetSession,
      endSession,
      setAdsRemoved,
      setHasSeenInstructions,
    }),
    [
      score,
      bestScore,
      adsRemoved,
      wasNewBest,
      hasSeenInstructions,
      addPoints,
      resetSession,
      endSession,
      setAdsRemoved,
      setHasSeenInstructions,
    ]
  );
```

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add context/ScoreContext.tsx
git commit -m "Add persisted hasSeenInstructions flag to ScoreContext"
```

---

### Task 2: Round-duration difficulty logic (TDD)

**Files:**
- Create: `lib/roundDuration.ts`
- Test: `lib/roundDuration.test.ts`

**Interfaces:**
- Produces: `roundDurationFor(correctCount: number): number` (`lib/roundDuration.ts`).
- Consumed by: Task 6 (`app/game.tsx`).

- [ ] **Step 1: Write the failing test**

Create `lib/roundDuration.test.ts`:
```ts
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx jest lib/roundDuration.test.ts`
Expected: FAIL — `Cannot find module './roundDuration'`.

- [ ] **Step 3: Implement `roundDurationFor`**

Create `lib/roundDuration.ts`:
```ts
const ROUND_MS_INITIAL = 5_000;
const ROUND_MS_FAST = 3_000;
const FAST_MODE_THRESHOLD_CORRECT = 10;

export function roundDurationFor(correctCount: number): number {
  return correctCount >= FAST_MODE_THRESHOLD_CORRECT ? ROUND_MS_FAST : ROUND_MS_INITIAL;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx jest lib/roundDuration.test.ts`
Expected: PASS — 4 tests passed.

- [ ] **Step 5: Commit**

```bash
git add lib/roundDuration.ts lib/roundDuration.test.ts
git commit -m "Add round-duration difficulty logic"
```

---

### Task 3: Localization additions

**Files:**
- Modify: `locales/en.json`, `locales/es.json`, `locales/pt.json`, `locales/fr.json`, `locales/de.json`
- Modify: `context/LanguageContext.tsx`

**Interfaces:**
- Produces: `useLanguage()` now also returns `instructionsSteps: string[]`. `t()` accepts three new keys: `'howToPlay' | 'instructionsTitle' | 'start'`.
- Consumed by: Task 4 (`app/how-to-play.tsx`), Task 5 (`app/index.tsx`).

- [ ] **Step 1: Add the new `ui` keys and `instructionsSteps` array to `locales/en.json`**

Replace the full file with:
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
    "purchasing": "Processing...",
    "howToPlay": "How to play",
    "instructionsTitle": "How to play",
    "start": "Start playing"
  },
  "colors": {
    "red": "Red",
    "blue": "Blue",
    "green": "Green",
    "yellow": "Yellow",
    "purple": "Purple",
    "orange": "Orange"
  },
  "instructionsSteps": [
    "A color name appears, written in a different ink color.",
    "Tap the button matching the INK color — not the word.",
    "Each round gives you 5 seconds. A correct answer resets the clock and starts a new round.",
    "After 10 correct answers in a row, rounds speed up to 3 seconds.",
    "One wrong tap or running out of time ends the game."
  ]
}
```

- [ ] **Step 2: Same additions for `locales/es.json`**

Replace the full file with:
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
    "purchasing": "Procesando...",
    "howToPlay": "Cómo jugar",
    "instructionsTitle": "Cómo jugar",
    "start": "Empezar a jugar"
  },
  "colors": {
    "red": "Rojo",
    "blue": "Azul",
    "green": "Verde",
    "yellow": "Amarillo",
    "purple": "Violeta",
    "orange": "Naranja"
  },
  "instructionsSteps": [
    "Aparece el nombre de un color, escrito con otra tinta.",
    "Tocá el botón que coincide con el color de la TINTA, no con la palabra.",
    "Cada ronda te da 5 segundos. Un acierto reinicia el reloj y arranca una ronda nueva.",
    "Después de 10 aciertos seguidos, las rondas se aceleran a 3 segundos.",
    "Un error o quedarte sin tiempo termina la partida."
  ]
}
```

- [ ] **Step 3: Same additions for `locales/pt.json`**

Replace the full file with:
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
    "purchasing": "Processando...",
    "howToPlay": "Como jogar",
    "instructionsTitle": "Como jogar",
    "start": "Começar a jogar"
  },
  "colors": {
    "red": "Vermelho",
    "blue": "Azul",
    "green": "Verde",
    "yellow": "Amarelo",
    "purple": "Roxo",
    "orange": "Laranja"
  },
  "instructionsSteps": [
    "Aparece o nome de uma cor, escrito com outra tinta.",
    "Toque no botão que corresponde à cor da TINTA, não à palavra.",
    "Cada rodada dá 5 segundos. Um acerto reinicia o relógio e começa uma nova rodada.",
    "Depois de 10 acertos seguidos, as rodadas aceleram para 3 segundos.",
    "Um erro ou ficar sem tempo termina o jogo."
  ]
}
```

- [ ] **Step 4: Same additions for `locales/fr.json`**

Replace the full file with:
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
    "purchasing": "Traitement...",
    "howToPlay": "Comment jouer",
    "instructionsTitle": "Comment jouer",
    "start": "Commencer à jouer"
  },
  "colors": {
    "red": "Rouge",
    "blue": "Bleu",
    "green": "Vert",
    "yellow": "Jaune",
    "purple": "Violet",
    "orange": "Orange"
  },
  "instructionsSteps": [
    "Le nom d'une couleur apparaît, écrit avec une encre d'une autre couleur.",
    "Appuyez sur le bouton correspondant à la couleur de l'ENCRE, pas au mot.",
    "Chaque manche vous donne 5 secondes. Une bonne réponse réinitialise le chrono et lance une nouvelle manche.",
    "Après 10 bonnes réponses d'affilée, les manches passent à 3 secondes.",
    "Une erreur ou un temps écoulé termine la partie."
  ]
}
```

- [ ] **Step 5: Same additions for `locales/de.json`**

Replace the full file with:
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
    "purchasing": "Wird verarbeitet...",
    "howToPlay": "Spielanleitung",
    "instructionsTitle": "Spielanleitung",
    "start": "Spiel starten"
  },
  "colors": {
    "red": "Rot",
    "blue": "Blau",
    "green": "Grün",
    "yellow": "Gelb",
    "purple": "Lila",
    "orange": "Orange"
  },
  "instructionsSteps": [
    "Ein Farbname erscheint, geschrieben in einer anderen Farbe.",
    "Tippe auf die Schaltfläche, die zur SCHRIFTFARBE passt — nicht zum Wort.",
    "Jede Runde gibt dir 5 Sekunden. Eine richtige Antwort setzt die Uhr zurück und startet eine neue Runde.",
    "Nach 10 richtigen Antworten in Folge werden die Runden auf 3 Sekunden beschleunigt.",
    "Ein Fehler oder Zeitablauf beendet das Spiel."
  ]
}
```

- [ ] **Step 6: Expose `instructionsSteps` through `LanguageContext`**

In `context/LanguageContext.tsx`, add `instructionsSteps` to the `LanguageContextValue` type:
```ts
type LanguageContextValue = {
  locale: LocaleCode;
  t: (key: UiKey) => string;
  colorName: (id: ColorId) => string;
  instructionsSteps: string[];
};
```

In the `useMemo` inside `LanguageProvider`, add `instructionsSteps` to the returned object:
```ts
    return {
      locale,
      t: (key) => dictionary.ui[key],
      colorName: (id) => dictionary.colors[id],
      instructionsSteps: dictionary.instructionsSteps,
    };
```

- [ ] **Step 7: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors. (If TypeScript complains about `dictionary.instructionsSteps` not existing on the union type, double check all 5 JSON files were saved with the `instructionsSteps` key at the top level, not nested inside `ui` or `colors`.)

- [ ] **Step 8: Commit**

```bash
git add locales context/LanguageContext.tsx
git commit -m "Add how-to-play localization strings"
```

---

### Task 4: How-to-play screen

**Files:**
- Create: `app/how-to-play.tsx`

**Interfaces:**
- Consumes: `useLanguage()` → `t()`, `instructionsSteps` (Task 3); `useScore()` → `setHasSeenInstructions` (Task 1); `tapFeedback` (existing `services/haptics.ts`); `playSound` (existing `services/sound.ts`).

- [ ] **Step 1: Create the screen**

Create `app/how-to-play.tsx`:
```tsx
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLanguage } from '../context/LanguageContext';
import { useScore } from '../context/ScoreContext';
import { tapFeedback } from '../services/haptics';
import { playSound } from '../services/sound';

export default function HowToPlayScreen() {
  const { t, instructionsSteps } = useLanguage();
  const { setHasSeenInstructions } = useScore();

  function handleStart() {
    tapFeedback();
    playSound('tap');
    setHasSeenInstructions(true);
    router.replace('/game');
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>{t('instructionsTitle')}</Text>
      <View style={styles.steps}>
        {instructionsSteps.map((step, index) => (
          <Text key={index} style={styles.step}>
            {index + 1}. {step}
          </Text>
        ))}
      </View>
      <Pressable style={styles.startButton} onPress={handleStart}>
        <Text style={styles.startButtonText}>{t('start')}</Text>
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
    padding: 24,
  },
  title: { fontSize: 28, fontWeight: '800', color: '#fff' },
  steps: { gap: 12, alignSelf: 'stretch' },
  step: { fontSize: 16, color: '#ccc', lineHeight: 22 },
  startButton: {
    backgroundColor: '#43A047',
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 999,
  },
  startButtonText: { fontSize: 20, fontWeight: '700', color: '#fff' },
});
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/how-to-play.tsx
git commit -m "Add how-to-play instructions screen"
```

---

### Task 5: Menu screen — conditional routing + "How to play" link

**Files:**
- Modify: `app/index.tsx`

**Interfaces:**
- Consumes: `useScore()` → `hasSeenInstructions` (Task 1); `useLanguage()` → `t('howToPlay')` (Task 3, new key).

- [ ] **Step 1: Update the menu screen**

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
  const { bestScore, hasSeenInstructions } = useScore();

  function handlePlay() {
    tapFeedback();
    playSound('tap');
    router.push(hasSeenInstructions ? '/game' : '/how-to-play');
  }

  function handleHowToPlay() {
    tapFeedback();
    playSound('tap');
    router.push('/how-to-play');
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
      <Pressable style={styles.linkButton} onPress={handleHowToPlay}>
        <Text style={styles.linkButtonText}>{t('howToPlay')}</Text>
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
  linkButton: { paddingVertical: 8 },
  linkButtonText: { fontSize: 14, color: '#888' },
});
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/index.tsx
git commit -m "Route first-time players through how-to-play, add menu link"
```

---

### Task 6: Per-round timer + difficulty ramp in the game screen

**Files:**
- Modify: `app/game.tsx`

**Interfaces:**
- Consumes: `roundDurationFor` (Task 2).

- [ ] **Step 1: Replace the timer/session logic**

Replace `app/game.tsx`:
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
import { ColorId, hexFor } from '../lib/colors';
import { generateRound } from '../lib/generateRound';
import { roundDurationFor } from '../lib/roundDuration';
import { showInterstitial } from '../services/ads';
import { errorFeedback, successFeedback } from '../services/haptics';
import { playSound } from '../services/sound';

const TICK_MS = 100;
const POINTS_PER_CORRECT = 10;

export default function GameScreen() {
  const { t, colorName } = useLanguage();
  const { score, adsRemoved, addPoints, resetSession, endSession } = useScore();
  const [round, setRound] = useState(() => generateRound());
  const [correctCount, setCorrectCount] = useState(0);
  const [roundDurationMs, setRoundDurationMs] = useState(() => roundDurationFor(0));
  const [remainingMs, setRemainingMs] = useState(() => roundDurationFor(0));
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
      setRemainingMs((current) => Math.max(0, current - TICK_MS));
    }, TICK_MS);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (remainingMs <= 0) {
      finishGame();
    }
  }, [remainingMs, finishGame]);

  function handleAnswer(selected: ColorId) {
    if (endedRef.current) {
      return;
    }
    if (selected === round.ink) {
      const nextCorrectCount = correctCount + 1;
      const nextDuration = roundDurationFor(nextCorrectCount);
      addPoints(POINTS_PER_CORRECT);
      successFeedback();
      playSound('correct');
      setCorrectCount(nextCorrectCount);
      setRound(generateRound());
      setRoundDurationMs(nextDuration);
      setRemainingMs(nextDuration);
    } else {
      errorFeedback();
      playSound('wrong');
      finishGame();
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <TimerBar progress={remainingMs / roundDurationMs} />
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

Note: `SESSION_MS` is gone entirely — round duration is now per-round and looked up from `roundDurationFor`, seeded once via `useState(() => roundDurationFor(0))` for both the initial `roundDurationMs` and `remainingMs`, then both updated together (in the same synchronous event handler, batched by React into one re-render) on every correct answer.

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Run the full test suite**

Run: `npx jest`
Expected: PASS — 8/8 tests (4 from `lib/generateRound.test.ts`, 4 from `lib/roundDuration.test.ts`, both unaffected by this UI change — confirms nothing broke the pure logic).

- [ ] **Step 4: Verify the app bundles**

Run: `npx expo export --platform web --output-dir .tmp-export-check`
Expected: exit 0, no red errors.
Then remove the throwaway dir: `rm -rf .tmp-export-check` (bash) or `Remove-Item -Recurse -Force .tmp-export-check` (PowerShell).

- [ ] **Step 5: Manual playthrough**

Run: `npx expo start --web`
Open the printed local URL in a browser and confirm:
- On a fresh install (clear site data / private window, or simply the first run in this environment), tapping "Play" on the menu goes to the "How to play" screen (not straight to the game), showing 5 numbered steps and a "Start playing" button.
- Tapping "Start playing" navigates to the game.
- The timer bar now resets to full on every correct answer (round duration ~5s at first) rather than counting down a single 60-second session total.
- Play through at least 10 correct answers in one session and confirm the round timer visibly gets faster (drains in ~3s instead of ~5s) starting on the 11th round.
- Let a round's timer run out without tapping anything — confirm this ends the session and navigates to `/result`, same as a wrong tap.
- From the result screen, tap "Play again" — confirm it goes straight to `/game` (not back through the instructions screen, since `hasSeenInstructions` is now `true`).
- From the result screen, tap "Menu", then tap "Play" again — confirm it also goes straight to `/game` now.
- From the menu, tap "How to play" — confirm it shows the instructions screen again (the persistent link works regardless of the flag), and "Start playing" from there also goes straight into a game.

Stop the dev server (Ctrl+C) once verified.

- [ ] **Step 6: Commit**

```bash
git add app/game.tsx
git commit -m "Replace fixed session timer with per-round timer and difficulty ramp"
```
