import { isValidSignature, SIGNATURE_HEADER_NAME } from "@sanity/webhook";
import { revalidateTag } from "next/cache";
import { FIRM_ROSTER_TAG, FIRMS_TAG, firmTag, PLACEMENTS_TAG } from "@/lib/firms";
import { NEWS_LIST_TAG, newsArticleTag } from "@/lib/news-cms";

/**
 * Sanity webhook projection:
 * {_type, "slug": coalesce(slug, before().slug), "rosterChanged": !defined(before()) || !defined(after())
 *   || before().basic.name != after().basic.name || before().basic.logo.src != after().basic.logo.src
 *   || before().basic.logo.alt != after().basic.logo.alt}
 */
type WebhookBody = { _type?: string; slug?: string; rosterChanged?: boolean };

export async function POST(request: Request) {
  const secret = process.env.SANITY_REVALIDATE_SECRET;
  if (!secret) {
    return Response.json({ revalidated: false, message: "Not configured" }, { status: 500 });
  }

  const signature = request.headers.get(SIGNATURE_HEADER_NAME);
  const body = await request.text();
  if (!signature || !(await isValidSignature(body, signature, secret))) {
    return Response.json({ revalidated: false, message: "Invalid signature" }, { status: 401 });
  }

  let payload: WebhookBody;
  try {
    payload = JSON.parse(body) as WebhookBody;
  } catch {
    return Response.json({ revalidated: false, message: "Bad JSON" }, { status: 400 });
  }

  const tags: string[] = [];
  if (payload._type === "newsArticle") {
    tags.push(NEWS_LIST_TAG);
    if (payload.slug) tags.push(newsArticleTag(payload.slug));
  } else if (payload._type === "firm") {
    tags.push(FIRMS_TAG);
    if (payload.slug) tags.push(firmTag(payload.slug));
    // The roster feeds every page's footer; only invalidate it when it actually changed.
    if (payload.rosterChanged !== false) tags.push(FIRM_ROSTER_TAG);
  } else if (payload._type === "homepagePlacements") {
    tags.push(PLACEMENTS_TAG);
  }

  for (const tag of tags) revalidateTag(tag, "max");
  return Response.json({ revalidated: tags.length > 0, tags });
}
