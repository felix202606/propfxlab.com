"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import { SiteLogo } from "@/components/SiteLogo";

type NavItem = {
  key: "rankings" | "compare" | "faq" | "about" | "dataAuditLog" | "news" | "calculator" | "defunct";
  href: string | { pathname: "/"; hash: string };
  match: (pathname: string) => boolean;
  tone?: "default" | "warning";
};

const NAV_ITEMS: NavItem[] = [
  {
    key: "rankings",
    href: { pathname: "/", hash: "rankings" },
    match: (pathname) => pathname === "/",
  },
  {
    key: "compare",
    href: "/compare",
    match: (pathname) => pathname === "/compare" || pathname.startsWith("/compare/"),
  },
  {
    key: "faq",
    href: "/faq",
    match: (pathname) => pathname === "/faq" || pathname.startsWith("/faq/"),
  },
  {
    key: "about",
    href: "/about",
    match: (pathname) => pathname === "/about",
  },
  {
    key: "dataAuditLog",
    href: "/data-audit-log",
    match: (pathname) => pathname === "/data-audit-log",
  },
  {
    key: "news",
    href: "/news",
    match: (pathname) => pathname === "/news" || pathname.startsWith("/news/"),
  },
  {
    key: "calculator",
    href: "/calculator",
    match: (pathname) => pathname === "/calculator",
  },
  {
    key: "defunct",
    href: "/defunct",
    match: (pathname) => pathname === "/defunct",
    tone: "warning",
  },
];

export function SiteHeader() {
  const t = useTranslations("Nav");
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-slate-800 bg-[#0B0F19]/80 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center justify-between gap-3">
          <Link href="/" className="flex min-w-0 items-center gap-2.5">
            <SiteLogo size={32} priority />
            <span className="truncate bg-gradient-to-r from-slate-50 via-white to-indigo-300 bg-clip-text text-base font-semibold tracking-tight text-transparent">
              {t("brand")}
            </span>
          </Link>
          <div className="shrink-0 sm:hidden">
            <LocaleSwitcher />
          </div>
        </div>

        <nav className="-mx-1 overflow-x-auto px-1 [scrollbar-width:none] sm:mx-0 sm:overflow-visible sm:px-0 [&::-webkit-scrollbar]:hidden">
          <div className="flex w-max items-center gap-0.5 rounded-2xl border border-slate-800 bg-slate-950/70 p-1 sm:w-auto">
            {NAV_ITEMS.map((item) => {
              const active = item.match(pathname);
              const warning = item.tone === "warning";
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`whitespace-nowrap rounded-xl px-3 py-1.5 text-sm font-medium tracking-tight transition-all ${
                    active
                      ? warning
                        ? "bg-amber-400/15 text-amber-100 ring-1 ring-amber-400/35"
                        : "bg-indigo-500/20 text-indigo-100 shadow-[0_0_20px_-8px_rgba(99,102,241,0.9)] ring-1 ring-indigo-400/40"
                      : warning
                        ? "text-amber-400/80 hover:bg-amber-400/10 hover:text-amber-200"
                        : "text-slate-400 hover:bg-indigo-500/10 hover:text-slate-50"
                  }`}
                >
                  {t(item.key)}
                </Link>
              );
            })}
          </div>
        </nav>

        <div className="hidden sm:block">
          <LocaleSwitcher />
        </div>
      </div>
    </header>
  );
}
