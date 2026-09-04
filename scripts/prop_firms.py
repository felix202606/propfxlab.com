"""Batch generation list: 30 prop firms (name / kebab slug / official site)."""

from __future__ import annotations

from typing import TypedDict


class PropFirmSeed(TypedDict):
    name: str
    slug: str
    url: str


PROP_FIRMS: list[PropFirmSeed] = [
    {"name": "FTMO", "slug": "ftmo", "url": "https://ftmo.com"},
    {"name": "FundedNext", "slug": "fundednext", "url": "https://fundednext.com"},
    {"name": "FundingPips", "slug": "fundingpips", "url": "https://www.fundingpips.com"},
    {
        "name": "Goat Funded Trader",
        "slug": "goatfunded",
        "url": "https://www.goatfundedtrader.com",
    },
    {
        "name": "Apex Trader Funding",
        "slug": "apex-trader-funding",
        "url": "https://apextraderfunding.com",
    },
    {
        "name": "Alpha Capital Group",
        "slug": "alpha-capital",
        "url": "https://alphacapitalgroup.uk",
    },
    {
        "name": "Funding Traders",
        "slug": "funding-traders",
        "url": "https://fundingtraders.com",
    },
    {"name": "MyFundedFX", "slug": "myfundedfx", "url": "https://myfundedfx.com"},
    {"name": "The5ers", "slug": "the5ers", "url": "https://the5ers.com"},
    {"name": "E8 Markets", "slug": "e8-markets", "url": "https://e8markets.com"},
    {"name": "Topstep", "slug": "topstep", "url": "https://www.topstep.com"},
    {"name": "Tradeify", "slug": "tradeify", "url": "https://tradeify.co"},
    {
        "name": "Take Profit Trader",
        "slug": "take-profit-trader",
        "url": "https://www.takeprofittrader.com",
    },
    {"name": "Earn2Trade", "slug": "earn2trade", "url": "https://www.earn2trade.com"},
    {"name": "Fintokei", "slug": "fintokei", "url": "https://fintokei.com"},
    {
        "name": "Instant Funding",
        "slug": "instant-funding",
        "url": "https://instantfunding.com",
    },
    {
        "name": "City Traders Imperium",
        "slug": "city-traders-imperium",
        "url": "https://citytradersimperium.com",
    },
    {"name": "Blue Guardian", "slug": "blue-guardian", "url": "https://blueguardian.com"},
    {"name": "FXIFY", "slug": "fxify", "url": "https://fxify.com"},
    {"name": "Ment Funding", "slug": "ment-funding", "url": "https://mentfunding.com"},
    {
        "name": "Top One Trader",
        "slug": "top-one-trader",
        "url": "https://www.toponetrader.com",
    },
    {"name": "For Traders", "slug": "for-traders", "url": "https://www.fortraders.com"},
    {"name": "AquaFunded", "slug": "aquafunded", "url": "https://www.aquafunded.com"},
    {
        "name": "BrightFunded",
        "slug": "brightfunded",
        "url": "https://www.brightfunded.com",
    },
    {"name": "FunderPro", "slug": "funderpro", "url": "https://funderpro.com"},
    {
        "name": "Funded Trading Plus",
        "slug": "funded-trading-plus",
        "url": "https://www.fundedtradingplus.com",
    },
    {
        "name": "The Trading Pit",
        "slug": "the-trading-pit",
        "url": "https://www.thetradingpit.com",
    },
    {
        "name": "Maven Trading",
        "slug": "maven-trading",
        "url": "https://www.maventrading.com",
    },
    {"name": "DNA Funded", "slug": "dna-funded", "url": "https://www.dnafunded.com"},
    {
        "name": "Lux Trading Firm",
        "slug": "lux-trading-firm",
        "url": "https://luxtradingfirm.com",
    },
]
