import type { TradingPlatform } from "@/lib/schema";

export const PLATFORM_LABELS: Record<TradingPlatform, string> = {
  mt4: "MT4",
  mt5: "MT5",
  ctrader: "cTrader",
  tradovate: "Tradovate",
  ninjatrader: "NinjaTrader",
  thinktrader: "ThinkTrader",
  matchtrader: "MatchTrader",
  tradelocker: "TradeLocker",
  tradingview: "TradingView",
  dxtrade: "DXtrade",
};

export const PLATFORM_ORDER: TradingPlatform[] = [
  "mt4",
  "mt5",
  "ctrader",
  "tradovate",
  "ninjatrader",
  "thinktrader",
  "matchtrader",
  "tradelocker",
  "tradingview",
  "dxtrade",
];
