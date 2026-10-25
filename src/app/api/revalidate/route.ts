import { isValidSignature, SIGNATURE_HEADER_NAME } from "@sanity/webhook";
import { revalidateTag } from "next/cache";
import { NEWS_LIST_TAG, newsArticleTag } from "@/lib/news-cms";

/** Sanity webhook projection: `{_type, "slug": coalesce(slug, before().slug)}` */
type WebhookBody = { _type?: string; slug?: string };

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
  }

  for (const tag of tags) revalidateTag(tag, "max");
  return Response.json({ revalidated: tags.length > 0, tags });
}
