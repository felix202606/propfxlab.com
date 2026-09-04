import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  // ISR / 冷启动时 serverless 函数也必须带上 firm JSON，否则 readdir 会失败。
  outputFileTracingIncludes: {
    "/*": ["./data/firms/**/*"],
  },
};

export default withNextIntl(nextConfig);
