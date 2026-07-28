# Bold Playful UI redesign — design

## Context

The user asked for a visual overhaul: more modern, "effects," visually
striking and "addictive to keep watching." Two mechanic-adjacent
clarifications were confirmed first:

- The central word (a color name rendered in a mismatched ink color — the
  Stroop challenge) is unchanged. This is the game's core mechanic.
- The 4 answer buttons (`ColorButton`) lose their text labels entirely —
  they become pure color shapes. The player matches by color perception
  only, not by reading.

Direction was chosen from 4 mocked options: **"Bold Playful"** — bright
flat saturated colors, thick dark borders, hard offset drop-shadows
(comic-panel style), on a warm light background. This replaces the current
dark (`#111`) theme app-wide, on every screen (menu, how-to-play, game,
result), for visual consistency.

The how-to-play screen's typography/layout also gets modernized as part of
this pass (delegated to the implementer's judgment — no further user
confirmation needed on the specifics, per explicit instruction).

## Visual language

**Background:** warm cream, `#FFF6E5`, on every screen (replaces `#111`
dark theme everywhere).

**Text (headings/body):** near-black, `#1A1A1A`, instead of white/`#ccc`.

**Color palette** (`lib/colors.ts` `COLORS`, replaces the current hex
values — same 6 `ColorId`s, new bold-saturated tones that read clearly on
the cream background):

| id     | old hex   | new hex   |
|--------|-----------|-----------|
| red    | `#E53935` | `#FF4B5C` |
| blue   | `#1E88E5` | `#2F8FFF` |
| green  | `#43A047` | `#2ED573` |
| yellow | `#FDD835` | `#FFD23F` |
| purple | `#8E24AA` | `#8C54FF` |
| orange | `#FB8C00` | `#FF8C42` |

**Comic-panel treatment** — applied to every "card-like" element (color
buttons, primary buttons, the ad banner mock): a `3px` solid `#1A1A1A`
border, `border-radius: 20px`, and a hard offset shadow (`4px 4px 0
#1A1A1A`, no blur — a real box-shadow on web/Android, approximated with
`elevation` + a solid-color shadow on iOS via `shadowOffset`/`shadowColor`/
`shadowOpacity: 1`/`shadowRadius: 0`).

**Central word:** keeps rendering directly in the round's ink color (one of
the 6 palette hexes above), large and bold, with a subtle black
drop-shadow (`textShadowColor: '#1A1A1A'`, small hard offset, `radius: 0`)
for the same comic-outline pop as the buttons — not a full stroke (RN
`Text` has no native stroke), but a consistent visual echo of the button
treatment.

## Motion ("the effects")

All new motion uses `react-native-reanimated` (already an installed
dependency, unused until now — this is the first place in the codebase it
earns its place) plus `react-native-gesture-handler`'s `Pressable`-adjacent
patterns are not needed; plain `Pressable` `onPressIn`/`onPressOut` driving
reanimated shared values is enough.

1. **Round entrance:** on every new round (mount and after a correct
   answer), the central word and the 4 color blobs animate in with a
   staggered spring scale (`0 → 1`, spring config, blobs staggered ~40ms
   apart) — a satisfying "pop" rather than an instant appearance.
2. **Button press feedback:** every `ColorButton` scales down slightly on
   `onPressIn` (spring to `0.92`) and springs back on release/press-out —
   applies to color blobs and to the primary pill buttons across all
   screens (Play, Start playing, Play again, etc.) for a consistent
   "squishy" feel.
3. **Correct answer:** the tapped blob does a quick scale-up "pulse"
   (`1 → 1.15 → 1`) and a short burst of small circular particles in that
   blob's color animate outward and fade — a lightweight, purely visual
   confetti-burst (no physics engine, just a handful of reanimated views
   animating position + opacity).
4. **Wrong answer / timeout:** the whole game screen does a brief
   horizontal shake (a few small oscillations, reanimated), and a
   translucent red flash overlays the screen for a couple hundred
   milliseconds before navigating to the result screen — a clear, punchy
   "you lost" beat.
5. **Score:** `ScoreBadge`'s number animates as a count-up (reanimated
   interpolation from the old value to the new one over ~300ms) instead of
   snapping instantly, and does a small scale-pulse on every increment.
6. **Timer urgency:** `TimerBar`'s fill color shifts along a gradient as
   `progress` drops — green above 50%, yellow 20-50%, red below 20% — and
   the bar itself does a subtle pulse (opacity breathing) in the red zone,
   to build tension as a round's time runs out.

## Screen-by-screen scope

- **`components/ColorButton.tsx`:** drop the `label` text (keep
  `accessibilityLabel` for screen readers), apply the comic-panel
  treatment, add press-feedback and correct-answer-pulse animation support
  (the pulse trigger comes from the parent screen, since only the game
  screen knows which tap was "correct").
- **`components/TimerBar.tsx`:** urgency color gradient + pulse in the red
  zone.
- **`components/ScoreBadge.tsx`:** animated count-up + pulse on change.
- **`components/AdBanner.tsx`:** comic-panel treatment for visual
  consistency (no behavior change).
- **`app/index.tsx` (menu), `app/result.tsx`, `app/how-to-play.tsx`:**
  restyle to the new palette/background/comic-panel treatment; primary
  buttons get the press-feedback animation. `how-to-play.tsx` additionally
  gets a modernized type scale and layout (numbered steps redesigned as
  distinct cards/rows rather than a flat numbered list, implementer's
  discretion on exact composition).
- **`app/game.tsx`:** round-entrance stagger animation, correct-answer
  particle burst, wrong/timeout shake + flash, wiring the new
  `TimerBar`/`ScoreBadge`/`ColorButton` props.
- **`lib/colors.ts`:** new hex palette (table above) — pure data change,
  no interface change (`ColorId`, `COLORS`, `hexFor` all keep their
  existing shape).

## Non-goals

- No new game mechanics (no combo counters, no new screens, no changed
  scoring/timer rules — this is a visual/motion pass only, on top of the
  already-shipped gameplay from the prior two plans).
- No new npm dependencies beyond what's already installed
  (`react-native-reanimated` and `react-native-worklets` are already
  present from the original scaffold; nothing else is needed for this
  scope of motion).
- No dark-mode toggle — the new light "Bold Playful" theme fully replaces
  the old dark theme; no user-facing choice between them.
