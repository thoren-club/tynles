export function triggerLightHaptic() {
  try {
    const telegram = (window as any)?.Telegram?.WebApp;
    if (telegram?.HapticFeedback?.impactOccurred) {
      telegram.HapticFeedback.impactOccurred('light');
      return;
    }
  } catch {
    // ignore
  }

  if (navigator?.vibrate) {
    navigator.vibrate(10);
  }
}
