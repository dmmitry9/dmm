import { useState } from "react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { ADDRESSES, ERC20_ABI, TREASURY_ABI } from "../../config/contracts";
import type { TreasuryBreakdown } from "../../hooks/useGameState";
import { SEASON_DURATION, formatUSDC } from "../../lib/constants";
import { PixelTrophy, PixelCoin, PixelBastion } from "./PixelSprites";

interface SeasonInfoV2Props {
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
  onDonated?: () => void;
}

function CircularTimer({ elapsed, total }: { elapsed: number; total: number }) {
  const pct = Math.min(1, Math.max(0, elapsed / total));
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - pct);
  const remaining = Math.max(0, total - elapsed);
  const urgent = pct > 0.9;

  const hours = Math.floor(remaining / 3600);
  const mins = Math.floor((remaining % 3600) / 60);
  const secs = remaining % 60;
  const timeStr = hours > 0 ? `${hours}h ${mins}m` : mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;

  return (
    <div className="flex flex-col items-center">
      <svg width={100} height={100} viewBox="0 0 100 100">
        {/* Background circle */}
        <circle
          cx={50} cy={50} r={radius}
          fill="none"
          stroke="var(--game-border)"
          strokeWidth={6}
        />
        {/* Progress arc */}
        <circle
          cx={50} cy={50} r={radius}
          fill="none"
          stroke={urgent ? "var(--accent-red)" : "#8B5CF6"}
          strokeWidth={6}
          strokeLinecap="butt"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 50 50)"
          className={`season-ring ${urgent ? "ring-urgent" : ""}`}
        />
        {/* Center text */}
        <text
          x={50} y={46}
          textAnchor="middle"
          fill="var(--text-primary)"
          fontSize={remaining > 0 ? 11 : 9}
          fontFamily="'Press Start 2P', monospace"
        >
          {remaining > 0 ? timeStr : "ENDED"}
        </text>
        <text
          x={50} y={62}
          textAnchor="middle"
          fill="var(--text-muted)"
          fontSize={7}
          fontFamily="monospace"
        >
          {remaining > 0 ? `${Math.floor(pct * 100)}%` : ""}
        </text>
      </svg>
    </div>
  );
}

function TreasuryBar({ breakdown }: { breakdown: TreasuryBreakdown }) {
  const killTotal = breakdown.killPots.reduce((sum, lp) => sum + Number(lp.pepe) + Number(lp.shib), 0);
  const seasonPool = Number(breakdown.seasonTreasury);
  const protocol = Number(breakdown.protocolBalance);
  const total = killTotal + seasonPool + protocol;
  if (total === 0) return null;

  const killPct = (killTotal / total) * 100;
  const seasonPct = (seasonPool / total) * 100;
  const protoPct = (protocol / total) * 100;

  return (
    <div className="space-y-1">
      {/* Stacked bar */}
      <div className="flex h-4 overflow-hidden" style={{ border: "2px solid var(--game-border)" }}>
        {killPct > 0 && (
          <div
            className="bg-red-500 flex items-center justify-center text-[7px] text-white font-bold"
            style={{ width: `${killPct}%` }}
            title={`Kill Pots: $${(killTotal / 1e6).toFixed(2)}`}
          >
            {killPct > 15 ? "Kill" : ""}
          </div>
        )}
        {seasonPct > 0 && (
          <div
            className="flex items-center justify-center text-[7px] text-black font-bold"
            style={{ width: `${seasonPct}%`, backgroundColor: "var(--accent-yellow)" }}
            title={`Season Pool: ${formatUSDC(breakdown.seasonTreasury)}`}
          >
            {seasonPct > 15 ? "Pool" : ""}
          </div>
        )}
        {protoPct > 0 && (
          <div
            className="bg-gray-500 flex items-center justify-center text-[7px] text-white font-bold"
            style={{ width: `${protoPct}%` }}
            title={`Protocol: ${formatUSDC(breakdown.protocolBalance)}`}
          >
            {protoPct > 15 ? "Fee" : ""}
          </div>
        )}
      </div>
      {/* Legend */}
      <div className="flex gap-3 text-[9px]">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 bg-red-500 inline-block" /> Kill ${(killTotal / 1e6).toFixed(2)}
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 inline-block" style={{ backgroundColor: "var(--accent-yellow)" }} /> Pool {formatUSDC(breakdown.seasonTreasury)}
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 bg-gray-500 inline-block" /> Fee {formatUSDC(breakdown.protocolBalance)}
        </span>
      </div>
    </div>
  );
}

export default function SeasonInfoV2({
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
  onDonated,
}: SeasonInfoV2Props) {
  const { address } = useAccount();
  const now = Math.floor(Date.now() / 1000);
  const startTime = Number(seasonStartTime ?? 0);
  const elapsed = startTime > 0 ? now - startTime : 0;
  const seasonEnd = startTime > 0 ? startTime + SEASON_DURATION : 0;

  // Donate state
  const [showDonate, setShowDonate] = useState(false);
  const [donateAmount, setDonateAmount] = useState("");
  const donateAmountRaw = BigInt(Math.floor(Number(donateAmount || "0") * 1_000_000));

  const { data: treasuryAllowance, refetch: refetchAllowance } = useReadContract({
    address: ADDRESSES.usdc,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: address ? [address, ADDRESSES.treasury] : undefined,
    query: { enabled: !!address },
  });
  const currentTreasuryAllowance = (treasuryAllowance as bigint | undefined) ?? 0n;
  const hasDonateAllowance = donateAmountRaw > 0n && currentTreasuryAllowance >= donateAmountRaw;

  const [pendingApprove, setPendingApprove] = useState(false);
  const [pendingDonate, setPendingDonate] = useState(false);
  const { writeContract: approveTreasury, data: approveDonateTx } = useWriteContract();
  const { writeContract: donateTx, data: donateHash } = useWriteContract();
  const { isLoading: isApprovingDonate, isSuccess: approveDonateSuccess } = useWaitForTransactionReceipt({ hash: approveDonateTx });
  const { isLoading: isDonating, isSuccess: donateSuccess } = useWaitForTransactionReceipt({ hash: donateHash });

  if (approveDonateSuccess && pendingApprove) { setPendingApprove(false); refetchAllowance(); }
  if (donateSuccess && pendingDonate) { setPendingDonate(false); setDonateAmount(""); setShowDonate(false); onDonated?.(); }

  const handleApproveDonate = () => { if (donateAmountRaw <= 0n) return; setPendingApprove(true); approveTreasury({ address: ADDRESSES.usdc, abi: ERC20_ABI, functionName: "approve", args: [ADDRESSES.treasury, donateAmountRaw] }); };
  const handleDonate = () => { if (!seasonId || donateAmountRaw <= 0n) return; setPendingDonate(true); donateTx({ address: ADDRESSES.treasury, abi: TREASURY_ABI, functionName: "donate", args: [seasonId, donateAmountRaw] }); };

  // Estimated reward calculation
  const totalLaneScore = laneHoldScores
    ? laneHoldScores.reduce((sum, l) => sum + l.pepe + l.shib, 0n)
    : 0n;
  const estReward = playerHoldScore && playerHoldScore > 0n && totalLaneScore > 0n
    ? (treasuryBreakdown.seasonTreasury * playerHoldScore) / totalLaneScore
    : 0n;

  return (
    <div className="pixel-card space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="pixel-heading text-[10px] flex items-center gap-2">
          <PixelTrophy scale={2} />
          <span>Season #{seasonId?.toString() ?? "—"}</span>
        </h2>
      </div>

      {/* Circular Timer */}
      {seasonActive && (
        <CircularTimer elapsed={elapsed} total={SEASON_DURATION} />
      )}
      {!seasonActive && (
        <div className="text-center py-2">
          <p className="pixel-heading text-[10px]" style={{ color: "var(--accent-red)" }}>
            Season Ended
          </p>
        </div>
      )}

      {/* Lifecycle Buttons */}
      {seasonActive && seasonExpired && onEndSeason && (
        <button
          onClick={onEndSeason}
          disabled={isEndingSeason}
          className="pixel-btn w-full !py-2 !text-[9px]"
          style={{ backgroundColor: "var(--accent-red)", color: "#fff", borderColor: "#991b1b", boxShadow: "3px 3px 0 #991b1b" }}
        >
          {isEndingSeason ? "Ending..." : "End Season"}
        </button>
      )}
      {!seasonActive && onStartNextSeason && (
        <button
          onClick={onStartNextSeason}
          disabled={isStartingNextSeason}
          className="pixel-btn pixel-btn-pepe w-full !py-2 !text-[9px]"
        >
          {isStartingNextSeason ? "Starting..." : "Start Next Season"}
        </button>
      )}

      <hr className="pixel-divider" />

      {/* Battle Chest */}
      <div>
        <h3 className="text-[10px] font-bold flex items-center gap-1 mb-2" style={{ color: "var(--accent-yellow)" }}>
          <PixelTrophy scale={1.5} /> Battle Chest
        </h3>
        <div className="flex items-center gap-2 mb-2">
          <PixelCoin scale={2} />
          <span className="font-mono font-bold text-xl">
            {formatUSDC(
              treasuryBreakdown.killPots.reduce((s, lp) => s + lp.pepe + lp.shib, 0n) +
              treasuryBreakdown.seasonTreasury +
              treasuryBreakdown.protocolBalance
            )}
          </span>
        </div>
        <TreasuryBar breakdown={treasuryBreakdown} />
      </div>

      {/* Donate */}
      {address && seasonActive && (
        <div>
          {!showDonate ? (
            <button
              onClick={() => setShowDonate(true)}
              className="pixel-btn w-full !text-[8px] !py-1"
              style={{ color: "var(--accent-yellow)" }}
            >
              <PixelCoin scale={1} /> + Donate to Pool
            </button>
          ) : (
            <div className="space-y-2 p-2" style={{ border: "2px dashed var(--game-border)" }}>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={donateAmount}
                  onChange={(e) => setDonateAmount(e.target.value)}
                  placeholder="USDC"
                  min={0}
                  step="0.01"
                  className="pixel-input flex-1 text-xs"
                />
                <button onClick={() => { setShowDonate(false); setDonateAmount(""); }} className="pixel-btn !px-2 !py-1 !text-[8px]">X</button>
              </div>
              {hasDonateAllowance ? (
                <button onClick={handleDonate} disabled={donateAmountRaw <= 0n || isDonating} className="pixel-btn pixel-btn-pepe w-full !text-[8px] !py-1">
                  {isDonating ? "..." : `Donate ${donateAmount ? "$" + donateAmount : ""}`}
                </button>
              ) : (
                <div className="flex gap-2">
                  <button onClick={handleApproveDonate} disabled={donateAmountRaw <= 0n || isApprovingDonate} className="pixel-btn flex-1 !text-[8px] !py-1">
                    {isApprovingDonate ? "..." : "1. Approve"}
                  </button>
                  <button disabled className="pixel-btn flex-1 !text-[8px] !py-1 opacity-50">2. Donate</button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <hr className="pixel-divider" />

      {/* Player Stats */}
      {(usdcBalance !== undefined || pendingRewards !== undefined) && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[11px]">
            <span style={{ color: "var(--text-muted)" }}>USDC Balance</span>
            <span className="font-mono flex items-center gap-1">
              <PixelCoin scale={1} />
              {usdcBalance !== undefined ? formatUSDC(usdcBalance) : "—"}
            </span>
          </div>
          <div className="flex items-center justify-between text-[11px]">
            <span style={{ color: "var(--text-muted)" }}>Pending Rewards</span>
            <span className="font-mono" style={{ color: pendingRewards && pendingRewards > 0n ? "var(--accent-green)" : "var(--text-muted)" }}>
              {pendingRewards !== undefined && pendingRewards > 0n ? formatUSDC(pendingRewards) : "$0.00"}
            </span>
          </div>
          <div className="flex items-center justify-between text-[11px]">
            <span className="flex items-center gap-1" style={{ color: "var(--text-muted)" }}>
              <PixelTrophy scale={1} /> Hold Score
            </span>
            <span className="font-mono font-bold" style={{ color: playerHoldScore && playerHoldScore > 0n ? "var(--accent-yellow)" : "var(--text-muted)" }}>
              {playerHoldScore !== undefined ? playerHoldScore.toString() : "0"}
              {estReward > 0n && (
                <span className="text-[9px] font-normal ml-1" style={{ color: "var(--text-muted)" }}>
                  (~{formatUSDC(estReward)})
                </span>
              )}
            </span>
          </div>

          {/* Per-lane scores */}
          {playerLaneScores && (
            <div className="space-y-1 pt-1">
              <span className="text-[9px] uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Per-Lane Scores</span>
              {playerLaneScores.map((score, i) => {
                const laneTotal = laneHoldScores ? laneHoldScores[i].pepe + laneHoldScores[i].shib : 0n;
                const pct = laneTotal > 0n ? Number(score * 10000n / laneTotal) / 100 : 0;
                const activeLanes = laneHoldScores ? laneHoldScores.filter(l => l.pepe + l.shib > 0n).length : 3;
                const lanePool = activeLanes > 0 ? treasuryBreakdown.seasonTreasury / BigInt(activeLanes) : 0n;
                const playerUSDC = laneTotal > 0n ? lanePool * score / laneTotal : 0n;
                return (
                  <div key={i} className="flex items-center justify-between text-[10px]">
                    <span className="flex items-center gap-1" style={{ color: "var(--text-secondary)" }}>
                      <PixelBastion scale={1} /> Lane {i + 1}
                    </span>
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
