import type { TreasuryBreakdown } from "../hooks/useGameState";
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
  treasuryBreakdown: TreasuryBreakdown;
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
  treasuryBreakdown,
}: SeasonInfoProps) {
  const seasonEnd = seasonStartTime
    ? Number(seasonStartTime) + SEASON_DURATION
    : 0;

  const totalKillPot = treasuryBreakdown.killPots.reduce(
    (sum, lp) => sum + lp.pepe + lp.shib,
    0n
  );

  return (
    <div className="card space-y-4">
      <h2 className="text-lg font-bold">📊 Season Info</h2>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <span className="block text-xs" style={{ color: "var(--text-muted)" }}>Season</span>
          <span className="font-bold text-lg">
            #{seasonId?.toString() ?? "—"}
          </span>
        </div>
        <div>
          <span className="block text-xs" style={{ color: "var(--text-muted)" }}>Status</span>
          <span className="font-bold" style={{ color: seasonActive ? "var(--accent-green)" : "var(--accent-red)" }}>
            {seasonActive ? "🟢 Active" : "🔴 Inactive"}
          </span>
        </div>
        <div>
          <span className="block text-xs" style={{ color: "var(--text-muted)" }}>Time Left</span>
          <span className="font-mono">
            {seasonEnd > 0 ? formatTimeRemaining(seasonEnd) : "—"}
          </span>
        </div>
        <div>
          <span className="block text-xs" style={{ color: "var(--text-muted)" }}>Forces</span>
          <span>
            <span className="text-pepe">{totalPEPE?.toString() ?? "0"}</span>
            {" vs "}
            <span className="text-shib">{totalSHIB?.toString() ?? "0"}</span>
          </span>
        </div>
      </div>

      {/* Treasury Breakdown */}
      <div className="p-3 rounded-lg space-y-2" style={{ backgroundColor: "var(--treasury-bg)", border: "1px solid var(--treasury-border)" }}>
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold" style={{ color: "var(--accent-yellow-bold)" }}>💰 Treasury</span>
          <span className="font-mono text-xs" style={{ color: "var(--accent-yellow)" }}>
            Season Pool: {formatUSDC(treasuryBreakdown.seasonTreasury)}
          </span>
        </div>

        {/* Kill Pots per lane */}
        <div className="space-y-1">
          <span className="text-[10px] uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Kill Pots</span>
          {treasuryBreakdown.killPots.map((lp, i) => (
            <div key={i} className="flex items-center justify-between text-xs">
              <span style={{ color: "var(--text-secondary)" }}>Lane {i + 1}</span>
              <span className="font-mono">
                <span className="text-pepe">🐸{formatUSDC(lp.pepe)}</span>
                {" / "}
                <span className="text-shib">🐕{formatUSDC(lp.shib)}</span>
              </span>
            </div>
          ))}
          <div className="flex items-center justify-between text-xs pt-1" style={{ borderTop: "1px solid var(--treasury-divider)" }}>
            <span style={{ color: "var(--accent-yellow-bold)" }}>Total Kill Pot</span>
            <span className="font-mono font-bold" style={{ color: "var(--accent-yellow)" }}>{formatUSDC(totalKillPot)}</span>
          </div>
        </div>
      </div>

      {/* Weather */}
      <div className="p-3 rounded-lg space-y-1" style={{ backgroundColor: "var(--panel-bg)" }}>
        <div className="flex items-center justify-between">
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>Weather</span>
          <span className="text-sm">
            {WEATHER_EMOJI[weather]} {WEATHER_LABELS[weather]}
          </span>
        </div>
        {weather > 0 && (
          <div className="text-xs" style={{ color: "var(--accent-yellow)" }}>
            {WEATHER_BONUS_UNIT[weather]}
          </div>
        )}
      </div>

      {/* Special Event */}
      {specialEvent > 0 && (
        <div className="p-3 rounded-lg bg-purple-900/30 border border-purple-800 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs" style={{ color: "var(--accent-purple)" }}>Active Event</span>
            <span className="text-sm">
              {EVENT_EMOJI[specialEvent]} {EVENT_LABELS[specialEvent]}
            </span>
          </div>
          <div className="text-xs" style={{ color: "var(--text-secondary)" }}>
            Ends: {formatTimeRemaining(specialEventEndsAt)}
          </div>
        </div>
      )}

      {/* Player Balances */}
      {(usdcBalance !== undefined || pendingRewards !== undefined) && (
        <div className="border-t border-game-border pt-3 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span style={{ color: "var(--text-muted)" }}>USDC Balance</span>
            <span className="font-mono">
              {usdcBalance !== undefined ? formatUSDC(usdcBalance) : "—"}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span style={{ color: "var(--text-muted)" }}>Pending Rewards</span>
            <span className="font-mono" style={{ color: pendingRewards && pendingRewards > 0n ? "var(--accent-green)" : "var(--text-muted)" }}>
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
