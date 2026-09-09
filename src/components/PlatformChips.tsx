import { PLATFORM_LABELS, PLATFORM_ORDER } from "@/lib/platforms";
import type { TradingPlatform } from "@/lib/schema";

const ACCENT: Partial<Record<TradingPlatform, string>> = {
  mt4: "border-sky-500/30 bg-sky-500/10 text-sky-200",
  mt5: "border-indigo-500/30 bg-indigo-500/10 text-indigo-200",
  ctrader: "border-violet-500/30 bg-violet-500/10 text-violet-200",
  matchtrader: "border-violet-500/30 bg-violet-500/10 text-violet-200",
  tradelocker: "border-violet-500/30 bg-violet-500/10 text-violet-200",
  dxtrade: "border-indigo-400/25 bg-indigo-500/10 text-indigo-200",
  thinktrader: "border-indigo-400/25 bg-indigo-500/10 text-indigo-200",
  tradingview: "border-indigo-400/25 bg-indigo-500/10 text-indigo-200",
  tradovate: "border-fuchsia-500/25 bg-fuchsia-500/10 text-fuchsia-200",
  ninjatrader: "border-fuchsia-500/25 bg-fuchsia-500/10 text-fuchsia-200",
  bybit: "border-fuchsia-400/35 bg-fuchsia-500/10 text-fuchsia-100",
  kraken: "border-violet-400/40 bg-violet-500/10 text-violet-100",
  cleo: "border-fuchsia-400/35 bg-fuchsia-500/10 text-fuchsia-100",
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
    <ul className="flex flex-wrap gap-1">
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
