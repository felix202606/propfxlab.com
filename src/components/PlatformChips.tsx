import { PLATFORM_LABELS, PLATFORM_ORDER } from "@/lib/platforms";
import type { TradingPlatform } from "@/lib/schema";

const ACCENT: Partial<Record<TradingPlatform, string>> = {
  mt4: "border-sky-500/30 bg-sky-500/10 text-sky-200",
  mt5: "border-blue-500/30 bg-blue-500/10 text-blue-200",
  ctrader: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
  tradovate: "border-amber-500/30 bg-amber-500/10 text-amber-200",
  ninjatrader: "border-orange-500/30 bg-orange-500/10 text-orange-200",
};

export function PlatformChips({
  platforms,
  limit = 4,
}: {
  platforms: TradingPlatform[];
  limit?: number;
}) {
  const ordered = [...platforms].sort(
    (a, b) => PLATFORM_ORDER.indexOf(a) - PLATFORM_ORDER.indexOf(b),
  );
  const visible = ordered.slice(0, limit);
  const extra = ordered.length - visible.length;

  return (
    <ul className="flex flex-wrap gap-1.5">
      {visible.map((platform) => (
        <li
          key={platform}
          className={`rounded-md border px-1.5 py-0.5 font-mono text-[11px] font-semibold tracking-wide ${
            ACCENT[platform] ?? "border-slate-700 bg-slate-800/80 text-slate-300"
          }`}
        >
          {PLATFORM_LABELS[platform]}
        </li>
      ))}
      {extra > 0 ? (
        <li className="rounded-md border border-slate-700 bg-slate-800/80 px-1.5 py-0.5 font-mono text-[11px] text-slate-500">
          +{extra}
        </li>
      ) : null}
    </ul>
  );
}
