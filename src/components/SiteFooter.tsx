import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { SiteLogo } from "@/components/SiteLogo";

type FirmLink = { slug: string; name: string };

const EXPLORE_LINKS = [
  { href: "/", label: "sitemapHome" as const },
  { href: { pathname: "/", hash: "rankings" } as const, label: "rankings" as const },
  { href: "/compare", label: "compare" as const },
  { href: "/faq", label: "faq" as const },
  { href: "/news", label: "news" as const },
  { href: "/calculator", label: "calculator" as const },
] as const;

const DISCLAIMERS = [
  {
    title: "financialDisclaimerTitle",
    body: "financialDisclaimerBody",
    accent: "border-l-indigo-400",
    glow: "from-indigo-500/20",
  },
  {
    title: "affiliateDisclosureTitle",
    body: "affiliateDisclosureBody",
    accent: "border-l-violet-400",
    glow: "from-violet-500/20",
  },
  {
    title: "trademarkNoticeTitle",
    body: "trademarkNoticeBody",
    accent: "border-l-fuchsia-400",
    glow: "from-fuchsia-500/15",
  },
] as const;

export function SiteFooter({ firms }: { firms: FirmLink[] }) {
  const t = useTranslations("SiteFooter");
  const nav = useTranslations("Nav");
  const year = new Date().getFullYear();
  const sortedFirms = [...firms].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <footer className="border-t border-slate-800 bg-[#0B0F19]">
      <div className="mx-auto w-full max-w-6xl px-4 py-14">
        <div className="relative overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-b from-[#12182a] to-[#0B0F19] p-6 sm:p-8">
          <div className="pointer-events-none absolute -top-24 right-0 h-48 w-48 bg-gradient-to-b from-indigo-500/20 to-transparent blur-3xl" />

          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-lg">
              <Link href="/" className="inline-flex items-center gap-2.5">
                <SiteLogo size={36} />
                <span className="bg-gradient-to-r from-slate-50 via-white to-indigo-300 bg-clip-text text-lg font-semibold tracking-tight text-transparent">
                  {nav("brand")}
                </span>
              </Link>
              <p className="mt-3 text-sm leading-6 text-slate-400">{t("tagline")}</p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href={{ pathname: "/", hash: "rankings" }}
                className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_0_18px_-6px_rgba(139,92,246,0.9)] transition-all hover:brightness-110"
              >
                {nav("rankings")}
              </Link>
              <Link
                href="/compare"
                className="inline-flex items-center justify-center rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-2.5 text-sm font-semibold text-slate-200 transition-colors hover:border-indigo-400/40 hover:text-white"
              >
                {nav("compare")}
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-10">
          <h3 className="flex items-center gap-2 text-sm font-semibold tracking-tight text-slate-100">
            <span className="h-4 w-1 rounded-full bg-indigo-400" aria-hidden />
            {t("sitemapExplore")}
          </h3>
          <ul className="mt-4 flex flex-wrap gap-2">
            {EXPLORE_LINKS.map((item) => (
              <li key={item.label}>
                <Link
                  href={item.href}
                  className="inline-flex rounded-full border border-slate-800 bg-slate-950/70 px-3.5 py-1.5 text-sm font-medium text-slate-300 transition-all hover:border-indigo-400/40 hover:bg-indigo-500/10 hover:text-white"
                >
                  {item.label === "sitemapHome" ? t("sitemapHome") : nav(item.label)}
                </Link>
              </li>
            ))}
            <li>
              <Link
                href="/defunct"
                className="inline-flex rounded-full border border-amber-400/25 bg-amber-400/10 px-3.5 py-1.5 text-sm font-medium text-amber-200 transition-all hover:border-amber-400/45 hover:bg-amber-400/15"
              >
                {nav("defunct")}
              </Link>
            </li>
          </ul>
        </div>

        {sortedFirms.length > 0 ? (
          <div className="mt-10">
            <h3 className="flex items-center gap-2 text-sm font-semibold tracking-tight text-slate-100">
              <span className="h-4 w-1 rounded-full bg-violet-400" aria-hidden />
              {t("sitemapFirms")}
            </h3>
            <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2.5 sm:grid-cols-3 lg:grid-cols-4">
              {sortedFirms.map((firm) => (
                <li key={firm.slug}>
                  <Link
                    href={`/firm/${firm.slug}`}
                    className="block truncate text-sm font-medium text-slate-300 transition-colors hover:text-indigo-300"
                  >
                    {firm.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="mt-12 grid gap-4 sm:grid-cols-3">
          {DISCLAIMERS.map((item) => (
            <div
              key={item.title}
              className={`relative overflow-hidden rounded-2xl border border-slate-800 border-l-2 bg-gradient-to-b from-[#12182a] to-[#0B0F19] p-5 ${item.accent}`}
            >
              <div
                className={`pointer-events-none absolute -top-10 right-0 h-24 w-24 bg-gradient-to-b ${item.glow} to-transparent blur-2xl`}
              />
              <h3 className="relative text-sm font-semibold tracking-tight text-slate-100">
                {t(item.title)}
              </h3>
              <p className="relative mt-2 text-sm leading-6 text-slate-400">
                {t(item.body)}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-6">
          <p className="text-sm leading-6 text-slate-400">
            {t("copyright", { year })}
          </p>
          <p className="text-sm leading-6 text-slate-400">
            Media &amp; advertising:{" "}
            <a
              href="mailto:contact@propfxlab.com"
              className="font-medium text-slate-200 underline-offset-2 transition-colors hover:text-indigo-300 hover:underline"
            >
              contact@propfxlab.com
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
