const SITE = "https://www.propfxlab.com";

/** Explicit sitemap index — Next generateSitemaps serves shards at /sitemap/[id].xml but
 *  does not always emit /sitemap.xml when ids are strings, and [locale] was 404ing the root. */
const SHARDS = ["static", "firms", "compare", "news"] as const;

export function GET() {
  const body = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...SHARDS.map(
      (id) =>
        `  <sitemap>\n    <loc>${SITE}/sitemap/${id}.xml</loc>\n  </sitemap>`,
    ),
    "</sitemapindex>",
    "",
  ].join("\n");

  return new Response(body, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=0, must-revalidate",
    },
  });
}
