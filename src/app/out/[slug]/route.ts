import { NextResponse } from "next/server";
import { getFirmSlugs } from "@/lib/data";
import { getOutboundTarget } from "@/lib/firms";

export function generateStaticParams() {
  return getFirmSlugs().map((slug) => ({ slug }));
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;
  const target = await getOutboundTarget(slug);
  if (!target) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.redirect(target, {
    status: 302,
    headers: { "X-Robots-Tag": "noindex, nofollow" },
  });
}
