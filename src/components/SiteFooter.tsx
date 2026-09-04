import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export function SiteFooter() {
  const t = useTranslations("SiteFooter");
  const nav = useTranslations("Nav");
  const year = new Date().getFullYear();

  return (
    <footer className="mt-16 border-t border-zinc-200 bg-white dark:border-zinc-800 dark:bg-black">
      <div className="mx-auto w-full max-w-5xl px-4 py-10">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <Link
            href="/"
            className="font-semibold tracking-tight text-zinc-900 dark:text-zinc-50"
          >
            {nav("brand")}
          </Link>
          <p className="max-w-md text-xs text-zinc-500">{t("tagline")}</p>
        </div>

        <div className="mt-8 grid gap-6 sm:grid-cols-3">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              {t("financialDisclaimerTitle")}
            </h3>
            <p className="mt-2 text-xs leading-5 text-zinc-500">
              {t("financialDisclaimerBody")}
            </p>
          </div>
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              {t("affiliateDisclosureTitle")}
            </h3>
            <p className="mt-2 text-xs leading-5 text-zinc-500">
              {t("affiliateDisclosureBody")}
            </p>
          </div>
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              {t("trademarkNoticeTitle")}
            </h3>
            <p className="mt-2 text-xs leading-5 text-zinc-500">
              {t("trademarkNoticeBody")}
            </p>
          </div>
        </div>

        <p className="mt-8 border-t border-zinc-200 pt-6 text-xs text-zinc-400 dark:border-zinc-800">
          {t("copyright", { year })}
        </p>
      </div>
    </footer>
  );
}
