import { useState } from "react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { ADDRESSES, ERC20_ABI, TREASURY_ABI } from "../config/contracts";
import { playConfirm } from "../lib/sounds";
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
  onDonated?: () => void;
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
  onDonated,
}: SeasonInfoProps) {
  const { address } = useAccount();
  const seasonEnd = seasonStartTime
    ? Number(seasonStartTime) + SEASON_DURATION
    : 0;

  // Donate to season pool
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

  if (approveDonateSuccess && pendingApprove) {
    setPendingApprove(false);
    refetchAllowance();
  }

  if (donateSuccess && pendingDonate) {
    setPendingDonate(false);
    setDonateAmount("");
    setShowDonate(false);
    onDonated?.();
    playConfirm();
  }

  const handleApproveDonate = () => {
    if (donateAmountRaw <= 0n) return;
    setPendingApprove(true);
    approveTreasury({
      address: ADDRESSES.usdc,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [ADDRESSES.treasury, donateAmountRaw],
    });
  };

  const handleDonate = () => {
    if (!seasonId || donateAmountRaw <= 0n) return;
    setPendingDonate(true);
    donateTx({
      address: ADDRESSES.treasury,
      abi: TREASURY_ABI,
      functionName: "donate",
      args: [seasonId, donateAmountRaw],
    });
  };

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

      {/* Treasury — Season Pool + Donate */}
      <div className="p-3 rounded-lg space-y-2" style={{ backgroundColor: "var(--treasury-bg)", border: "1px solid var(--treasury-border)" }}>
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold" style={{ color: "var(--accent-yellow-bold)" }}>💰 Season Pool</span>
          <span className="font-mono text-sm font-bold" style={{ color: "var(--accent-yellow)" }}>
            {formatUSDC(treasuryBreakdown.seasonTreasury)}
          </span>
        </div>

        {address && seasonActive && (
          <>
            {!showDonate ? (
              <button
                onClick={() => setShowDonate(true)}
                className="w-full text-xs py-1 rounded transition-all hover:opacity-80"
                style={{ color: "var(--accent-yellow)", backgroundColor: "var(--accent-yellow-bold)", opacity: 0.7 }}
              >
                + Donate to Pool
              </button>
            ) : (
              <div className="space-y-2 pt-1 border-t" style={{ borderColor: "var(--treasury-border)" }}>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={donateAmount}
                    onChange={(e) => setDonateAmount(e.target.value)}
                    placeholder="USDC amount"
                    min={0}
                    step="0.01"
                    className="flex-1 border border-game-border rounded px-2 py-1 text-xs font-mono"
                    style={{ backgroundColor: "var(--input-bg)", color: "var(--text-primary)" }}
                  />
                  <button
                    onClick={() => { setShowDonate(false); setDonateAmount(""); }}
                    className="text-xs px-2 py-1 rounded transition-all hover:opacity-80"
                    style={{ color: "var(--text-muted)" }}
                  >
                    ✕
                  </button>
                </div>
                {hasDonateAllowance ? (
                  <button
                    onClick={handleDonate}
                    disabled={donateAmountRaw <= 0n || isDonating}
                    className="w-full py-1.5 rounded text-xs font-bold text-white transition-all disabled:opacity-50"
                    style={{ backgroundColor: "var(--accent-green)" }}
                  >
                    {isDonating ? "Donating..." : `Donate ${donateAmount ? "$" + donateAmount : ""}`}
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={handleApproveDonate}
                      disabled={donateAmountRaw <= 0n || isApprovingDonate}
                      className="flex-1 py-1.5 rounded text-xs font-bold btn-neutral disabled:opacity-50"
                    >
                      {isApprovingDonate ? "Approving..." : "1. Approve"}
                    </button>
                    <button
                      disabled
                      className="flex-1 py-1.5 rounded text-xs font-bold opacity-50 text-white"
                      style={{ backgroundColor: "var(--accent-green)" }}
                    >
                      2. Donate
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}
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
