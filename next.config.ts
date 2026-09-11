import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  // ISR / 按需静态化时 serverless 函数必须带上 JSON，否则 readdir 会失败。
  outputFileTracingIncludes: {
    "/*": [
      "./data/firms/**/*.json",
      "./data/firms.json",
      "./data/news/**/*.json",
      "./data/closed_firms.json",
      "./data/faqs.json",
    ],
  },
  outputFileTracingExcludes: {
    "/*": [
      "./data/_firms_backup/**/*",
      "./data/telegram_queue.json",
      "./scripts/**/*",
    ],
  },
  async rewrites() {
    return [
      {
        source: "/sitemap.xml",
        destination: "/api/sitemap-index",
      },
    ];
  },
    async redirects() {
    return [
      {
        source: "/firm/myfundedfx",
        destination: "/",
        permanent: true,
      },
      {
        source: "/:locale(en|es|cn|tw|th|vi|pt)/firm/myfundedfx",
        destination: "/:locale",
        permanent: true,
      },
      // Legacy FAQ schema paths used /firms/...; live routes are /firm/...
      {
        source: "/firms/:path*",
        destination: "/firm/:path*",
        permanent: true,
      },
      {
        source: "/:locale(en|es|cn|tw|th|vi|pt)/firms/:path*",
        destination: "/:locale/firm/:path*",
        permanent: true,
      },
    ];
  },
  // Logo 来自各平台官网（多为 favicon.ico）；unoptimized 跳过优化器，
  // remotePatterns 仍需放行外链，否则 next/image 会在渲染期直接拒掉。
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
};

export default withNextIntl(nextConfig);
