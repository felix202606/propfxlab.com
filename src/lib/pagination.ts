export function parsePageParam(raw: string | string[] | undefined, fallback = 1): number {
  const value = Array.isArray(raw) ? raw[0] : raw;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) return fallback;
  return parsed;
}

export function clampPage(page: number, totalPages: number): number {
  if (totalPages < 1) return 1;
  return Math.min(Math.max(page, 1), totalPages);
}

/** Compact page list: 1 … 4 5 6 … 12 */
export function visiblePageItems(
  current: number,
  totalPages: number,
): Array<number | "ellipsis"> {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const items: Array<number | "ellipsis"> = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(totalPages - 1, current + 1);

  if (start > 2) items.push("ellipsis");
  for (let page = start; page <= end; page += 1) {
    items.push(page);
  }
  if (end < totalPages - 1) items.push("ellipsis");
  items.push(totalPages);
  return items;
}
