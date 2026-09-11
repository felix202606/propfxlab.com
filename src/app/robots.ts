import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/out/"],
    },
    sitemap: [
      "https://www.propfxlab.com/sitemap.xml",
      "https://www.propfxlab.com/sitemap/static.xml",
      "https://www.propfxlab.com/sitemap/firms.xml",
      "https://www.propfxlab.com/sitemap/compare.xml",
      "https://www.propfxlab.com/sitemap/news.xml",
    ],
    host: "https://www.propfxlab.com",
  };
}
