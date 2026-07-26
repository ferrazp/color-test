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
