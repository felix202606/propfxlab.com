import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { POPULAR_COMPARISONS } from "@/lib/offers";
import type { PropFirm } from "@/lib/schema";

export function ComparisonsGrid({ firms }: { firms: PropFirm[] }) {
  const t = useTranslations("HomePage");
  const bySlug = new Map(firms.map((firm) => [firm.slug, firm]));

  const pairs = POPULAR_COMPARISONS.flatMap(([leftSlug, rightSlug]) => {
    const left = bySlug.get(leftSlug);
    const right = bySlug.get(rightSlug);
    if (!left || !right) return [];
    return [{ left, right }];
  });

  if (pairs.length === 0) {
    return (
      <section id="compare" className="mx-auto w-full max-w-6xl scroll-mt-24 px-4 py-16">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          <span className="bg-gradient-to-r from-white to-cyan-300 bg-clip-text text-transparent">
            {t("comparisonsTitle")}
          </span>
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
          {t("comparisonsSubtitle")}
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((slot) => (
            <div
              key={slot}
              className="h-36 animate-pulse rounded-2xl border border-white/10 bg-white/[0.03]"
            />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section id="compare" className="mx-auto w-full max-w-6xl scroll-mt-24 px-4 py-16">
      <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
        <span className="bg-gradient-to-r from-white to-cyan-300 bg-clip-text text-transparent">
          {t("comparisonsTitle")}
        </span>
      </h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
        {t("comparisonsSubtitle")}
      </p>

      <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {pairs.map(({ left, right }) => (
          <li key={`${left.slug}-vs-${right.slug}`}>
            <div className="flex h-full flex-col rounded-2xl border border-white/10 bg-gradient-to-b from-zinc-900 to-black p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.04)] transition-all duration-300 hover:border-cyan-400/25 hover:shadow-[0_0_28px_-10px_rgba(34,211,238,0.35)]">
              <div className="flex items-center justify-between gap-3">
                <FirmMini firm={left} />
                <span className="shrink-0 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 font-mono text-[10px] tracking-widest text-zinc-500">
                  {t("vs")}
                </span>
                <FirmMini firm={right} align="right" />
              </div>
              <p className="mt-4 text-sm font-medium text-zinc-200">
                {left.basic.name} {t("vs")} {right.basic.name}
              </p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <Link
                  href={`/firm/${left.slug}`}
                  className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-center text-xs font-medium text-zinc-300 transition-colors hover:border-emerald-400/30 hover:text-white"
                >
                  {left.basic.name}
                </Link>
                <Link
                  href={`/firm/${right.slug}`}
                  className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-center text-xs font-medium text-zinc-300 transition-colors hover:border-emerald-400/30 hover:text-white"
                >
                  {right.basic.name}
                </Link>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function FirmMini({
  firm,
  align = "left",
}: {
  firm: PropFirm;
  align?: "left" | "right";
}) {
  return (
    <div
      className={`flex min-w-0 items-center gap-2 ${align === "right" ? "flex-row-reverse text-right" : ""}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={firm.basic.logo.src}
        alt={firm.basic.logo.alt}
        width={28}
        height={28}
        className="h-8 w-8 shrink-0 rounded-lg border border-white/10 bg-white object-contain p-0.5"
      />
      <span className="truncate text-xs font-medium text-zinc-300">
        {firm.basic.name}
      </span>
    </div>
  );
}
