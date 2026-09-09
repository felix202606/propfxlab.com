import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const FIRMS_DIR = path.join(process.cwd(), "data", "firms");
const API_KEY = process.env.TRUSTPILOT_API_KEY?.trim() ?? "";
const DELAY_MS = 600;
const USER_AGENT =
  "PropFXLab/1.0 (+https://www.propfxlab.com; trustpilot rating refresh)";

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

function parseFindPayload(payload: unknown): Snapshot | null {
  if (!payload || typeof payload !== "object") return null;
  const record = payload as Record<string, unknown>;
  const score = record.score;
  let rating: number | null = null;
  if (score && typeof score === "object") {
    const trustScore = (score as { trustScore?: unknown }).trustScore;
    if (typeof trustScore === "number" && Number.isFinite(trustScore)) {
      rating = roundRating(trustScore);
    }
  }
  const reviews = record.numberOfReviews;
  let reviewCount: number | null = null;
  if (typeof reviews === "number") {
    reviewCount = reviews;
  } else if (reviews && typeof reviews === "object") {
    const total = (reviews as { total?: unknown }).total;
    if (typeof total === "number") reviewCount = total;
  }
  if (reviewCount == null || reviewCount < 0) return null;
  return { rating, reviewCount };
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

async function fetchJson(url: string, headers: Record<string, string>) {
  const response = await fetch(url, {
    headers,
    redirect: "follow",
    signal: AbortSignal.timeout(20_000),
  });
  const text = await response.text();
  return { ok: response.ok, status: response.status, text };
}

async function fetchFromApi(domain: string): Promise<Snapshot | null> {
  if (!API_KEY) return null;
  const url = `https://api.trustpilot.com/v1/business-units/find?name=${encodeURIComponent(domain)}`;
  const { ok, text } = await fetchJson(url, {
    Accept: "application/json",
    apikey: API_KEY,
    "User-Agent": USER_AGENT,
  });
  if (!ok) return null;
  try {
    return parseFindPayload(JSON.parse(text));
  } catch {
    return null;
  }
}

async function fetchFromProfile(domain: string): Promise<Snapshot | null> {
  const url = `https://www.trustpilot.com/review/${encodeURIComponent(domain)}`;
  const { text, status } = await fetchJson(url, {
    Accept: "text/html,application/xhtml+xml",
    "Accept-Language": "en-US,en;q=0.9",
    "User-Agent": USER_AGENT,
  });
  if (status >= 400) return null;
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
    let snapshot = await fetchFromApi(domain);
    if (!snapshot) snapshot = await fetchFromProfile(domain);

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
  if (!API_KEY) {
    console.log(
      "No TRUSTPILOT_API_KEY; used public profile pages. Set the secret for the official find API.",
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
