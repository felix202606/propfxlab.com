import { useTranslations } from "next-intl";
import type { ProsAndCons } from "@/lib/schema";

export function ProsConsBox({ prosAndCons }: { prosAndCons: ProsAndCons }) {
  const t = useTranslations("FirmPage");

  return (
    <section
      aria-labelledby="pros-cons-heading"
      className="rounded-2xl border border-white/10 bg-gradient-to-b from-zinc-900 to-black p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.04)]"
    >
      <h2
        id="pros-cons-heading"
        className="text-xl font-semibold tracking-tight text-zinc-50"
      >
        {t("prosConsHeading")}
      </h2>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/[0.06] p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-300">
            {t("prosHeading")}
          </p>
          <ul className="mt-3 space-y-2.5 text-sm leading-6 text-zinc-300">
            {prosAndCons.pros.map((item, index) => (
              <li key={index} className="flex gap-2">
                <span aria-hidden className="mt-0.5 shrink-0 text-emerald-400">
                  ✓
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border border-rose-400/20 bg-rose-400/[0.06] p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-rose-300">
            {t("consHeading")}
          </p>
          <ul className="mt-3 space-y-2.5 text-sm leading-6 text-zinc-300">
            {prosAndCons.cons.map((item, index) => (
              <li key={index} className="flex gap-2">
                <span aria-hidden className="mt-0.5 shrink-0 text-rose-400">
                  ✕
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
