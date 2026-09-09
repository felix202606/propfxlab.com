import type { FirmAsset } from "@/lib/schema";

export const ASSET_LABELS: Record<FirmAsset, string> = {
  fx: "FX",
  futures: "Futures",
  crypto: "Crypto",
  indices: "Indices",
  metals: "Metals",
  energy: "Energy",
};

export const ASSET_ORDER: FirmAsset[] = [
  "fx",
  "futures",
  "indices",
  "metals",
  "crypto",
  "energy",
];
