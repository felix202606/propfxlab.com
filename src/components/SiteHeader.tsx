import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";

const navLinkClass =
  "whitespace-nowrap rounded-lg px-3 py-1.5 text-zinc-400 transition-colors hover:bg-white/5 hover:text-zinc-50";

export function SiteHeader() {
  const t = useTranslations("Nav");

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#09090b]/80 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-400 to-cyan-500 text-[11px] font-bold text-zinc-950 shadow-[0_0_20px_-4px_rgba(52,211,153,0.8)]">
              FX
            </span>
            <span className="bg-gradient-to-r from-zinc-50 via-white to-emerald-300 bg-clip-text text-base font-semibold tracking-tight text-transparent">
              {t("brand")}
            </span>
          </Link>
          <div className="sm:hidden">
            <LocaleSwitcher />
          </div>
        </div>

        <nav className="-mx-1 flex items-center gap-1 overflow-x-auto text-sm">
          <Link href={{ pathname: "/", hash: "rankings" }} className={navLinkClass}>
            {t("rankings")}
          </Link>
          <Link href={{ pathname: "/", hash: "compare" }} className={navLinkClass}>
            {t("compare")}
          </Link>
          <Link href={{ pathname: "/", hash: "faq" }} className={navLinkClass}>
            {t("faq")}
          </Link>
          <Link href="/calculator" className={navLinkClass}>
            {t("calculator")}
          </Link>
        </nav>

        <div className="hidden sm:block">
          <LocaleSwitcher />
        </div>
      </div>
    </header>
  );
}
