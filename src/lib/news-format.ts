import { localeMeta } from "@/i18n/routing";

/** 固定按 GMT+12（与站点运营时区一致）展示新闻发布时间 */
export const NEWS_DISPLAY_TIME_ZONE = "Etc/GMT-12";

export function formatNewsPublished(iso: string, locale: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const bcp47 =
    locale in localeMeta ? localeMeta[locale as keyof typeof localeMeta].bcp47 : locale;
  const formatted = new Intl.DateTimeFormat(bcp47, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: NEWS_DISPLAY_TIME_ZONE,
  }).format(date);
  return `${formatted} GMT+12`;
}

export function newsArticleAbsoluteUrl(locale: string, slug: string): string {
  const path = locale === "en" ? `/news/${slug}` : `/${locale}/news/${slug}`;
  return `https://www.propfxlab.com${path}`;
}
