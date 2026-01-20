export function emitLevelUp(level: number) {
  if (!level || level <= 0) return;
  window.dispatchEvent(new CustomEvent('level-up', { detail: { level } }));
}
