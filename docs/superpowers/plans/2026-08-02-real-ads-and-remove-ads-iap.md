# Real ads (AdMob) + $0.99 remove-ads purchase — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the honest mocks in `services/ads.ts` and `services/iap.ts` with real AdMob ads (banner + interstitial) and a real $0.99 Google Play "remove ads" purchase.

**Architecture:** `react-native-google-mobile-ads` (v16) drives banner/interstitial ads with a self-enforced 1-in-3 interstitial frequency cap and UMP consent. `react-native-iap` (v16, Nitro-based) drives the `remove_ads` non-consumable purchase and its restore flow. Both stay plain, non-React service modules (`services/ads.ts`, `services/iap.ts`) matching the existing `services/sound.ts` pattern — call sites don't change shape.

**Tech Stack:** Expo SDK 57, React Native 0.86, `react-native-google-mobile-ads` ^16.4.0, `react-native-iap` ^16.0.1, `react-native-nitro-modules` ^0.36.5, `expo-build-properties` ~57.0.8 (Kotlin 2.2.0, required by `react-native-iap`'s Kotlin 2.0+ floor).

## Global Constraints

- **Android only** this pass — no iOS App ID/ad units/App Store config.
- AdMob App ID: `ca-app-pub-7392169245376186~5572806126`
- Interstitial Ad Unit ID: `ca-app-pub-7392169245376186/1815031115`
- Banner Ad Unit ID: `ca-app-pub-7392169245376186/5887932678`
- Interstitial shows on exactly 1 of every 3 game-overs (`gameOverCount % 3 === 0`), persisted across app restarts.
- Remove-ads SKU: `remove_ads`, $0.99 USD, non-consumable — configured in Play Console by the user (external step, not part of this plan).
- Real Ad Unit IDs are used only when `!__DEV__`; `__DEV__` always uses Google's official `TestIds`.
- `services/ads.ts` and `services/iap.ts` keep their existing exported function names/signatures wherever a call site already depends on them, so `app/game.tsx` and `app/result.tsx`'s existing call shapes don't need unrelated changes.
- From this point on, `npx expo start` (Expo Go) cannot run the app — both libraries are native modules. Use `eas build --profile development --platform android` for a dev client instead.

---

### Task 1: Install dependencies and configure native plugins

**Files:**
- Modify: `package.json`
- Modify: `app.json`

**Interfaces:**
- Produces: `react-native-google-mobile-ads`, `react-native-iap`, `react-native-nitro-modules`, `expo-build-properties` available as npm dependencies for every later task to import from.

- [ ] **Step 1: Install the packages**

```bash
npx expo install react-native-google-mobile-ads react-native-iap react-native-nitro-modules expo-build-properties
```

- [ ] **Step 2: Add the AdMob and Kotlin-version config plugins to `app.json`**

In `app.json`, the `expo.plugins` array currently ends with `"expo-font"` and `"expo-asset"`. Replace that array with:

```json
    "plugins": [
      "expo-router",
      "expo-localization",
      [
        "expo-splash-screen",
        {
          "image": "./assets/splash-icon.png",
          "imageWidth": 200,
          "backgroundColor": "#FFF6E5"
        }
      ],
      "expo-font",
      "expo-asset",
      [
        "react-native-google-mobile-ads",
        {
          "androidAppId": "ca-app-pub-7392169245376186~5572806126"
        }
      ],
      [
        "expo-build-properties",
        {
          "android": {
            "kotlinVersion": "2.2.0"
          }
        }
      ]
    ],
```

`react-native-iap` ships no Expo config plugin of its own (verified: no `app.plugin.js` / `expo-module.config.json` in the installed package) — do **not** add `"react-native-iap"` to this array, it would fail to resolve. Its only build requirement is the Kotlin 2.2.0 floor set above.

- [ ] **Step 3: Verify the install is sane**

```bash
npx expo-doctor
npx tsc --noEmit
```

Expected: `expo-doctor` reports `20/20 checks passed` (or lists only pre-existing, unrelated warnings), and `tsc` exits with no output. Neither command exercises the new native code yet — this step only confirms the dependency graph and plugin config are valid.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json app.json
git commit -m "Add react-native-google-mobile-ads and react-native-iap dependencies"
```

---

### Task 2: Ad unit IDs and interstitial frequency cap (pure logic)

**Files:**
- Create: `lib/adUnits.ts`
- Create: `lib/adFrequency.ts`
- Test: `lib/adFrequency.test.ts`

**Interfaces:**
- Consumes: nothing (pure, no dependency on Task 1's native modules beyond the `TestIds` type import).
- Produces:
  - `BANNER_AD_UNIT_ID: string`, `INTERSTITIAL_AD_UNIT_ID: string` (from `lib/adUnits.ts`)
  - `shouldShowInterstitial(gameOverCount: number): boolean` (from `lib/adFrequency.ts`) — used by Task 3.

- [ ] **Step 1: Write the failing test for the frequency cap**

Create `lib/adFrequency.test.ts`:

```ts
import { shouldShowInterstitial } from './adFrequency';

describe('shouldShowInterstitial', () => {
  it('does not show on the 1st or 2nd game-over', () => {
    expect(shouldShowInterstitial(1)).toBe(false);
    expect(shouldShowInterstitial(2)).toBe(false);
  });

  it('shows on the 3rd game-over', () => {
    expect(shouldShowInterstitial(3)).toBe(true);
  });

  it('does not show on the 4th or 5th game-over', () => {
    expect(shouldShowInterstitial(4)).toBe(false);
    expect(shouldShowInterstitial(5)).toBe(false);
  });

  it('shows again on the 6th game-over', () => {
    expect(shouldShowInterstitial(6)).toBe(true);
  });

  it('shows on the 9th game-over (three cycles in)', () => {
    expect(shouldShowInterstitial(9)).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npx jest lib/adFrequency.test.ts
```

Expected: FAIL — `Cannot find module './adFrequency'`.

- [ ] **Step 3: Implement `lib/adFrequency.ts`**

```ts
const INTERSTITIAL_FREQUENCY = 3;

export function shouldShowInterstitial(gameOverCount: number): boolean {
  return gameOverCount % INTERSTITIAL_FREQUENCY === 0;
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
npx jest lib/adFrequency.test.ts
```

Expected: PASS, 5 tests.

- [ ] **Step 5: Implement `lib/adUnits.ts`**

```ts
import { TestIds } from 'react-native-google-mobile-ads';

export const BANNER_AD_UNIT_ID = __DEV__ ? TestIds.ADAPTIVE_BANNER : 'ca-app-pub-7392169245376186/5887932678';

export const INTERSTITIAL_AD_UNIT_ID = __DEV__ ? TestIds.INTERSTITIAL : 'ca-app-pub-7392169245376186/1815031115';
```

- [ ] **Step 6: Run the full test suite and typecheck**

```bash
npx jest
npx tsc --noEmit
```

Expected: all suites pass (the two pre-existing suites plus the new `adFrequency` one — 13 tests total), no type errors.

- [ ] **Step 7: Commit**

```bash
git add lib/adUnits.ts lib/adFrequency.ts lib/adFrequency.test.ts
git commit -m "Add ad unit ID selection and interstitial frequency-cap logic"
```

---

### Task 3: Real `services/ads.ts`

**Files:**
- Modify: `services/ads.ts`

**Interfaces:**
- Consumes: `BANNER_AD_UNIT_ID`, `INTERSTITIAL_AD_UNIT_ID` (Task 2's `lib/adUnits.ts`), `shouldShowInterstitial` (Task 2's `lib/adFrequency.ts`).
- Produces:
  - `initAds(): Promise<void>` — called once by Task 5 from `app/_layout.tsx`.
  - `showInterstitial(adsRemoved: boolean): void` — unchanged signature, still called from `app/game.tsx`'s `finishGame`.
  - Removes `logBannerImpression` (no longer needed — Task 4's real `BannerAd` reports its own impressions to AdMob).

- [ ] **Step 1: Replace `services/ads.ts`**

```ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AdEventType, AdsConsent, InterstitialAd, mobileAds } from 'react-native-google-mobile-ads';
import { shouldShowInterstitial } from '../lib/adFrequency';
import { INTERSTITIAL_AD_UNIT_ID } from '../lib/adUnits';

const GAME_OVER_COUNT_KEY = 'colorTest.gameOverCount';

let preloadedInterstitial: InterstitialAd | null = null;

function preloadInterstitial(): void {
  const interstitial = InterstitialAd.createForAdRequest(INTERSTITIAL_AD_UNIT_ID);
  interstitial.addAdEventListener(AdEventType.CLOSED, () => {
    preloadedInterstitial = null;
    preloadInterstitial();
  });
  interstitial.load();
  preloadedInterstitial = interstitial;
}

export async function initAds(): Promise<void> {
  try {
    const consentInfo = await AdsConsent.gatherConsent();
    if (!consentInfo.canRequestAds) {
      return;
    }
    await mobileAds().initialize();
    preloadInterstitial();
  } catch {
    // Ads must never block gameplay.
  }
}

async function nextGameOverCount(): Promise<number> {
  try {
    const stored = await AsyncStorage.getItem(GAME_OVER_COUNT_KEY);
    const next = (Number(stored) || 0) + 1;
    await AsyncStorage.setItem(GAME_OVER_COUNT_KEY, String(next));
    return next;
  } catch {
    return 1;
  }
}

export function showInterstitial(adsRemoved: boolean): void {
  if (adsRemoved) {
    return;
  }
  nextGameOverCount()
    .then((count) => {
      if (!shouldShowInterstitial(count)) {
        return;
      }
      if (preloadedInterstitial?.loaded) {
        preloadedInterstitial.show().catch(() => {
          // Ads must never block gameplay.
        });
      }
    })
    .catch(() => {
      // Ads must never block gameplay.
    });
}
```

Notes for the implementer:
- `AdsConsent.gatherConsent()` runs the full UMP flow (request info + show the consent form if the user is in a region that requires it) in one call; `canRequestAds` tells us whether we're clear to initialize the SDK.
- The interstitial is preloaded once after `initAds()` succeeds, and replaces itself the moment the shown ad closes (`AdEventType.CLOSED`), so there's always a warm ad ready by the time the next 3rd game-over comes around — never a load spent waiting on the game-over path itself.
- `showInterstitial` stays a synchronous `void` function (its call site in `app/game.tsx:73` doesn't `await` it) — all the async work happens internally and is fully swallowed on error, matching this codebase's "ads must never block gameplay" convention already stated in the pre-existing TODO comment.

- [ ] **Step 2: Typecheck**

```bash
npx tsc --noEmit
```

Expected: no errors. (No automated test for this file — it's a thin imperative wrapper around a native SDK, following the same untested-service-module convention already established by `services/sound.ts`/`services/haptics.ts` in this codebase.)

- [ ] **Step 3: Commit**

```bash
git add services/ads.ts
git commit -m "Wire services/ads.ts to real AdMob interstitial with frequency cap"
```

---

### Task 4: Real `AdBanner` component

**Files:**
- Modify: `components/AdBanner.tsx`

**Interfaces:**
- Consumes: `BANNER_AD_UNIT_ID` (Task 2's `lib/adUnits.ts`), `useScore()`'s `adsRemoved` (existing `context/ScoreContext.tsx`, unchanged).
- Produces: same default export `AdBanner` component, same "renders nothing when `adsRemoved`" behavior — `app/result.tsx`'s `<AdBanner />` usage is unchanged.

- [ ] **Step 1: Replace `components/AdBanner.tsx`**

```tsx
import { StyleSheet, View } from 'react-native';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';
import { useScore } from '../context/ScoreContext';
import { BANNER_AD_UNIT_ID } from '../lib/adUnits';

export function AdBanner() {
  const { adsRemoved } = useScore();

  if (adsRemoved) {
    return null;
  }

  return (
    <View style={styles.container}>
      <BannerAd unitId={BANNER_AD_UNIT_ID} size={BannerAdSize.LARGE_ANCHORED_ADAPTIVE_BANNER} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
  },
});
```

Note: `BannerAd` does not forward arbitrary `View` props like `style` (confirmed in its type definition — only `unitId`, `size`, and ad-specific props are accepted), so it's wrapped in a plain `View` for layout/centering, same as the library's own documented usage pattern. The old mock's border/rounded placeholder box is dropped — that styling only made sense for a fake text banner, not a real ad creative.

- [ ] **Step 2: Typecheck**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/AdBanner.tsx
git commit -m "Render a real AdMob banner instead of the mock placeholder"
```

---

### Task 5: Real `services/iap.ts`

**Files:**
- Modify: `services/iap.ts`

**Interfaces:**
- Produces:
  - `initIapConnection(): Promise<void>` — called once by Task 6 from `app/_layout.tsx`.
  - `purchaseRemoveAds(): Promise<boolean>` — same signature as the mock; `app/result.tsx:29`'s `await purchaseRemoveAds()` call is unchanged.
  - `restorePurchases(): Promise<boolean>` (new) — used by Task 6's `app/result.tsx` addition.

- [ ] **Step 1: Replace `services/iap.ts`**

```ts
import {
  finishTransaction,
  getAvailablePurchases,
  initConnection,
  purchaseErrorListener,
  purchaseUpdatedListener,
  requestPurchase,
  type Purchase,
} from 'react-native-iap';

const REMOVE_ADS_SKU = 'remove_ads';

export async function initIapConnection(): Promise<void> {
  try {
    await initConnection();
  } catch {
    // IAP must never block gameplay.
  }
}

export function purchaseRemoveAds(): Promise<boolean> {
  return new Promise((resolve) => {
    let settled = false;

    function settle(result: boolean) {
      if (settled) {
        return;
      }
      settled = true;
      updateSubscription.remove();
      errorSubscription.remove();
      resolve(result);
    }

    const updateSubscription = purchaseUpdatedListener(async (purchase: Purchase) => {
      if (purchase.productId !== REMOVE_ADS_SKU) {
        return;
      }
      try {
        await finishTransaction({ purchase, isConsumable: false });
        settle(true);
      } catch {
        settle(false);
      }
    });

    const errorSubscription = purchaseErrorListener(() => {
      settle(false);
    });

    requestPurchase({
      request: { google: { skus: [REMOVE_ADS_SKU] } },
      type: 'in-app',
    }).catch(() => {
      settle(false);
    });
  });
}

export async function restorePurchases(): Promise<boolean> {
  try {
    const purchases = await getAvailablePurchases();
    return purchases.some((purchase) => purchase.productId === REMOVE_ADS_SKU);
  } catch {
    return false;
  }
}
```

Notes for the implementer:
- `requestPurchase()`'s resolved value is only the dispatched request, not the purchase outcome — the real result always arrives through `purchaseUpdatedListener`/`purchaseErrorListener`, which is why `purchaseRemoveAds` wraps everything in a `Promise` that only the listeners (or a `requestPurchase` rejection) can settle.
- `finishTransaction({ purchase, isConsumable: false })` is required for Android — Google auto-refunds any purchase left unfinished for 3 days, so this must run on every successful purchase and on every restore-verified purchase before granting the flag (restore here only reads state via `getAvailablePurchases`, which reflects Play Billing's own local cache and doesn't need a separate finish call).

- [ ] **Step 2: Typecheck**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add services/iap.ts
git commit -m "Wire services/iap.ts to a real Google Play remove_ads purchase"
```

---

### Task 6: Init ads + IAP at app startup

**Files:**
- Modify: `app/_layout.tsx`

**Interfaces:**
- Consumes: `initAds()` (Task 3), `initIapConnection()` (Task 5).

- [ ] **Step 1: Add the init calls to `RootLayout`**

In `app/_layout.tsx`, add the two new imports at the top:

```ts
import { initAds } from '../services/ads';
import { initIapConnection } from '../services/iap';
```

Then, inside `export default function RootLayout()`, add a second `useEffect` alongside the existing `setAudioModeAsync` one (do not merge them — audio setup and ad/IAP setup are independent and shouldn't block on each other):

```tsx
  useEffect(() => {
    initAds();
    initIapConnection();
  }, []);
```

The full effect section of `RootLayout` should now read:

```tsx
export default function RootLayout() {
  useEffect(() => {
    setAudioModeAsync({
      playsInSilentMode: true,
      interruptionMode: 'mixWithOthers',
      shouldPlayInBackground: false,
    }).catch(() => {
      // Audio mode is a nice-to-have; failure to set it must not block the app.
    });
  }, []);

  useEffect(() => {
    initAds();
    initIapConnection();
  }, []);

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

- [ ] **Step 2: Typecheck**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/_layout.tsx
git commit -m "Initialize AdMob consent/SDK and IAP connection at app startup"
```

---

### Task 7: "Restore purchases" on the result screen

**Files:**
- Modify: `app/result.tsx`
- Modify: `locales/en.json`, `locales/es.json`, `locales/pt.json`, `locales/fr.json`, `locales/de.json`

**Interfaces:**
- Consumes: `restorePurchases()` (Task 5), existing `useScore()`'s `setAdsRemoved` (unchanged).

- [ ] **Step 1: Add the `restorePurchases` translation key to every locale file**

In `locales/en.json`, inside `"ui"`, add a line after `"removeAds": "Remove ads",`:

```json
    "removeAds": "Remove ads",
    "restorePurchases": "Restore purchases",
```

In `locales/es.json`, after `"removeAds": "Quitar anuncios",`:

```json
    "removeAds": "Quitar anuncios",
    "restorePurchases": "Restaurar compras",
```

In `locales/pt.json`, after `"removeAds": "Remover anúncios",`:

```json
    "removeAds": "Remover anúncios",
    "restorePurchases": "Restaurar compras",
```

In `locales/fr.json`, after `"removeAds": "Supprimer les pubs",`:

```json
    "removeAds": "Supprimer les pubs",
    "restorePurchases": "Restaurer les achats",
```

In `locales/de.json`, after `"removeAds": "Werbung entfernen",`:

```json
    "removeAds": "Werbung entfernen",
    "restorePurchases": "Käufe wiederherstellen",
```

- [ ] **Step 2: Run the test suite**

```bash
npx jest
```

Expected: still all passing — no test reads these JSON files directly, this step just confirms the JSON edits didn't break anything else that imports the locale files.

- [ ] **Step 3: Wire the restore button in `app/result.tsx`**

Add the import:

```ts
import { purchaseRemoveAds, restorePurchases } from '../services/iap';
```

(replacing the existing `import { purchaseRemoveAds } from '../services/iap';` line).

Add a `restoring` state and `handleRestorePurchases` handler alongside the existing `purchasing` state and `handleRemoveAds`:

```tsx
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);

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

  async function handleRestorePurchases() {
    setRestoring(true);
    try {
      const owned = await restorePurchases();
      if (owned) {
        setAdsRemoved(true);
      }
    } finally {
      setRestoring(false);
    }
  }
```

Add the button in the JSX, right after the existing "Quitar anuncios" `BouncyButton`:

```tsx
      {!adsRemoved && (
        <BouncyButton
          label={purchasing ? t('purchasing') : t('removeAds')}
          onPress={handleRemoveAds}
          variant="link"
          disabled={purchasing}
        />
      )}
      {!adsRemoved && (
        <BouncyButton
          label={restoring ? t('purchasing') : t('restorePurchases')}
          onPress={handleRestorePurchases}
          variant="link"
          disabled={restoring}
        />
      )}
```

- [ ] **Step 4: Typecheck**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Run the full test suite**

```bash
npx jest
```

Expected: all 13 tests pass.

- [ ] **Step 6: Commit**

```bash
git add app/result.tsx locales/en.json locales/es.json locales/pt.json locales/fr.json locales/de.json
git commit -m "Add a Restore Purchases button to the result screen"
```

---

### Task 8: Full verification pass

**Files:** none (verification only)

**Interfaces:** none

- [ ] **Step 1: Run the full automated check suite**

```bash
npx expo-doctor
npx tsc --noEmit
npx jest
```

Expected: `expo-doctor` clean (or only pre-existing unrelated warnings), no type errors, all 13 tests passing.

- [ ] **Step 2: Build a development client and confirm it boots**

```bash
npx eas-cli build --platform android --profile development --non-interactive --no-wait
```

This is the first build since adding native modules — `expo start` (Expo Go) can no longer run this app, so this dev-client build is how the engineer/user gets an installable app to manually verify against. Report the build URL back; manual verification (ads render, interstitial respects the 1-in-3 cap, purchase flow, restore flow) is done by the user per the "External setup" checklist in the design spec, since it requires their Play Console test-track install and license-tester account — nothing further to automate here.

- [ ] **Step 3: Final commit check**

```bash
git status
git log --oneline -10
```

Expected: working tree clean, one commit per task above (7 commits total from Tasks 1–7).
