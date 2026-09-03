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
});
