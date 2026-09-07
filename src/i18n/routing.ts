import { defineRouting } from "next-intl/routing";

/**
 * 网站支持的语言。key 是 next-intl 的 locale（也是 URL 前缀，例如 /es/...），
 * value 是给 <html lang> 用的标准 BCP-47 标签和导航栏切换器显示的本地化名称。
 */
export const localeMeta = {
  en: { bcp47: "en", label: "English" },
  es: { bcp47: "es", label: "Español" },
  cn: { bcp47: "zh-CN", label: "简体中文" },
  tw: { bcp47: "zh-TW", label: "繁體中文" },
  th: { bcp47: "th", label: "ไทย" },
  vi: { bcp47: "vi", label: "Tiếng Việt" },
  pt: { bcp47: "pt", label: "Português" },
} as const;

export const routing = defineRouting({
  locales: Object.keys(localeMeta) as (keyof typeof localeMeta)[],
  defaultLocale: "en",
  // GSC 把 https://www.propfxlab.com/ 当作首页；always 前缀会 307 到 /en。
  // as-needed 让裸路径直接 200 渲染默认语言，避免爬虫把中间层异常记成 5xx。
  localePrefix: "as-needed",
  // 爬虫同一会话会先抓 /cn/... 再抓裸路径。NEXT_LOCALE cookie / Accept-Language
  // 会把 /calculator 307 到 /cn/calculator，GSC 记成「网页会自动重定向」不收录。
  // 语言只认 URL，切换器走显式 locale，不再靠 cookie。
  localeDetection: false,
  localeCookie: false,
  // 中间件 Link 头会把 hreflang 写成 cn/tw；sitemap 已用 zh-CN/zh-TW。
  alternateLinks: false,
});
