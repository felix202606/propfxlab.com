import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { FirmCard } from "@/components/FirmCard";
import { getAllFirms } from "@/lib/data";

export default async function Home() {
  const t = await getTranslations("HomePage");
  const firms = getAllFirms();

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10">
      <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600 dark:text-zinc-400">
        {t("subtitle")}
      </p>
      <ul className="mt-8 grid gap-4 sm:grid-cols-2">
        {firms.map((firm) => (
          <li key={firm.slug}>
            <FirmCard firm={firm} />
          </li>
        ))}
      </ul>
      <p className="mt-8">
        <Link
          href="/calculator"
          className="text-sm font-medium underline underline-offset-4"
        >
          {t("openCalculator")}
        </Link>
      </p>
    </main>
  );
}
