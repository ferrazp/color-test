# Color Test — game design

## Context

The original game source (screens, context, services, components, locales)
was lost when the project folders were manually renamed outside of version
control. Only the bare Expo scaffold (`create-expo-app` base + dependencies)
survived, inside what is now this repo (`color-test-code`). This spec
rebuilds the game from scratch, directly inside this repo, so it is
versioned from day one.

The game is a casual reflex game based on the Stroop effect, built with
React Native + Expo Router (SDK 57), with automatic multi-language support
and mocked monetization (ads + remove-ads purchase) ready to be swapped for
real SDKs later.

Display name: **Color Test** (matches the repo/slug name; avoids clashing
with the several existing "Color Rush" apps already published elsewhere).

## Architecture

Expo Router (file-based routing) + React Context for global state + plain
service modules for cross-cutting concerns (ads, IAP, sound, haptics). This
matches the dependencies already installed in `package.json`
(`expo-router`, `expo-localization`, `expo-av`, `expo-haptics`,
`@react-native-async-storage/async-storage`, gesture/reanimated libs), so
nothing installed goes unused.

Rejected alternatives:
- **No router, single component with local state** — simpler file count,
  but throws away the already-installed `expo-router` deps and makes it
  harder to add more screens (settings, store) later.
- **Zustand instead of Context** — unnecessary dependency for the ~3 pieces
  of global state this app needs (language, score, ads-removed flag).

## Screens & navigation (`app/`)

- **`app/_layout.tsx`** — root layout. Wraps the app in `LanguageProvider`
  and `ScoreProvider`, loads fonts/splash, defines the router stack (no
  native header, simple transitions).
- **`app/index.tsx`** (Menu) — title "Color Test", best score, "Play"
  button, mute toggle. "Play" navigates to `/game`.
- **`app/game.tsx`** (Gameplay) — countdown timer bar at top, the color
  word in the center (rendered in the "ink" color), 4 color buttons below,
  current score in a corner. Ends the session by navigating to `/result`.
- **`app/result.tsx`** (Result) — final score, "New best!" indicator when
  applicable, mock ad banner, "Play again" / "Menu" buttons.

## Reusable components (`components/`)

- `ColorButton` — one of the 4 tappable color options.
- `TimerBar` — animated countdown bar.
- `ScoreBadge` — current score display.
- `AdBanner` — mock banner placeholder.

## State & data flow (`context/`)

- **`LanguageContext.tsx`** — detects device locale via
  `expo-localization` on mount. Dictionaries live in
  `locales/{es,en,pt,fr,de}.json` (UI strings + localized color names).
  Unsupported locale falls back to English. Exposes `useLanguage()` with
  `t(key)` and `colorName(id)`.
- **`ScoreContext.tsx`** — holds `score` (in-memory, current session),
  `bestScore` (persisted via `AsyncStorage`), and `adsRemoved` (persisted).
  Reads from `AsyncStorage` on mount and writes on change; both wrapped in
  try/catch with defaults (`0` / `false`) on failure so storage errors never
  crash the app.

## Services (`services/`)

- **`ads.ts`** — `showInterstitial()` and `<AdBanner>` mock: console.log
  placeholders with a `// TODO: replace with react-native-google-mobile-ads`
  comment. No-ops when `adsRemoved` is true.
- **`iap.ts`** — `purchaseRemoveAds()` mock: resolves `true` after a
  simulated delay and updates `ScoreContext`.
- **`sound.ts`** — thin `expo-av` wrapper for tap/correct/wrong sound
  effects, using silent placeholder audio files. Load/play failures are
  caught and ignored.
- **`haptics.ts`** — thin `expo-haptics` wrapper for tap feedback.

## Game rules

A single 60-second timed session (not a lives system):

1. `generateRound()` produces `{ word, ink, options }` in **one atomic
   function**, stored via a single `useState(() => generateRound())`:
   - `word`: the color name shown as text.
   - `ink`: the actual render color of that text — always different from
     `word` (that mismatch is the Stroop effect).
   - `options`: 4 shuffled color ids including `ink` plus 3 unique
     distractors.
   - This mirrors the anti-bug rule identified before: everything that
     changes together is stored together in one state update, so there is
     never an intermediate render with an undefined color (the root cause
     of the earlier "sometimes shows no color" bug).
2. The player must tap the button matching the **ink** color, not the word.
3. Correct tap → +10 points, a new round is generated immediately, the
   timer keeps running.
4. Wrong tap → session ends immediately, navigates to `/result`.
5. Timer reaching 0 → session ends the same way.
6. On session end: if `score > bestScore`, update and persist it; fire
   `showInterstitial()` (mock, no-op if `adsRemoved`).

## Error handling

- `AsyncStorage` reads/writes wrapped in try/catch, falling back to
  in-memory defaults — never crashes the app.
- Unsupported device locale falls back to English.
- Sound load/playback failures are caught and ignored silently.

## Testing

No test runner is configured yet. Scope for this rebuild:

- **Automated**: add a lightweight Jest unit test for `generateRound()`
  only (pure logic, no RN rendering) — asserts `word !== ink`, `options`
  contains `ink`, and `options` has no duplicates. This is the one area
  with real risk of a subtle bug and the cheapest to test in isolation.
- **Manual**: everything else (screens, navigation, timer behavior,
  automatic language detection, score persistence, mock ad/IAP console
  output) is verified by running the app with `expo start` (Expo Go or
  web) and playing through a full session.
