#!/usr/bin/env python3
"""Sync public firm directory aggregate from data/firms/*.json → data/firms.json.

Does NOT overwrite per-firm platforms/assets/country — those are curated
(from PropFirmMatch / editorial review). Only rebuilds the compact aggregate
and ensures required directory fields exist.
"""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FIRMS_DIR = ROOT / "data" / "firms"
AGGREGATE = ROOT / "data" / "firms.json"

FOREX_ASSETS = ["fx", "indices", "metals", "crypto"]
FUTURES_ASSETS = ["futures"]


def max_allocation(data: dict) -> float:
    funding = data["basic"]["funding"]
    return funding.get("maxScaledSize") or funding["maxAccountSize"]


def ensure_defaults(data: dict) -> dict:
    """Fill missing directory fields without clobbering curated values."""
    category = data.get("category")
    if not category:
        raise SystemExit(f"{data.get('slug')}: missing category")
    if "tier" not in data:
        raise SystemExit(f"{data.get('slug')}: missing tier")
    if not data.get("platforms"):
        raise SystemExit(f"{data.get('slug')}: missing platforms")
    if not data.get("assets"):
        data["assets"] = (
            list(FUTURES_ASSETS)
            if "futures" in category
            else list(FOREX_ASSETS)
        )
    data.setdefault("highlights", [])
    return data


def main() -> None:
    files = sorted(FIRMS_DIR.glob("*.json"))
    if not files:
        raise SystemExit(f"No firm JSON under {FIRMS_DIR}")

    aggregate = []
    for path in files:
        data = ensure_defaults(json.loads(path.read_text()))
        # Persist defaults only if assets/highlights were missing
        path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n")

        hq = data["basic"]["headquarters"]
        aggregate.append(
            {
                "slug": data["slug"],
                "name": data["basic"]["name"],
                "status": data["status"],
                "category": data["category"],
                "tier": data["tier"],
                "country": hq["country"],
                "countryCode": hq["countryCode"],
                "foundedAt": data["basic"]["foundedAt"],
                "platforms": data["platforms"],
                "assets": data["assets"],
                "maxAllocation": max_allocation(data),
                "rating": data.get("rating"),
                "reviewCount": data.get("reviewCount", 0),
                "highlights": data.get("highlights", []),
                "website": data["basic"]["website"],
            }
        )
        print(f"✓ {path.name}")

    aggregate.sort(key=lambda item: item["slug"])
    AGGREGATE.write_text(json.dumps(aggregate, ensure_ascii=False, indent=2) + "\n")
    print(f"\nWrote {AGGREGATE.relative_to(ROOT)} ({len(aggregate)} firms)")


if __name__ == "__main__":
    main()
