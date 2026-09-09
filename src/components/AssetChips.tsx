import { ASSET_LABELS, ASSET_ORDER } from "@/lib/assets";
import type { FirmAsset } from "@/lib/schema";

const ACCENT: Record<FirmAsset, string> = {
  fx: "border-indigo-500/30 bg-indigo-500/10 text-indigo-200",
  futures: "border-violet-500/30 bg-violet-500/10 text-violet-200",
  crypto: "border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-200",
  indices: "border-sky-500/30 bg-sky-500/10 text-sky-200",
  metals: "border-slate-700 bg-slate-800/80 text-slate-300",
  energy: "border-slate-700 bg-slate-800/80 text-slate-300",
};

export function AssetChips({
  assets,
  limit = 4,
}: {
  assets: FirmAsset[];
  limit?: number;
}) {
  const ordered = [...assets].sort(
    (a, b) => ASSET_ORDER.indexOf(a) - ASSET_ORDER.indexOf(b),
  );
  const visible = ordered.slice(0, limit);
  const extra = ordered.length - visible.length;

  return (
    <ul className="flex flex-wrap gap-1">
      {visible.map((asset) => (
        <li
          key={asset}
          className={`rounded-md border px-2 py-0.5 text-[11px] font-medium tracking-wide ${ACCENT[asset]}`}
        >
          {ASSET_LABELS[asset]}
        </li>
      ))}
      {extra > 0 ? (
        <li className="rounded-md border border-slate-700 bg-slate-800/80 px-2 py-0.5 text-[11px] text-slate-500">
          +{extra}
        </li>
      ) : null}
    </ul>
  );
}
