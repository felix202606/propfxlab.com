import "server-only";

const PROJECT_ID = "7am7u5md";
const DATASET = "production";
const API_VERSION = "2025-02-19";

/**
 * GROQ query against the private dataset. Cached until a Sanity webhook
 * calls revalidateTag for one of `tags`. Returns null when the token is
 * missing or the API fails, so callers fall back to the JSON in data/.
 */
export async function sanityQuery<T>(
  query: string,
  params: Record<string, string>,
  tags: string[],
): Promise<T | null> {
  const token = process.env.SANITY_READ_TOKEN;
  if (!token) return null;

  const url = new URL(
    `https://${PROJECT_ID}.api.sanity.io/v${API_VERSION}/data/query/${DATASET}`,
  );
  url.searchParams.set("query", query);
  for (const [name, value] of Object.entries(params)) {
    url.searchParams.set(`$${name}`, JSON.stringify(value));
  }

  try {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "force-cache",
      next: { tags },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) {
      console.error("[sanity] query failed", response.status, tags.join(","));
      return null;
    }
    const payload = (await response.json()) as { result?: T };
    return payload.result ?? null;
  } catch (error) {
    console.error("[sanity] query error", tags.join(","), error);
    return null;
  }
}
