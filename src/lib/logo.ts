/**
 * 平台名称 → 两字母缩写。
 * "Apex Trader Funding" → "AT"；单词品牌按常见词根拆（Topstep → "TS"）。
 */
const COMPOUND_SUFFIXES = [
  "step",
  "funded",
  "next",
  "pips",
  "ify",
  "fx",
  "pro",
  "traders",
  "trade",
  "funding",
];

export function firmInitials(name: string): string {
  const tokens = name
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .split(/[\s\-_/]+/)
    .filter((part) => part.length > 0 && !/^(the|of|and|&)$/i.test(part));

  if (tokens.length >= 2) {
    return `${tokens[0]![0]}${tokens[1]![0]}`.toUpperCase();
  }

  const word = tokens[0] ?? name.trim();
  if (word.length >= 2 && word === word.toUpperCase()) {
    return word.slice(0, 2);
  }
  const lower = word.toLowerCase();
  for (const suffix of COMPOUND_SUFFIXES) {
    if (lower.endsWith(suffix) && lower.length > suffix.length + 1) {
      return `${word[0]}${suffix[0]}`.toUpperCase();
    }
  }

  return (word.slice(0, 2) || "?").toUpperCase();
}
