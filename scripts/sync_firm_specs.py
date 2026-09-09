#!/usr/bin/env python3
"""Sync public firm specs into each data/firms/*.json and emit data/firms.json.

Ensures every firm has category / tier / platforms / assets / highlights,
then writes a compact aggregate used by directory tooling.
"""

from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FIRMS_DIR = ROOT / "data" / "firms"
AGGREGATE = ROOT / "data" / "firms.json"

TIER1_FOREX = {
    "ftmo",
    "fundednext",
    "fundingpips",
    "the5ers",
    "e8-markets",
    "alpha-capital",
    "fintokei",
    "goatfunded",
    "instant-funding",
    "fxify",
    "brightfunded",
    "the-trading-pit",
    "funding-traders",
    "funded-trading-plus",
    "thinkcapital",
}
TIER1_FUTURES = {
    "topstep",
    "apex-trader-funding",
    "take-profit-trader",
    "earn2trade",
    "tradeify",
    "my-funded-futures",
    "tradeday",
}
TIER2 = {
    "top-one-trader",
    "aquafunded",
    "dna-funded",
    "ment-funding",
    "lux-trading-firm",
    "for-traders",
    "city-traders-imperium",
    "maven-trading",
    "funderpro",
    "blue-guardian",
}

DEFAULT_PLATFORMS: dict[str, list[str]] = {
    "ftmo": ["mt4", "mt5", "ctrader", "dxtrade"],
    "fundednext": ["mt4", "mt5", "ctrader"],
    "fundingpips": ["matchtrader", "ctrader", "tradelocker"],
    "the5ers": ["mt5"],
    "e8-markets": ["mt4", "mt5", "ctrader", "matchtrader"],
    "alpha-capital": ["mt5", "ctrader", "dxtrade"],
    "fintokei": ["mt4", "mt5", "ctrader"],
    "goatfunded": ["mt5", "ctrader", "matchtrader"],
    "instant-funding": ["mt5", "ctrader", "matchtrader", "tradelocker"],
    "fxify": ["mt4", "mt5", "ctrader", "dxtrade"],
    "brightfunded": ["mt5", "ctrader", "matchtrader"],
    "the-trading-pit": ["mt5", "ctrader"],
    "funding-traders": ["mt5", "ctrader", "matchtrader"],
    "funded-trading-plus": ["mt4", "mt5", "ctrader"],
    "thinkcapital": ["thinktrader", "mt5", "tradingview"],
    "topstep": ["tradovate", "ninjatrader"],
    "apex-trader-funding": ["tradovate", "ninjatrader", "tradingview"],
    "take-profit-trader": ["tradovate", "ninjatrader", "tradingview"],
    "earn2trade": ["ninjatrader", "tradovate"],
    "tradeify": ["tradovate", "ninjatrader", "tradingview"],
    "my-funded-futures": ["tradovate", "ninjatrader", "tradingview"],
    "tradeday": ["tradovate", "ninjatrader"],
    "top-one-trader": ["mt4", "mt5", "ctrader", "matchtrader"],
    "aquafunded": ["mt5", "ctrader", "matchtrader"],
    "dna-funded": ["mt5", "matchtrader", "tradelocker"],
    "ment-funding": ["mt4", "mt5", "ctrader"],
    "lux-trading-firm": ["mt4", "mt5"],
    "for-traders": ["mt5", "ctrader"],
    "city-traders-imperium": ["mt4", "mt5", "ctrader"],
    "maven-trading": ["mt5", "ctrader", "matchtrader"],
    "funderpro": ["tradelocker", "mt5"],
    "blue-guardian": ["mt4", "mt5", "ctrader", "matchtrader"],
}

HIGHLIGHTS: dict[str, list[str]] = {
    "thinkcapital": ["licensed_broker"],
    "fintokei": ["licensed_broker"],
    "tradeday": ["instant_payout"],
    "instant-funding": ["instant_payout", "low_entry"],
    "my-funded-futures": ["instant_payout"],
    "tradeify": ["instant_payout"],
    "take-profit-trader": ["instant_payout"],
    "funded-trading-plus": ["instant_payout"],
    "fundingpips": ["low_entry"],
    "goatfunded": ["low_entry"],
}

FOREX_ASSETS = ["fx", "indices", "metals", "crypto"]
FUTURES_ASSETS = ["futures"]

DIR_BLOCK_RE = re.compile(
    r'  "status": "[^"]+",\n'
    r'(?:  "(?:category|tier|platforms|assets|highlights)": .*?\n)*',
    re.M,
)


def classify(slug: str) -> tuple[list[str], int]:
    if slug in TIER1_FUTURES:
        return ["futures"], 1
    if slug in TIER1_FOREX:
        return ["forex"], 1
    if slug in TIER2:
        return ["forex"], 2
    raise SystemExit(f"Unknown firm slug (update sync script maps): {slug}")


def assets_for(category: list[str]) -> list[str]:
    if "futures" in category:
        return list(FUTURES_ASSETS)
    return list(FOREX_ASSETS)


def max_allocation(data: dict) -> float:
    funding = data["basic"]["funding"]
    return funding.get("maxScaledSize") or funding["maxAccountSize"]


def directory_block(status: str, category: list[str], tier: int, platforms: list[str], assets: list[str], highlights: list[str]) -> str:
    return (
        f'  "status": "{status}",\n'
        f'  "category": {json.dumps(category)},\n'
        f'  "tier": {tier},\n'
        f'  "platforms": {json.dumps(platforms)},\n'
        f'  "assets": {json.dumps(assets)},\n'
        f'  "highlights": {json.dumps(highlights)},\n'
    )


def sync_file(path: Path) -> dict:
    raw = path.read_text()
    data = json.loads(raw)
    slug = data["slug"]
    category, tier = classify(slug)
    platforms = data.get("platforms") or DEFAULT_PLATFORMS.get(slug)
    if not platforms:
        raise SystemExit(f"No platforms for {slug}")
    assets = assets_for(category)
    highlights = HIGHLIGHTS.get(slug, data.get("highlights") or [])
    status = data["status"]

    block = directory_block(status, category, tier, platforms, assets, highlights)
    if DIR_BLOCK_RE.search(raw):
        text = DIR_BLOCK_RE.sub(block, raw, count=1)
    else:
        raise SystemExit(f"Could not find status block in {path.name}")

    parsed = json.loads(text)
    path.write_text(text)
    return parsed


def main() -> None:
    files = sorted(FIRMS_DIR.glob("*.json"))
    if not files:
        raise SystemExit(f"No firm JSON under {FIRMS_DIR}")

    aggregate = []
    for path in files:
        refreshed = sync_file(path)
        hq = refreshed["basic"]["headquarters"]
        aggregate.append(
            {
                "slug": refreshed["slug"],
                "name": refreshed["basic"]["name"],
                "status": refreshed["status"],
                "category": refreshed["category"],
                "tier": refreshed["tier"],
                "country": hq["country"],
                "countryCode": hq["countryCode"],
                "foundedAt": refreshed["basic"]["foundedAt"],
                "platforms": refreshed["platforms"],
                "assets": refreshed["assets"],
                "maxAllocation": max_allocation(refreshed),
                "rating": refreshed.get("rating"),
                "reviewCount": refreshed.get("reviewCount", 0),
                "highlights": refreshed.get("highlights", []),
                "website": refreshed["basic"]["website"],
            }
        )
        print(f"✓ {path.name}")

    aggregate.sort(key=lambda item: item["slug"])
    AGGREGATE.write_text(json.dumps(aggregate, ensure_ascii=False, indent=2) + "\n")
    print(f"\nWrote {AGGREGATE.relative_to(ROOT)} ({len(aggregate)} firms)")


if __name__ == "__main__":
    main()
