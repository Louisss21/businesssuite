/**
 * Erkennt Platzhalter-/Dummy-Medien (1.5). Für solche URLs soll in der
 * Endnutzer-Montageansicht KEIN „Mehr erfahren"-Button erscheinen, sondern der
 * Schritt ohne (totes) Medium dargestellt werden.
 */
const PLACEHOLDER = [/dummy/i, /mov_bbb/i, /example\.com/i, /placeholder/i, /lorem/i, /\/sample/i];

export function isRealMedia(url?: string | null): boolean {
  if (!url || !url.trim()) return false;
  return !PLACEHOLDER.some((re) => re.test(url));
}
