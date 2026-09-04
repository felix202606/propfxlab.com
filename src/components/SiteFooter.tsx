import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { SiteLogo } from "@/components/SiteLogo";

type FirmLink = { slug: string; name: string };

export function SiteFooter({ firms }: { firms: FirmLink[] }) {
  const t = useTranslations("SiteFooter");
  const nav = useTranslations("Nav");
  const year = new Date().getFullYear();

  return (
    <footer className="mt-24 border-t border-white/10 bg-[#09090b]">
      <div className="mx-auto w-full max-w-6xl px-4 py-14">
        <div className="flex flex-wrap items-start justify-between gap-8">
          <div className="max-w-sm">
            <Link href="/" className="flex items-center gap-2.5">
              <SiteLogo size={32} />
              <span className="bg-gradient-to-r from-zinc-50 to-emerald-300 bg-clip-text text-base font-semibold tracking-tight text-transparent">
                {nav("brand")}
              </span>
            </Link>
            <p className="mt-3 text-sm leading-6 text-zinc-500">{t("tagline")}</p>
          </div>

          <div className="grid min-w-[16rem] flex-1 grid-cols-2 gap-8 sm:grid-cols-3">
            <div>
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                {t("sitemapExplore")}
              </h3>
              <ul className="mt-3 space-y-2 text-sm">
                <li>
                  <Link
                    href="/"
                    className="text-zinc-400 transition-colors hover:text-emerald-300"
                  >
                    {t("sitemapHome")}
                  </Link>
                </li>
                <li>
                  <Link
                    href="/calculator"
                    className="text-zinc-400 transition-colors hover:text-emerald-300"
                  >
                    {nav("calculator")}
                  </Link>
                </li>
                <li>
                  <Link
                    href={{ pathname: "/", hash: "rankings" }}
                    className="text-zinc-400 transition-colors hover:text-emerald-300"
                  >
                    {nav("rankings")}
                  </Link>
                </li>
                <li>
                  <Link
                    href={{ pathname: "/", hash: "compare" }}
                    className="text-zinc-400 transition-colors hover:text-emerald-300"
                  >
                    {nav("compare")}
                  </Link>
                </li>
                <li>
                  <Link
                    href={{ pathname: "/", hash: "faq" }}
                    className="text-zinc-400 transition-colors hover:text-emerald-300"
                  >
                    {nav("faq")}
                  </Link>
                </li>
              </ul>
            </div>

            <div className="col-span-1 sm:col-span-2">
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                {t("sitemapFirms")}
              </h3>
              <ul className="mt-3 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                {firms.map((firm) => (
                  <li key={firm.slug}>
                    <Link
                      href={`/firm/${firm.slug}`}
                      className="text-zinc-400 transition-colors hover:text-emerald-300"
                    >
                      {firm.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-12 grid gap-6 rounded-2xl border border-white/10 bg-white/[0.02] p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.03)] sm:grid-cols-3">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
              {t("financialDisclaimerTitle")}
            </h3>
            <p className="mt-2 text-xs leading-5 text-zinc-500">
              {t("financialDisclaimerBody")}
            </p>
          </div>
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
              {t("affiliateDisclosureTitle")}
            </h3>
            <p className="mt-2 text-xs leading-5 text-zinc-500">
              {t("affiliateDisclosureBody")}
            </p>
          </div>
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
              {t("trademarkNoticeTitle")}
            </h3>
            <p className="mt-2 text-xs leading-5 text-zinc-500">
              {t("trademarkNoticeBody")}
            </p>
          </div>
        </div>

        <p className="mt-8 border-t border-white/10 pt-6 text-xs text-zinc-600">
          {t("copyright", { year })}
        </p>
      </div>
    </footer>
  );
}
