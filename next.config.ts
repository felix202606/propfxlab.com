import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  // ISR / 冷启动时 serverless 函数也必须带上 firm JSON，否则 readdir 会失败。
  outputFileTracingIncludes: {
    "/*": ["./data/firms/**/*"],
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
