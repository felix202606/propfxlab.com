/**
 * Fold a URL or file slug to ASCII kebab characters.
 * NFKD decomposition + strip combining marks turns "dušek" / "aimé" into
 * "dusek" / "aime", matching scripts/news_scraper.py kebab().
 */
export function foldAsciiSlug(value: string): string {
  let raw = value.trim();
  try {
    raw = decodeURIComponent(raw);
  } catch {
    // Already decoded, or the percent-encoding is malformed.
  }
  return raw
    .normalize("NFKD")
    .replace(/\p{M}+/gu, "")
    .replace(/[^\u0000-\u007F]/g, "")
    .toLowerCase();
}

/** True when a slug still contains non-ASCII characters (before folding). */
export function slugHasNonAscii(value: string): boolean {
  let raw = value;
  try {
    raw = decodeURIComponent(value);
  } catch {
    raw = value;
  }
  return /[^\u0000-\u007F]/.test(raw);
}
