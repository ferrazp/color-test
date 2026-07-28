# Bold Playful UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle the whole app to the "Bold Playful" visual direction (light warm background, thick-border comic-panel color shapes, bold typography) and add motion/effects (entrance animations, press feedback, correct/wrong feedback, timer urgency) so the game feels modern and satisfying to play, per the approved design spec.

**Architecture:** No new screens or state; this is a styling + motion pass on top of the already-shipped game. Introduces `react-native-reanimated` usage for the first time in this codebase (already an installed dependency, unused until now) via two small shared building blocks (`lib/theme.ts` for shared color/spacing constants, `components/BouncyButton.tsx` for the app's one reusable animated pill/link button) plus per-component animation logic co-located in each component that owns it.

**Tech Stack:** Same as before, plus `react-native-reanimated` (4.5.0, already installed) for all new motion — `useSharedValue`, `useAnimatedStyle`, `withSpring`, `withTiming`, `withSequence`, `withDelay`, `withRepeat`. No babel config changes needed (`babel-preset-expo` auto-configures the Reanimated plugin — verified against the SDK 57 docs).

## Global Constraints

- The central word (color name rendered in a mismatched ink color) is unchanged — same mechanic, same `lib/generateRound.ts`/`lib/colors.ts` logic, only its visual treatment changes.
- The 4 answer buttons (`ColorButton`) lose their visible text label entirely — pure color shapes. Keep `accessibilityLabel` for screen readers.
- `lib/colors.ts` stays the single source of truth for the 6 game colors (`ColorId`, `COLORS`, `hexFor`) — no other file hardcodes or duplicates these hex values, including for the timer's green/yellow/red urgency tiers (reuse `hexFor('green')`/`hexFor('yellow')`/`hexFor('red')`).
- No new npm dependencies — `react-native-reanimated` and `react-native-worklets` are already installed and require no additional babel/config setup on SDK 57.
- No new game mechanics, scoring rules, or timer rules — this is a visual/motion pass only. `roundDurationFor`, `generateRound`, `ScoreContext`, `LanguageContext` interfaces are all unchanged.
- This project has no ESLint configured (only `tsc`/`jest`) — do not add `eslint-disable` comments anywhere, they'd be dead noise.
- Verification for animation-heavy tasks includes a manual playthrough via `npx expo start --web` (Reanimated's core APIs used here — shared values, `useAnimatedStyle`, `withSpring`/`withTiming`/`withSequence`/`withRepeat` — are all web-supported; web is an approximation of native feel but is sufficient to confirm nothing crashes and the motion/logic is structurally correct).

---

## File Structure

```
lib/
  theme.ts              # new: shared background/text/border constants
  colors.ts               # modified: new bold palette hex values (data only)
components/
  ColorButton.tsx          # modified: no text, comic-panel style, entrance + press animation
  TimerBar.tsx               # modified: urgency color tiers + red-zone pulse
  ScoreBadge.tsx               # modified: comic-panel style + pulse-on-change
  AdBanner.tsx                   # modified: comic-panel style only
  BouncyButton.tsx                 # new: shared animated pill/link button (owns tap feedback)
app/
  index.tsx                         # modified: new theme + BouncyButton
  result.tsx                         # modified: new theme + BouncyButton
  how-to-play.tsx                     # modified: new theme + modernized step layout + BouncyButton
  game.tsx                             # modified: new theme, round-entrance stagger, correct/wrong/timeout effects
```

---

### Task 1: Shared theme constants + new color palette

**Files:**
- Create: `lib/theme.ts`
- Modify: `lib/colors.ts`

**Interfaces:**
- Produces: `THEME: { background: string; text: string; textMuted: string; border: string }` (`lib/theme.ts`).
- `ColorId`, `COLORS`, `hexFor` keep their existing shape in `lib/colors.ts` — only the hex values change.
- Consumed by: every other task in this plan.

- [ ] **Step 1: Create the shared theme constants**

Create `lib/theme.ts`:
```ts
export const THEME = {
  background: '#FFF6E5',
  text: '#1A1A1A',
  textMuted: '#5C5548',
  border: '#1A1A1A',
} as const;
```

- [ ] **Step 2: Replace the color palette**

In `lib/colors.ts`, replace the `COLORS` array's hex values (keep the `id`s, `ColorDef`/`hexFor` shape, and array order unchanged):
```ts
export const COLORS: ColorDef[] = [
  { id: 'red', hex: '#FF4B5C' },
  { id: 'blue', hex: '#2F8FFF' },
  { id: 'green', hex: '#2ED573' },
  { id: 'yellow', hex: '#FFD23F' },
  { id: 'purple', hex: '#8C54FF' },
  { id: 'orange', hex: '#FF8C42' },
];
```

- [ ] **Step 3: Type-check and run the existing test suite**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npx jest`
Expected: PASS — 8/8 (unaffected; `generateRound`/`roundDuration` tests don't assert on hex values).

- [ ] **Step 4: Commit**

```bash
git add lib/theme.ts lib/colors.ts
git commit -m "Add shared theme constants and switch to the Bold Playful color palette"
```

---

### Task 2: `ColorButton` — comic-panel shape, no text, entrance + press animation

**Files:**
- Modify: `components/ColorButton.tsx`

**Interfaces:**
- Consumes: `THEME` (Task 1), `hexFor` (Task 1's new palette, same function signature).
- Produces: `ColorButton({ colorId, label, onPress, entranceKey, entranceDelay }: { colorId: ColorId; label: string; onPress: () => void; entranceKey?: number; entranceDelay?: number })` — two new optional props (`entranceKey` default `0`, `entranceDelay` default `0`), so existing call sites keep compiling until Task 5 wires them up for real; `label` stays but is no longer rendered as visible text, only used for `accessibilityLabel`.
- Consumed by: Task 5 (`app/game.tsx`).

- [ ] **Step 1: Replace the component**

Replace `components/ColorButton.tsx`:
```tsx
import { useEffect } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withSpring } from 'react-native-reanimated';
import { ColorId, hexFor } from '../lib/colors';
import { THEME } from '../lib/theme';

type Props = {
  colorId: ColorId;
  label: string;
  onPress: () => void;
  entranceKey?: number;
  entranceDelay?: number;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function ColorButton({ colorId, label, onPress, entranceKey = 0, entranceDelay = 0 }: Props) {
  const scale = useSharedValue(0);

  useEffect(() => {
    scale.value = 0;
    scale.value = withDelay(entranceDelay, withSpring(1, { damping: 10, stiffness: 180 }));
  }, [entranceKey, entranceDelay, scale]);

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
      style={[styles.button, { backgroundColor: hexFor(colorId) }, animatedStyle]}
      accessibilityRole="button"
      accessibilityLabel={label}
    />
  );
}

const styles = StyleSheet.create({
  button: {
    width: '47%',
    aspectRatio: 2,
    borderRadius: 20,
    marginBottom: 12,
    borderWidth: 3,
    borderColor: THEME.border,
    shadowColor: THEME.border,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
});
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors. `entranceKey`/`entranceDelay` are optional with defaults, so `app/game.tsx`'s existing (not-yet-updated) call site still compiles unchanged — it just won't have the new stagger animation wired up until Task 5.

- [ ] **Step 3: Commit**

```bash
git add components/ColorButton.tsx
git commit -m "Redesign ColorButton: comic-panel shape, no text, entrance and press animations"
```

---

### Task 3: `TimerBar`, `ScoreBadge`, `AdBanner` — comic-panel style + feedback animation

**Files:**
- Modify: `components/TimerBar.tsx`
- Modify: `components/ScoreBadge.tsx`
- Modify: `components/AdBanner.tsx`

**Interfaces:**
- Consumes: `THEME` (Task 1), `hexFor` (Task 1).
- `TimerBar({ progress }: { progress: number })`, `ScoreBadge({ label, value }: { label: string; value: number })` — prop shapes unchanged, only internal rendering/animation changes.
- Consumed by: Task 5 (`app/game.tsx`, both already used there).

- [ ] **Step 1: Replace `TimerBar`**

Replace `components/TimerBar.tsx`:
```tsx
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { hexFor } from '../lib/colors';
import { THEME } from '../lib/theme';

type Props = {
  progress: number;
};

const URGENT_THRESHOLD = 0.2;
const WARNING_THRESHOLD = 0.5;

function colorForProgress(progress: number): string {
  if (progress > WARNING_THRESHOLD) {
    return hexFor('green');
  }
  if (progress > URGENT_THRESHOLD) {
    return hexFor('yellow');
  }
  return hexFor('red');
}

export function TimerBar({ progress }: Props) {
  const clamped = Math.max(0, Math.min(1, progress));
  const isUrgent = clamped <= URGENT_THRESHOLD;
  const pulse = useSharedValue(1);

  useEffect(() => {
    if (isUrgent) {
      pulse.value = withRepeat(withSequence(withTiming(0.45, { duration: 220 }), withTiming(1, { duration: 220 })), -1);
    } else {
      pulse.value = withTiming(1, { duration: 150 });
    }
  }, [isUrgent, pulse]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: pulse.value,
  }));

  return (
    <View style={styles.track}>
      <Animated.View
        style={[styles.fill, { width: `${clamped * 100}%`, backgroundColor: colorForProgress(clamped) }, animatedStyle]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 14,
    borderRadius: 999,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: THEME.border,
    overflow: 'hidden',
    marginBottom: 16,
  },
  fill: {
    height: '100%',
  },
});
```

- [ ] **Step 2: Replace `ScoreBadge`**

Replace `components/ScoreBadge.tsx`:
```tsx
import { useEffect } from 'react';
import { StyleSheet, Text } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { THEME } from '../lib/theme';

type Props = {
  label: string;
  value: number;
};

export function ScoreBadge({ label, value }: Props) {
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withSequence(withTiming(1.3, { duration: 120 }), withTiming(1, { duration: 160 }));
  }, [value, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      <Text style={styles.text}>
        {label}: {value}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'flex-end',
    marginBottom: 8,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: THEME.border,
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  text: {
    color: THEME.text,
    fontSize: 16,
    fontWeight: '800',
  },
});
```

- [ ] **Step 3: Replace `AdBanner`**

Replace `components/AdBanner.tsx`:
```tsx
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useScore } from '../context/ScoreContext';
import { THEME } from '../lib/theme';
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
    borderRadius: 16,
    backgroundColor: '#fff',
    borderWidth: 3,
    borderColor: THEME.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: THEME.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
});
```

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add components/TimerBar.tsx components/ScoreBadge.tsx components/AdBanner.tsx
git commit -m "Restyle TimerBar, ScoreBadge, and AdBanner; add urgency and score-change animation"
```

---

### Task 4: `BouncyButton` + restyle menu, result, and how-to-play screens

**Files:**
- Create: `components/BouncyButton.tsx`
- Modify: `app/index.tsx`
- Modify: `app/result.tsx`
- Modify: `app/how-to-play.tsx`

**Interfaces:**
- Consumes: `THEME`, `hexFor` (Task 1); `tapFeedback` (existing `services/haptics.ts`); `playSound` (existing `services/sound.ts`).
- Produces: `BouncyButton({ label, onPress, variant, disabled }: { label: string; onPress: () => void; variant?: 'primary' | 'secondary' | 'link'; disabled?: boolean })` — calls `tapFeedback()` + `playSound('tap')` internally before invoking `onPress`, so callers no longer need to do that themselves.

- [ ] **Step 1: Create `BouncyButton`**

Create `components/BouncyButton.tsx`:
```tsx
import { Pressable, StyleSheet, Text } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { hexFor } from '../lib/colors';
import { THEME } from '../lib/theme';
import { tapFeedback } from '../services/haptics';
import { playSound } from '../services/sound';

type Variant = 'primary' | 'secondary' | 'link';

type Props = {
  label: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function BouncyButton({ label, onPress, variant = 'primary', disabled = false }: Props) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  function handlePressIn() {
    scale.value = withSpring(0.92, { damping: 12, stiffness: 300 });
  }

  function handlePressOut() {
    scale.value = withSpring(1, { damping: 10, stiffness: 200 });
  }

  function handlePress() {
    tapFeedback();
    playSound('tap');
    onPress();
  }

  const textStyle =
    variant === 'primary' ? styles.primaryText : variant === 'secondary' ? styles.secondaryText : styles.linkText;

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      style={[styles.base, styles[variant], animatedStyle, disabled ? styles.disabled : null]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Text style={textStyle}>{label}</Text>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: {
    backgroundColor: hexFor('green'),
    borderWidth: 3,
    borderColor: THEME.border,
    paddingVertical: 16,
    paddingHorizontal: 48,
    shadowColor: THEME.border,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  secondary: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  link: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  disabled: {
    opacity: 0.5,
  },
  primaryText: {
    fontSize: 20,
    fontWeight: '800',
    color: THEME.text,
  },
  secondaryText: {
    fontSize: 16,
    fontWeight: '700',
    color: THEME.textMuted,
  },
  linkText: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.textMuted,
  },
});
```

- [ ] **Step 2: Restyle the menu screen**

Replace `app/index.tsx`:
```tsx
import { router } from 'expo-router';
import { StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BouncyButton } from '../components/BouncyButton';
import { useLanguage } from '../context/LanguageContext';
import { useScore } from '../context/ScoreContext';
import { THEME } from '../lib/theme';

export default function MenuScreen() {
  const { t } = useLanguage();
  const { bestScore, hasSeenInstructions } = useScore();

  function handlePlay() {
    router.push(hasSeenInstructions ? '/game' : '/how-to-play');
  }

  function handleHowToPlay() {
    router.push('/how-to-play');
  }

  return (
    <SafeAreaView style={styles.container}>
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
  title: { fontSize: 44, fontWeight: '900', color: THEME.text, letterSpacing: 0.5 },
  bestScore: { fontSize: 18, color: THEME.textMuted, fontWeight: '600' },
});
```

- [ ] **Step 3: Restyle the result screen**

Replace `app/result.tsx`:
```tsx
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AdBanner } from '../components/AdBanner';
import { BouncyButton } from '../components/BouncyButton';
import { useLanguage } from '../context/LanguageContext';
import { useScore } from '../context/ScoreContext';
import { hexFor } from '../lib/colors';
import { THEME } from '../lib/theme';
import { purchaseRemoveAds } from '../services/iap';

export default function ResultScreen() {
  const { t } = useLanguage();
  const { score, adsRemoved, wasNewBest, setAdsRemoved } = useScore();
  const [purchasing, setPurchasing] = useState(false);

  function handlePlayAgain() {
    router.replace('/game');
  }

  function handleMenu() {
    router.replace('/');
  }

  async function handleRemoveAds() {
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
      {wasNewBest && <Text style={styles.newBest}>{t('newBest')}</Text>}
      <AdBanner />
      <BouncyButton label={t('playAgain')} onPress={handlePlayAgain} variant="primary" />
      <BouncyButton label={t('menu')} onPress={handleMenu} variant="secondary" />
      {!adsRemoved && (
        <BouncyButton
          label={purchasing ? t('purchasing') : t('removeAds')}
          onPress={handleRemoveAds}
          variant="link"
          disabled={purchasing}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    padding: 24,
  },
  score: { fontSize: 30, fontWeight: '900', color: THEME.text },
  newBest: { fontSize: 16, color: hexFor('orange'), fontWeight: '800' },
});
```

Note: `bestScore` was previously destructured from `useScore()` in this file but never actually rendered — it's dropped here since it's genuinely unused (`wasNewBest` already encapsulates the comparison the old dead variable was for).

- [ ] **Step 4: Restyle and modernize the how-to-play screen**

Replace `app/how-to-play.tsx`:
```tsx
import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BouncyButton } from '../components/BouncyButton';
import { useLanguage } from '../context/LanguageContext';
import { useScore } from '../context/ScoreContext';
import { THEME } from '../lib/theme';

export default function HowToPlayScreen() {
  const { t, instructionsSteps } = useLanguage();
  const { setHasSeenInstructions } = useScore();

  function handleStart() {
    setHasSeenInstructions(true);
    router.replace('/game');
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>{t('instructionsTitle')}</Text>
        <View style={styles.steps}>
          {instructionsSteps.map((step, index) => (
            <View key={index} style={styles.stepRow}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>{index + 1}</Text>
              </View>
              <Text style={styles.stepText}>{step}</Text>
            </View>
          ))}
        </View>
        <BouncyButton label={t('start')} onPress={handleStart} variant="primary" />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: THEME.background },
  container: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 28,
    padding: 24,
  },
  title: { fontSize: 32, fontWeight: '900', color: THEME.text, letterSpacing: 0.5 },
  steps: { gap: 14, alignSelf: 'stretch' },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: THEME.border,
    padding: 12,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: THEME.text,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  stepNumberText: { color: THEME.background, fontSize: 14, fontWeight: '900' },
  stepText: { flex: 1, fontSize: 15, lineHeight: 21, color: THEME.text, fontWeight: '600' },
});
```

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add components/BouncyButton.tsx app/index.tsx app/result.tsx app/how-to-play.tsx
git commit -m "Add BouncyButton and restyle menu, result, and how-to-play screens"
```

---

### Task 5: Game screen — round-entrance stagger, correct/wrong/timeout effects

**Files:**
- Modify: `app/game.tsx`

**Interfaces:**
- Consumes: `THEME`, `hexFor` (Task 1); `ColorButton` with `entranceKey`/`entranceDelay` (Task 2); `TimerBar`, `ScoreBadge` (Task 3).

- [ ] **Step 1: Replace the game screen**

Replace `app/game.tsx`:
```tsx
import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { ColorButton } from '../components/ColorButton';
import { ScoreBadge } from '../components/ScoreBadge';
import { TimerBar } from '../components/TimerBar';
import { useLanguage } from '../context/LanguageContext';
import { useScore } from '../context/ScoreContext';
import { ColorId, hexFor } from '../lib/colors';
import { generateRound } from '../lib/generateRound';
import { roundDurationFor } from '../lib/roundDuration';
import { THEME } from '../lib/theme';
import { showInterstitial } from '../services/ads';
import { errorFeedback, successFeedback } from '../services/haptics';
import { playSound } from '../services/sound';

const TICK_MS = 100;
const POINTS_PER_CORRECT = 10;
const RESULT_TRANSITION_DELAY_MS = 450;

export default function GameScreen() {
  const { t, colorName } = useLanguage();
  const { score, adsRemoved, addPoints, resetSession, endSession } = useScore();
  const [round, setRound] = useState(() => generateRound());
  const [correctCount, setCorrectCount] = useState(0);
  const [remainingMs, setRemainingMs] = useState(() => roundDurationFor(0));
  const [flashColor, setFlashColor] = useState(hexFor('red'));
  const endedRef = useRef(false);
  const finishTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const roundDurationMs = roundDurationFor(correctCount);

  const wordScale = useSharedValue(0);
  const shakeX = useSharedValue(0);
  const flashOpacity = useSharedValue(0);

  useEffect(() => {
    resetSession();
  }, [resetSession]);

  useEffect(() => {
    return () => {
      if (finishTimeoutRef.current) {
        clearTimeout(finishTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    wordScale.value = 0;
    wordScale.value = withSpring(1, { damping: 9, stiffness: 160 });
  }, [correctCount, wordScale]);

  const finishGame = useCallback(() => {
    if (endedRef.current) {
      return;
    }
    endedRef.current = true;
    shakeX.value = withSequence(
      withTiming(-12, { duration: 60 }),
      withTiming(12, { duration: 60 }),
      withTiming(-10, { duration: 60 }),
      withTiming(10, { duration: 60 }),
      withTiming(0, { duration: 60 })
    );
    setFlashColor(hexFor('red'));
    flashOpacity.value = withSequence(withTiming(0.35, { duration: 80 }), withTiming(0, { duration: 350 }));
    endSession();
    showInterstitial(adsRemoved);
    finishTimeoutRef.current = setTimeout(() => {
      router.replace('/result');
    }, RESULT_TRANSITION_DELAY_MS);
  }, [endSession, adsRemoved, shakeX, flashOpacity]);

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
      addPoints(POINTS_PER_CORRECT);
      successFeedback();
      playSound('correct');
      setFlashColor(hexFor(round.ink));
      flashOpacity.value = withSequence(withTiming(0.25, { duration: 60 }), withTiming(0, { duration: 250 }));
      setCorrectCount(nextCorrectCount);
      setRound(generateRound());
      setRemainingMs(roundDurationFor(nextCorrectCount));
    } else {
      errorFeedback();
      playSound('wrong');
      finishGame();
    }
  }

  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }],
  }));

  const wordStyle = useAnimatedStyle(() => ({
    transform: [{ scale: wordScale.value }],
  }));

  const flashStyle = useAnimatedStyle(
    () => ({
      opacity: flashOpacity.value,
      backgroundColor: flashColor,
    }),
    [flashColor]
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <Animated.View style={[styles.container, shakeStyle]}>
        <TimerBar progress={remainingMs / roundDurationMs} />
        <ScoreBadge label={t('score')} value={score} />
        <View style={styles.wordContainer}>
          <Animated.Text style={[styles.word, { color: hexFor(round.ink) }, wordStyle]}>
            {colorName(round.word)}
          </Animated.Text>
        </View>
        <View style={styles.options}>
          {round.options.map((id, index) => (
            <ColorButton
              key={id}
              colorId={id}
              label={colorName(id)}
              onPress={() => handleAnswer(id)}
              entranceKey={correctCount}
              entranceDelay={index * 40}
            />
          ))}
        </View>
        <Animated.View pointerEvents="none" style={[styles.flashOverlay, flashStyle]} />
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: THEME.background },
  container: { flex: 1, padding: 16 },
  wordContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  word: { fontSize: 48, fontWeight: '900' },
  options: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  flashOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
});
```

Design notes for the implementer (context, not extra scope to add):
- The correct-answer "celebration" is intentionally *not* a per-button particle burst. Since `setRound(generateRound())` fires in the same synchronous handler as the correct-answer feedback (no artificial delay — the game must stay responsive at a 3-second round duration), a per-button effect would race against the button being replaced before it finishes animating. Instead, the round-entrance stagger (word + buttons popping in via `entranceKey`) *is* the correct-answer celebration, plus a brief color-tinted full-screen flash (`flashOverlay`) that doesn't block input (`pointerEvents="none"`) and doesn't delay anything.
- The wrong-tap/timeout path is the only place a delay was added (`RESULT_TRANSITION_DELAY_MS`), and only to the *navigation*, not to `endSession()`/`showInterstitial()` — the game is already over at that point, so holding on the game screen for ~450ms just lets the shake + red flash play before cutting to the result screen.

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Run the full test suite**

Run: `npx jest`
Expected: PASS — 8/8, unaffected (this task touches no pure-logic files).

- [ ] **Step 4: Verify the app bundles**

Run: `npx expo export --platform web --output-dir .tmp-export-check`
Expected: exit 0, no red errors.
Then remove the throwaway dir: `rm -rf .tmp-export-check` (bash) or `Remove-Item -Recurse -Force .tmp-export-check` (PowerShell).

- [ ] **Step 5: Manual playthrough**

Run: `npx expo start --web`
Open the printed local URL in a browser and confirm:
- Every screen (menu, how-to-play, game, result) shows the new warm cream background and bold dark text — no leftover dark (`#111`) backgrounds anywhere.
- The menu's "Play" and "How to play" buttons visibly scale down on press and spring back.
- The 4 color buttons on the game screen are plain color shapes with a dark border and hard offset shadow — no text on them.
- On entering a round (both the very first one and every one after a correct answer), the word and the 4 buttons visibly pop in with a staggered bounce, not an instant appearance.
- Tapping the correct color: the score badge pulses, a brief color-tinted flash sweeps the screen, and a new round immediately pops in — no dead pause, no visual glitch from the outgoing buttons.
- Tapping the wrong color: the whole game screen shakes briefly, a red flash sweeps the screen, and after roughly half a second it navigates to the result screen (not instantly).
- Let a round's timer run out without tapping: same shake + red flash + delayed navigation as a wrong tap.
- Watch the timer bar during a round: it's green above half, yellow in the middle range, and turns red and pulses (breathing opacity) in the final ~20% of the round.
- The result and how-to-play screens' buttons also show the press scale-down/spring-back.
- The how-to-play screen's steps render as distinct numbered rows/cards, not a flat numbered list.

Stop the dev server (Ctrl+C) once verified.

- [ ] **Step 6: Commit**

```bash
git add app/game.tsx
git commit -m "Add round-entrance, correct/wrong, and timeout motion effects to the game screen"
```
