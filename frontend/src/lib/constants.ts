// ── Game constants (must match Solidity) ──

export const SEGMENT_DURATION = 30 * 60; // 30 minutes in seconds
export const MARCH_DURATION = 90 * 60; // 90 minutes
export const SEASON_DURATION = 7 * 24 * 60 * 60; // 7 days
export const BASTION_SEGMENT = 3;
export const NUM_LANES = 3;

export const FACTION = {
  NONE: 0,
  PEPE: 1,
  SHIB: 2,
} as const;

export const UNIT_TYPE = {
  NONE: 0,
  SWORDSMAN: 1,
  SPEARMAN: 2,
  CAVALRY: 3,
} as const;

export const WEATHER = {
  NONE: 0,
  RAINY: 1,
  SUNNY: 2,
  FOGGY: 3,
} as const;

export const SPECIAL_EVENT = {
  NONE: 0,
  EPIDEMIC: 1,
  HARVEST: 2,
  ECLIPSE: 3,
} as const;

export const UNIT_LABELS: Record<number, string> = {
  [UNIT_TYPE.SWORDSMAN]: "Swordsman",
  [UNIT_TYPE.SPEARMAN]: "Spearman",
  [UNIT_TYPE.CAVALRY]: "Cavalry",
};

export const UNIT_EMOJI: Record<number, string> = {
  [UNIT_TYPE.SWORDSMAN]: "\u2694\uFE0F",
  [UNIT_TYPE.SPEARMAN]: "\uD83C\uDFF9",
  [UNIT_TYPE.CAVALRY]: "\uD83D\uDC0E",
};

export const WEATHER_LABELS: Record<number, string> = {
  [WEATHER.NONE]: "Clear",
  [WEATHER.RAINY]: "Rainy",
  [WEATHER.SUNNY]: "Sunny",
  [WEATHER.FOGGY]: "Foggy",
};

export const WEATHER_EMOJI: Record<number, string> = {
  [WEATHER.NONE]: "\u2600\uFE0F",
  [WEATHER.RAINY]: "\uD83C\uDF27\uFE0F",
  [WEATHER.SUNNY]: "\u2600\uFE0F",
  [WEATHER.FOGGY]: "\uD83C\uDF2B\uFE0F",
};

export const WEATHER_BONUS_UNIT: Record<number, string> = {
  [WEATHER.RAINY]: "Spearman +20%",
  [WEATHER.SUNNY]: "Cavalry +20%",
  [WEATHER.FOGGY]: "Swordsman +20%",
};

export const EVENT_LABELS: Record<number, string> = {
  [SPECIAL_EVENT.NONE]: "None",
  [SPECIAL_EVENT.EPIDEMIC]: "Epidemic",
  [SPECIAL_EVENT.HARVEST]: "Harvest",
  [SPECIAL_EVENT.ECLIPSE]: "Eclipse",
};

export const EVENT_EMOJI: Record<number, string> = {
  [SPECIAL_EVENT.NONE]: "",
  [SPECIAL_EVENT.EPIDEMIC]: "\uD83E\uDDA0",
  [SPECIAL_EVENT.HARVEST]: "\uD83C\uDF3E",
  [SPECIAL_EVENT.ECLIPSE]: "\uD83C\uDF11",
};

export const FACTION_LABELS: Record<number, string> = {
  [FACTION.PEPE]: "PEPE",
  [FACTION.SHIB]: "SHIB",
};

// RPS display
export const RPS_CHART = "\u2694\uFE0F > \uD83C\uDFF9 > \uD83D\uDC0E > \u2694\uFE0F";

export function formatUSDC(amount: bigint): string {
  const dollars = Number(amount) / 1_000_000;
  return `$${dollars.toFixed(2)}`;
}

export function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export function formatTimeRemaining(endTimestamp: number): string {
  const now = Math.floor(Date.now() / 1000);
  const remaining = endTimestamp - now;
  if (remaining <= 0) return "Ended";
  const days = Math.floor(remaining / 86400);
  const hours = Math.floor((remaining % 86400) / 3600);
  const mins = Math.floor((remaining % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  return `${hours}h ${mins}m`;
}
