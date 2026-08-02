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
