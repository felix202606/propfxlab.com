import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";

type FirmLink = { slug: string; name: string };

export function SiteHeader({ firms }: { firms: FirmLink[] }) {
  const t = useTranslations("Nav");

  return (
    <header className="border-b border-zinc-200 bg-white/80 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/80">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="font-semibold tracking-tight">
          {t("brand")}
        </Link>
        <nav className="flex flex-wrap items-center gap-3 text-sm">
          <Link
            href="/calculator"
            className="text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-50"
          >
            {t("calculator")}
          </Link>
          {firms.map((firm) => (
            <Link
              key={firm.slug}
              href={`/firm/${firm.slug}`}
              className="text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-50"
            >
              {firm.name}
            </Link>
          ))}
          <LocaleSwitcher />
        </nav>
      </div>
    </header>
  );
}
