import type { TreasuryBreakdown } from "../hooks/useGameState";
import {
  SEASON_DURATION,
  formatTimeRemaining,
  formatUSDC,
} from "../lib/constants";

interface SeasonInfoProps {
  seasonId: bigint | undefined;
  seasonActive: boolean | undefined;
  seasonStartTime: bigint | undefined;
  pendingRewards: bigint | undefined;
  usdcBalance: bigint | undefined;
  treasuryBreakdown: TreasuryBreakdown;
  playerHoldScore?: bigint;
  playerLaneScores?: bigint[];
  laneHoldScores?: { pepe: bigint; shib: bigint }[];
  onEndSeason?: () => void;
  isEndingSeason?: boolean;
  onStartNextSeason?: () => void;
  isStartingNextSeason?: boolean;
  seasonExpired?: boolean;
}

export default function SeasonInfo({
  seasonId,
  seasonActive,
  seasonStartTime,
  pendingRewards,
  usdcBalance,
  treasuryBreakdown,
  playerHoldScore,
  playerLaneScores,
  laneHoldScores,
  onEndSeason,
  isEndingSeason,
  onStartNextSeason,
  isStartingNextSeason,
  seasonExpired,
}: SeasonInfoProps) {
  const seasonEnd = seasonStartTime
    ? Number(seasonStartTime) + SEASON_DURATION
    : 0;

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
          <span className="block text-xs" style={{ color: "var(--text-muted)" }}>Time Left</span>
          <span className="font-mono">
            {seasonEnd > 0 ? formatTimeRemaining(seasonEnd) : "—"}
          </span>
        </div>
      </div>

      {/* Season Lifecycle Buttons */}
      {seasonActive && seasonExpired && onEndSeason && (
        <button
          onClick={onEndSeason}
          disabled={isEndingSeason}
          className="w-full py-2 rounded-lg font-bold text-sm text-white transition-all hover:opacity-90 disabled:opacity-50"
          style={{ backgroundColor: "var(--accent-red)" }}
        >
          {isEndingSeason ? "⏳ Ending..." : "⏹ End Season"}
        </button>
      )}
      {!seasonActive && onStartNextSeason && (
        <button
          onClick={onStartNextSeason}
          disabled={isStartingNextSeason}
          className="w-full py-2 rounded-lg font-bold text-sm text-white transition-all hover:opacity-90 disabled:opacity-50"
          style={{ backgroundColor: "var(--accent-green)" }}
        >
          {isStartingNextSeason ? "⏳ Starting..." : "▶️ Start Next Season"}
        </button>
      )}

      {/* Treasury — Season Pool only */}
      <div className="p-3 rounded-lg" style={{ backgroundColor: "var(--treasury-bg)", border: "1px solid var(--treasury-border)" }}>
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold" style={{ color: "var(--accent-yellow-bold)" }}>💰 Season Pool</span>
          <span className="font-mono text-sm font-bold" style={{ color: "var(--accent-yellow)" }}>
            {formatUSDC(treasuryBreakdown.seasonTreasury)}
          </span>
        </div>
      </div>

      {/* Player Stats */}
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
          <div className="flex items-center justify-between text-sm">
            <span style={{ color: "var(--text-muted)" }}>🏆 Your Hold Score</span>
            <span className="font-mono font-bold" style={{ color: playerHoldScore && playerHoldScore > 0n ? "var(--accent-yellow)" : "var(--text-muted)" }}>
              {playerHoldScore !== undefined ? playerHoldScore.toString() : "0"}
            </span>
          </div>
          {playerLaneScores && (
            <div className="space-y-1 pt-1">
              <span className="text-[10px] uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Your Per-Lane Scores</span>
              {playerLaneScores.map((score, i) => {
                const laneTotal = laneHoldScores ? laneHoldScores[i].pepe + laneHoldScores[i].shib : 0n;
                const pct = laneTotal > 0n ? Number(score * 10000n / laneTotal) / 100 : 0;
                const activeLanes = laneHoldScores ? laneHoldScores.filter(l => l.pepe + l.shib > 0n).length : 3;
                const lanePool = activeLanes > 0 ? treasuryBreakdown.seasonTreasury / BigInt(activeLanes) : 0n;
                const playerUSDC = laneTotal > 0n ? lanePool * score / laneTotal : 0n;
                return (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <span style={{ color: "var(--text-secondary)" }}>Lane {i + 1}</span>
                    <span className="font-mono" style={{ color: score > 0n ? "var(--accent-yellow)" : "var(--text-muted)" }}>
                      {score.toString()}
                      {score > 0n && (
                        <span style={{ color: "var(--text-muted)" }}> ({pct.toFixed(1)}% · {formatUSDC(playerUSDC)})</span>
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
