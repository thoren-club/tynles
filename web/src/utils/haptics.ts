const HAPTICS_KEY = 'hapticsEnabled';

export function isHapticsEnabled(): boolean {
  try {
    const raw = localStorage.getItem(HAPTICS_KEY);
    if (raw === null) return true;
    return raw === 'true';
  } catch {
    return true;
  }
}

export function setHapticsEnabled(enabled: boolean) {
  try {
    localStorage.setItem(HAPTICS_KEY, String(enabled));
  } catch {
    // ignore
  }
}

export function triggerLightHaptic() {
  if (!isHapticsEnabled()) return;
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

export function triggerMediumHaptic() {
  if (!isHapticsEnabled()) return;
  try {
    const telegram = (window as any)?.Telegram?.WebApp;
    if (telegram?.HapticFeedback?.impactOccurred) {
      telegram.HapticFeedback.impactOccurred('medium');
      return;
    }
  } catch {
    // ignore
  }

  if (navigator?.vibrate) {
    navigator.vibrate(20);
  }
}
