import type { Metadata } from "next";
import {
  pageAlternates,
  pageOpenGraph,
  pageTwitter,
} from "@/lib/seo";
import { getTranslations } from "next-intl/server";
import { DefunctFirmCard } from "@/components/DefunctFirmCard";
import { SaferAlternatives } from "@/components/SaferAlternatives";
import { getAllDefunctFirms } from "@/lib/data";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/defunct">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "DefunctPage" });
  const title = t("metaTitle");
  const description = t("metaDescription");
  return {
    title,
    description,
    alternates: pageAlternates(locale, "/defunct"),
    openGraph: pageOpenGraph({
      locale,
      pathname: "/defunct",
      title,
      description,
    }),
    twitter: pageTwitter({ title, description }),
  };
}

export default async function DefunctPage({
  params,
}: PageProps<"/[locale]/defunct">) {
  const { locale } = await params;
  const t = await getTranslations("DefunctPage");
  const firms = getAllDefunctFirms();

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10">
      <div className="rounded-2xl border border-amber-400/25 bg-gradient-to-b from-amber-950/40 via-zinc-950 to-black p-6 shadow-[0_0_0_1px_rgba(251,191,36,0.1)] sm:p-8">
        <h1 className="flex items-center gap-2.5 text-2xl font-semibold tracking-tight text-balance text-amber-100 sm:text-3xl">
          <span aria-hidden className="text-2xl leading-none sm:text-3xl">
            ⚠️
          </span>
          {t("title")}
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-amber-100/70 sm:text-base">
          {t("subtitle")}
        </p>
      </div>

      <div className="mt-6">
        <SaferAlternatives variant="banner" />
      </div>

      {firms.length === 0 ? (
        <p className="mt-10 rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-8 text-sm text-zinc-500">
          {t("empty")}
        </p>
      ) : (
        <>
          <p className="mt-10 text-xs font-medium uppercase tracking-wide text-zinc-500">
            {t("countLabel", { count: firms.length })}
          </p>
          <ul className="mt-4 grid gap-4 sm:grid-cols-2">
            {firms.map((firm) => (
              <li key={firm.slug}>
                <DefunctFirmCard firm={firm} locale={locale} />
              </li>
            ))}
          </ul>
        </>
      )}

      <p className="mt-10 text-xs leading-5 text-zinc-600">{t("disclaimer")}</p>
    </main>
  );
}
