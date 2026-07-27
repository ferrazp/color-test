# Instructions screen + per-round timer — design

## Context

Two changes to the shipped Color Test game (see
[2026-07-25-color-test-game-design.md](2026-07-25-color-test-game-design.md)
for the base game this builds on):

1. A first-run "how to play" screen — the game currently drops a new player
   straight into a 60-second timed round with no explanation of the rule
   (tap the ink color, not the word).
2. The game rules change from "one 60-second session, score as many rounds
   as possible" to an endless-survival mode: each round has its own short
   countdown that resets on every correct answer, and difficulty ramps up
   over time. The player only stops when they get a round wrong or run out
   of time on a round — there is no longer a fixed total session length.

## Game rules (replaces the base spec's "Game rules" section)

- Each round has its own countdown, not the session as a whole.
- Round duration starts at **5 seconds**.
- After **10 correct answers** in the same session, round duration drops to
  **3 seconds** for all subsequent rounds (one difficulty step, not a
  continuous ramp).
- A correct tap: +10 points (unchanged), the timer resets to the current
  round duration (5s or 3s, whichever tier applies), and a new round
  generates immediately — same atomic `generateRound()` rule as before.
- A wrong tap **or** the round timer reaching 0 both end the session
  immediately, identically (both count as "getting it wrong" for game-over
  purposes) — navigates to `/result` with the accumulated score, exactly as
  today.
- Best-score tracking, the ads-mock interstitial trigger, and the result
  screen are unchanged.

## Instructions screen

- New route `app/how-to-play.tsx`: explains the rule (tap the ink color,
  not the word), the round timer and its difficulty step, and what ends
  the game. One "Start playing" button that always navigates to `/game`.
- `ScoreContext` gains a persisted `hasSeenInstructions: boolean` flag
  (same `AsyncStorage` try/catch pattern as `bestScore`/`adsRemoved`).
- Menu screen's "Play" button: if `hasSeenInstructions` is false, navigate
  to `/how-to-play` instead of `/game`. If true, navigate to `/game`
  directly, unchanged from today.
- Menu screen gains a persistent "How to play" link/button (visible
  always) that navigates to `/how-to-play` regardless of the flag, so the
  player can re-read the rules any time. Pressing "Start playing" from the
  instructions screen sets `hasSeenInstructions` to `true` (a harmless
  no-op if it's already `true`) and navigates to `/game`.

## Non-goals

- No difficulty tiers beyond the two specified (5s → 3s at 10 correct).
- No per-locale instructions illustrations — text only, same 5 languages
  (en/es/pt/fr/de) as the rest of the UI.
- No change to scoring, persistence, ads/IAP mocks, or the result screen.
