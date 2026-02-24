import {
  WEATHER_LABELS,
  WEATHER_EMOJI,
  WEATHER_BONUS_UNIT,
  EVENT_LABELS,
  EVENT_EMOJI,
  SEASON_DURATION,
  formatTimeRemaining,
  formatUSDC,
} from "../lib/constants";

interface SeasonInfoProps {
  seasonId: bigint | undefined;
  seasonActive: boolean | undefined;
  seasonStartTime: bigint | undefined;
  totalPEPE: bigint | undefined;
  totalSHIB: bigint | undefined;
  weather: number;
  specialEvent: number;
  specialEventEndsAt: number;
  pendingRewards: bigint | undefined;
  usdcBalance: bigint | undefined;
}

export default function SeasonInfo({
  seasonId,
  seasonActive,
  seasonStartTime,
  totalPEPE,
  totalSHIB,
  weather,
  specialEvent,
  specialEventEndsAt,
  pendingRewards,
  usdcBalance,
}: SeasonInfoProps) {
  const seasonEnd = seasonStartTime
    ? Number(seasonStartTime) + SEASON_DURATION
    : 0;

  return (
    <div className="card space-y-4">
      <h2 className="text-lg font-bold">📊 Season Info</h2>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <span className="text-gray-500 block text-xs">Season</span>
          <span className="font-bold text-lg">
            #{seasonId?.toString() ?? "—"}
          </span>
        </div>
        <div>
          <span className="text-gray-500 block text-xs">Status</span>
          <span
            className={`font-bold ${seasonActive ? "text-green-400" : "text-red-400"}`}
          >
            {seasonActive ? "🟢 Active" : "🔴 Inactive"}
          </span>
        </div>
        <div>
          <span className="text-gray-500 block text-xs">Time Left</span>
          <span className="font-mono">
            {seasonEnd > 0 ? formatTimeRemaining(seasonEnd) : "—"}
          </span>
        </div>
        <div>
          <span className="text-gray-500 block text-xs">Forces</span>
          <span>
            <span className="text-pepe">{totalPEPE?.toString() ?? "0"}</span>
            {" vs "}
            <span className="text-shib">{totalSHIB?.toString() ?? "0"}</span>
          </span>
        </div>
      </div>

      {/* Weather */}
      <div className="p-3 rounded-lg bg-gray-800/50 space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">Weather</span>
          <span className="text-sm">
            {WEATHER_EMOJI[weather]} {WEATHER_LABELS[weather]}
          </span>
        </div>
        {weather > 0 && (
          <div className="text-xs text-yellow-400">
            {WEATHER_BONUS_UNIT[weather]}
          </div>
        )}
      </div>

      {/* Special Event */}
      {specialEvent > 0 && (
        <div className="p-3 rounded-lg bg-purple-900/30 border border-purple-800 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-purple-400">Active Event</span>
            <span className="text-sm">
              {EVENT_EMOJI[specialEvent]} {EVENT_LABELS[specialEvent]}
            </span>
          </div>
          <div className="text-xs text-gray-400">
            Ends: {formatTimeRemaining(specialEventEndsAt)}
          </div>
        </div>
      )}

      {/* Player Balances */}
      {(usdcBalance !== undefined || pendingRewards !== undefined) && (
        <div className="border-t border-game-border pt-3 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">USDC Balance</span>
            <span className="font-mono">
              {usdcBalance !== undefined ? formatUSDC(usdcBalance) : "—"}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Pending Rewards</span>
            <span className="font-mono text-green-400">
              {pendingRewards !== undefined && pendingRewards > 0n
                ? formatUSDC(pendingRewards)
                : "$0.00"}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
