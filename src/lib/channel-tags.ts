import type { WithdrawalChannel } from "@/lib/schema";

export type CardChannelTag = {
  id: string;
  label: string;
};

function isRiseChannel(channel: WithdrawalChannel): boolean {
  return /\brise\b/i.test(channel.name);
}

function isCryptoChannel(channel: WithdrawalChannel): boolean {
  return (
    channel.method === "crypto" || /crypto|usdt|usdc|\bbtc\b|bitcoin/i.test(channel.name)
  );
}

function isBankWireChannel(channel: WithdrawalChannel): boolean {
  if (isRiseChannel(channel)) return false;
  return (
    channel.method === "bank_wire" ||
    /bank|wire|sepa|swift|\bach\b/i.test(channel.name)
  );
}

function shortenChannelName(name: string): string {
  const trimmed = name.split(/[(/]/)[0]?.trim() ?? name;
  return trimmed.length > 16 ? `${trimmed.slice(0, 14)}…` : trimmed;
}

/** Compact payout-method chips for ranking cards: Crypto/USDT, Rise, Bank Wire, then others. */
export function getCardChannelTags(
  channels: WithdrawalChannel[],
): CardChannelTag[] {
  const tags: CardChannelTag[] = [];
  const seen = new Set<string>();

  const add = (id: string, label: string) => {
    if (seen.has(id)) return;
    seen.add(id);
    tags.push({ id, label });
  };

  if (channels.some(isCryptoChannel)) add("crypto", "Crypto/USDT");
  if (channels.some(isRiseChannel)) add("rise", "Rise");
  if (channels.some(isBankWireChannel)) add("bank_wire", "Bank Wire");

  for (const channel of channels) {
    if (
      isCryptoChannel(channel) ||
      isRiseChannel(channel) ||
      isBankWireChannel(channel)
    ) {
      continue;
    }
    add(channel.id, shortenChannelName(channel.name));
  }

  return tags;
}
