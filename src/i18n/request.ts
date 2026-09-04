import { getRequestConfig } from "next-intl/server";
import { hasLocale } from "next-intl";
import { routing } from "./routing";

export default getRequestConfig(async ({ locale }) => {
  if (!locale) {
    try {
      const rootParams = await import("next/root-params");
      const paramValue = await rootParams.locale();
      if (hasLocale(routing.locales, paramValue)) {
        locale = paramValue;
      }
    } catch (err) {
      console.error("[i18n] locale resolution failed, falling back:", err);
    }
  }

  if (!hasLocale(routing.locales, locale)) {
    locale = routing.defaultLocale;
  }

  try {
    return {
      locale,
      messages: (await import(`../../messages/${locale}.json`)).default,
    };
  } catch (err) {
    console.error("[i18n] Failed to load messages for", locale, err);
    return {
      locale: routing.defaultLocale,
      messages: (await import(`../../messages/${routing.defaultLocale}.json`))
        .default,
    };
  }
});
