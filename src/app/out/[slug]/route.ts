import { NextResponse } from "next/server";
import { getFirmBySlug, getFirmSlugs } from "@/lib/data";
import { getFirmOffer } from "@/lib/offers";

export function generateStaticParams() {
  return getFirmSlugs().map((slug) => ({ slug }));
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;
  const firm = getFirmBySlug(slug);
  if (!firm) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const offer = getFirmOffer(firm.slug, firm.basic.website);
  return NextResponse.redirect(offer.href, {
    status: 302,
    headers: { "X-Robots-Tag": "noindex, nofollow" },
  });
}
