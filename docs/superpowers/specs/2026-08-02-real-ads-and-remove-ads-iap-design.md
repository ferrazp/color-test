# Real ads (AdMob) + $0.99 remove-ads purchase — design

## Context

`services/ads.ts` and `services/iap.ts` have been honest, clearly-marked
mocks since the game's first version (`console.log('[ads mock] ...')`,
`purchaseRemoveAds` resolving `true` after a fake delay). Both carry a
`TODO: replace with react-native-google-mobile-ads` / `react-native-iap`
comment. The user now has a live AdMob account with ad units created and
has paid the Google Play Console developer fee, so it's time to swap both
mocks for the real thing.

## Scope confirmed with the user

- **Android only** for this pass — matches the build history (every EAS
  build so far is Android) and the fact that Play Console is the ready
  store account. iOS ad units/App ID are not configured; adding iOS later
  is a separate, additive pass (new plugin config, no rework of this
  design).
- **AdMob App ID**: `ca-app-pub-7392169245376186~5572806126`
- **Interstitial Ad Unit ID** ("Game Over Interstitial"):
  `ca-app-pub-7392169245376186/1815031115`
- **Banner Ad Unit ID** ("Result Screen Banner"):
  `ca-app-pub-7392169245376186/5887932678`
- **Interstitial frequency cap**: exactly 1 in every 3 game-overs (not
  "every game-over" — AdMob's own per-unit frequency cap is set to
  unlimited, so the app must self-limit, per the existing TODO comment's
  warning that fast repeated losses could otherwise violate ad network
  policy).
- **Remove-ads price**: $0.99 USD, one-time, non-consumable Android
  managed product, SKU `remove_ads`.
- Restore purchases is in scope (Google Play policy requires it for
  non-consumable products, so a reinstall doesn't force a re-purchase).

## Architecture

### Ads (`react-native-google-mobile-ads`)

- **`app.json`**: add the `react-native-google-mobile-ads` config plugin
  with `androidAppId` set to the App ID above. This is a native module —
  from this point on, `npx expo start` (Expo Go) can no longer run the
  app; testing requires the `development` EAS build profile (already
  defined in `eas.json`) to produce an installable dev client.
- **`lib/adUnits.ts`** (new): a single place that picks Google's official
  `TestIds` (from the package) when `__DEV__` is true, and the real Ad
  Unit IDs above otherwise. Prevents accidentally serving real ads during
  local development, which risks AdMob flagging the account for invalid
  traffic.
- **`app/_layout.tsx`**: on mount, request UMP consent info
  (`AdsConsent.requestInfoUpdate` → show form if required) **before**
  initializing the ads SDK (`mobileAds().initialize()`). This runs
  alongside the existing `setAudioModeAsync` effect, not blocking it —
  audio setup and ad consent are independent concerns and shouldn't wait
  on each other.
- **`services/ads.ts`** (rewritten, same exported signatures so call
  sites in `app/game.tsx` don't change):
  - Keeps a persisted game-over counter in `AsyncStorage` (same
    try/catch-and-ignore pattern already used everywhere else in this
    codebase for persisted flags), local to this file — not added to
    `ScoreContext`, since it's an ad-frequency concern, not game state.
  - `showInterstitial(adsRemoved)`: no-ops if `adsRemoved`. Otherwise
    increments the counter; only on every 3rd call does it actually load
    and show an `InterstitialAd` (pre-loaded eagerly so there's no
    loading-spinner delay when the round ends).
  - `logBannerImpression` is removed — the real `BannerAd` component
    reports its own impressions to AdMob directly; this hand-rolled
    logging call site goes away.
- **`components/AdBanner.tsx`**: the mock `<View>` is replaced with a real
  `<BannerAd unitId={...} size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER} />`.
  The existing `adsRemoved` early-return (`return null`) is unchanged.

### Remove-ads purchase (`react-native-iap`)

- **`services/iap.ts`** (rewritten):
  - `initIapConnection()`: called once from `app/_layout.tsx` on mount
    (`initConnection()` from the library); errors are caught and ignored,
    matching this codebase's "audio/ads must never block gameplay"
    convention applied to purchases too.
  - `purchaseRemoveAds(): Promise<boolean>` — requests the `remove_ads`
    SKU, listens for the purchase-updated event, calls
    `finishTransaction({ isConsumable: false })` on success, resolves
    `true`. Resolves `false` on cancellation or error (mirrors the mock's
    existing `Promise<boolean>` contract, so `app/result.tsx`'s
    `handleRemoveAds` doesn't need to change its call shape).
  - `restorePurchases(): Promise<boolean>` (new) — calls
    `getAvailablePurchases()`, returns `true` if `remove_ads` is present
    (already owned).
- **`app/result.tsx`**: adds a small "Restaurar compras" link-style button
  near the existing "Quitar anuncios" button (only shown when
  `!adsRemoved`, same as the purchase button), calling
  `restorePurchases()` and setting `adsRemoved` via the existing
  `ScoreContext` setter on success.

## Files touched

| File | Change |
|---|---|
| `package.json` | add `react-native-google-mobile-ads`, `react-native-iap` |
| `app.json` | add `react-native-google-mobile-ads` plugin config |
| `lib/adUnits.ts` | new — dev/prod Ad Unit ID switch |
| `app/_layout.tsx` | init UMP consent + ads SDK + IAP connection |
| `services/ads.ts` | rewritten — real interstitial/banner + frequency cap |
| `services/iap.ts` | rewritten — real purchase + restore |
| `components/AdBanner.tsx` | real `BannerAd` instead of mock `View` |
| `app/result.tsx` | add "Restaurar compras" button |

## External setup (user, outside this codebase)

1. AdMob: already done (account, app, both ad units created).
2. Create the app in Play Console (package `com.inventix.colortest`).
3. Upload a build to an internal testing track — **Play Billing purchases
   only work when the app is installed via a Play Store track**, not via
   the direct-APK link used so far for ad/UI testing.
4. Play Console → Monetize → Products → create in-app product `remove_ads`,
   $0.99 USD, active.
5. Play Console → Setup → License testing: add the tester's own Google
   account so test purchases don't charge real money.

## Testing plan

- `lib/adUnits.ts`'s dev/prod switch and `services/ads.ts`'s
  frequency-cap counter logic are pure enough to unit test (extract the
  "should this call show an ad" decision as a small pure function,
  following the existing `lib/roundDuration.test.ts` /
  `lib/generateRound.test.ts` pattern).
- Manual device testing requires a `development`-profile EAS build
  (dev client) — Expo Go cannot load native ad/IAP modules.
- Ad testing works from any install method (direct APK or Play Store
  track) since it doesn't depend on Play Billing.
- Purchase/restore testing requires installing through a Play Console
  testing track with the tester's account added as a license tester.

## Non-goals

- No iOS App ID / ad units / App Store configuration this pass.
- No server-side purchase receipt validation — client-side
  `finishTransaction` only, matching the simplicity level of the rest of
  this codebase's mocks-to-real transitions so far.
- No mediation / multiple ad networks — AdMob only.
- AdMob's own per-unit frequency capping is left at "unlimited"; the cap
  is enforced entirely in app code as described above.
