export type AppPlatform = 'ios' | 'android' | 'desktop';

function isProbablyIOS(ua: string) {
  return /iPad|iPhone|iPod/i.test(ua);
}

function isProbablyAndroid(ua: string) {
  return /Android/i.test(ua);
}

/**
 * Best-effort platform detection.
 *
 * - Prefer Telegram WebApp platform if available.
 * - Fallback to userAgent heuristics.
 */
export function detectPlatform(): AppPlatform {
  const tgPlatform = (window as any)?.Telegram?.WebApp?.platform as string | undefined;
  if (tgPlatform) {
    const p = tgPlatform.toLowerCase();
    if (p.includes('ios')) return 'ios';
    if (p.includes('android')) return 'android';
    // tdesktop, web, macos, windows, etc
    return 'desktop';
  }

  const ua = navigator.userAgent || '';
  if (isProbablyIOS(ua)) return 'ios';
  if (isProbablyAndroid(ua)) return 'android';
  return 'desktop';
}

