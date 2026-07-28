// TODO: replace with react-native-iap and a real "remove_ads" managed product.
export function purchaseRemoveAds(): Promise<boolean> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(true), 800);
  });
}
