import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const FIRMS_DIR = path.join(process.cwd(), "data", "firms");
const DELAY_MS = 600;
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

type Snapshot = {
  rating: number | null;
  reviewCount: number;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function domainFromWebsite(website: string): string {
  const host = new URL(website).hostname.toLowerCase();
  return host.replace(/^www\./, "");
}

function roundRating(value: number): number {
  return Math.round(value * 10) / 10;
}

function parseReviewPage(html: string): Snapshot | null {
  const hidden =
    /rating is unavailable due to a breach/i.test(html) ||
    /we.ve removed a number of fake reviews/i.test(html);

  let reviewCount: number | null = null;
  const countMatch =
    html.match(/"reviewCount"\s*:\s*"?([0-9,]+)"?/) ??
    html.match(/See all\s+([0-9,]+)\s+reviews/i) ??
    html.match(/#\s+[\w\s]+Reviews\s+([0-9,]+)/);
  if (countMatch) {
    reviewCount = Number(countMatch[1].replace(/,/g, ""));
  }

  if (hidden) {
    if (reviewCount == null) return { rating: null, reviewCount: 0 };
    return { rating: null, reviewCount };
  }

  let rating: number | null = null;
  const ratingMatch =
    html.match(/"ratingValue"\s*:\s*"?([0-9.]+)"?/) ??
    html.match(/"trustScore"\s*:\s*([0-9.]+)/);
  if (ratingMatch) {
    rating = roundRating(Number(ratingMatch[1]));
  }
  if (rating == null || reviewCount == null) return null;
  if (rating < 0 || rating > 5) return null;
  return { rating, reviewCount };
}

async function fetchFromProfile(domain: string): Promise<Snapshot | null> {
  const url = `https://www.trustpilot.com/review/${encodeURIComponent(domain)}`;
  const response = await fetch(url, {
    headers: {
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language": "en-US,en;q=0.9",
      "User-Agent": USER_AGENT,
    },
    redirect: "follow",
    signal: AbortSignal.timeout(20_000),
  });
  const text = await response.text();
  if (response.status >= 400) return null;
  return parseReviewPage(text);
}

function patchFirmFile(filePath: string, next: Snapshot): boolean {
  const original = readFileSync(filePath, "utf8");
  const ratingJson = next.rating == null ? "null" : String(next.rating);
  const updated = original.replace(
    /("rating"\s*:\s*)(null|[0-9.]+)(,\s*\n\s*"reviewCount"\s*:\s*)\d+/,
    `$1${ratingJson}$3${next.reviewCount}`,
  );
  if (updated === original) return false;
  writeFileSync(filePath, updated);
  return true;
}

async function main() {
  const files = readdirSync(FIRMS_DIR)
    .filter((name) => name.endsWith(".json"))
    .sort((a, b) => a.localeCompare(b, "en"));

  let updated = 0;
  let unchanged = 0;
  let failed = 0;

  for (const fileName of files) {
    const filePath = path.join(FIRMS_DIR, fileName);
    const firm = JSON.parse(readFileSync(filePath, "utf8")) as {
      slug?: string;
      rating?: number | null;
      reviewCount?: number;
      basic?: { website?: string };
    };
    const website = firm.basic?.website;
    const slug = firm.slug ?? fileName;
    if (typeof website !== "string") {
      console.error(`skip ${slug}: missing website`);
      failed += 1;
      continue;
    }

    const domain = domainFromWebsite(website);
    const snapshot = await fetchFromProfile(domain);

    if (!snapshot) {
      console.log(`keep ${slug} (${domain}): fetch failed, left previous values`);
      failed += 1;
      await sleep(DELAY_MS);
      continue;
    }

    const prevRating = firm.rating ?? null;
    const prevCount = firm.reviewCount ?? 0;
    if (prevRating === snapshot.rating && prevCount === snapshot.reviewCount) {
      console.log(`same ${slug}: ${snapshot.rating} / ${snapshot.reviewCount}`);
      unchanged += 1;
    } else if (patchFirmFile(filePath, snapshot)) {
      console.log(
        `upd  ${slug}: ${prevRating} / ${prevCount} → ${snapshot.rating} / ${snapshot.reviewCount}`,
      );
      updated += 1;
    } else {
      console.log(`keep ${slug}: values unchanged after parse`);
      unchanged += 1;
    }

    await sleep(DELAY_MS);
  }

  console.log(
    `\nTrustpilot refresh: ${updated} updated, ${unchanged} unchanged, ${failed} failed`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
