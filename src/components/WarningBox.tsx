import { useTranslations } from "next-intl";

export function WarningBox({ warnings }: { warnings?: string[] }) {
  const t = useTranslations("FirmPage");

  return (
    <section
      aria-labelledby="warning-heading"
      className="rounded-2xl border border-amber-400/20 bg-gradient-to-b from-amber-950/50 via-zinc-950 to-black p-6 shadow-[0_0_0_1px_rgba(251,191,36,0.08)]"
    >
      <div className="flex items-center gap-2">
        <span aria-hidden className="text-lg leading-none">
          ⚠️
        </span>
        <h2
          id="warning-heading"
          className="text-xl font-semibold tracking-tight text-amber-200"
        >
          {t("warningHeading")}
        </h2>
      </div>
      <p className="mt-2 text-sm leading-6 text-amber-100/70">
        {t("warningIntro")}
      </p>

      {warnings && warnings.length > 0 ? (
        <ul className="mt-4 space-y-2.5 text-sm leading-6 text-zinc-300">
          {warnings.map((item, index) => (
            <li key={index} className="flex gap-2">
              <span aria-hidden className="mt-0.5 shrink-0 text-amber-400">
                ▲
              </span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
