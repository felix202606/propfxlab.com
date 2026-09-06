import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export default function CompareNotFound() {
  const t = useTranslations("CompareNotFound");

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-16">
      <h1 className="text-2xl font-semibold">{t("title")}</h1>
      <p className="mt-2 text-sm text-zinc-500">{t("description")}</p>
      <Link
        href={{ pathname: "/", hash: "compare" }}
        className="mt-6 inline-block text-sm font-medium underline underline-offset-4"
      >
        {t("cta")}
      </Link>
    </main>
  );
}
