import { ASSET_LABELS, ASSET_ORDER } from "@/lib/assets";
import type { FirmAsset } from "@/lib/schema";

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
          className="rounded-md border border-slate-700 bg-slate-800/80 px-1.5 py-px text-[9px] font-medium tracking-wide text-slate-300"
        >
          {ASSET_LABELS[asset]}
        </li>
      ))}
      {extra > 0 ? (
        <li className="rounded-md border border-slate-700 bg-slate-800/80 px-1.5 py-px text-[9px] text-slate-500">
          +{extra}
        </li>
      ) : null}
    </ul>
  );
}
