import { useState } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { ADDRESSES, TREASURY_ABI } from "../config/contracts";
import { formatUSDC } from "../lib/constants";

interface ClaimableInfo {
  claimSeasonId: bigint;
  claimable: bigint;
  alreadyClaimed: boolean;
  seasonFinalized: boolean;
  refetch: () => void;
}

interface RewardsPanelProps {
  pendingRewards: bigint | undefined;
  seasonId: bigint | undefined;
  claimInfo: ClaimableInfo | undefined;
}

export default function RewardsPanel({ pendingRewards, claimInfo }: RewardsPanelProps) {
  const { address } = useAccount();
  const { writeContract: withdraw, data: withdrawTx } = useWriteContract();
  const { writeContract: claim, data: claimTx } = useWriteContract();
  const [pendingClaim, setPendingClaim] = useState(false);

  const { isLoading: isWithdrawing } =
    useWaitForTransactionReceipt({ hash: withdrawTx });
  const { isLoading: isClaiming, isSuccess: claimSuccess } =
    useWaitForTransactionReceipt({ hash: claimTx });

  // Refresh data after successful claim
  if (claimSuccess && pendingClaim) {
    setPendingClaim(false);
    claimInfo?.refetch();
  }

  if (!address) return null;

  const hasPending = pendingRewards !== undefined && pendingRewards > 0n;
  const hasClaimable =
    claimInfo &&
    claimInfo.seasonFinalized &&
    !claimInfo.alreadyClaimed &&
    claimInfo.claimable > 0n;

  return (
    <div className="card space-y-3">
      <h2 className="text-lg font-bold">Rewards</h2>

      {/* Claimable season reward */}
      {claimInfo && claimInfo.seasonFinalized && (
        <div className="rounded-lg p-3 space-y-2" style={{
          backgroundColor: hasClaimable ? "rgba(74, 222, 128, 0.1)" : "rgba(156, 163, 175, 0.05)",
          border: hasClaimable ? "1px solid rgba(74, 222, 128, 0.3)" : "1px solid rgba(156, 163, 175, 0.15)",
        }}>
          <div className="flex items-center justify-between">
            <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
              Season {claimInfo.claimSeasonId.toString()} Reward
            </span>
            <span className="font-mono font-bold" style={{
              color: hasClaimable ? "var(--accent-green)" : "var(--text-muted)",
            }}>
              {hasClaimable
                ? formatUSDC(claimInfo.claimable)
                : claimInfo.alreadyClaimed
                  ? "Claimed"
                  : "$0.00"}
            </span>
          </div>
          {hasClaimable && (
            <button
              onClick={() => {
                setPendingClaim(true);
                claim({
                  address: ADDRESSES.treasury,
                  abi: TREASURY_ABI,
                  functionName: "claim",
                  args: [claimInfo.claimSeasonId],
                });
              }}
              disabled={isClaiming}
              className="btn-primary w-full text-sm"
            >
              {isClaiming ? "Claiming..." : `Claim ${formatUSDC(claimInfo.claimable)}`}
            </button>
          )}
        </div>
      )}

      {/* Pending rewards (ready to withdraw) */}
      <div className="flex items-center justify-between">
        <span className="text-sm" style={{ color: "var(--text-secondary)" }}>Pending Withdrawal</span>
        <span className="font-mono font-bold" style={{
          color: hasPending ? "var(--accent-green)" : "var(--text-muted)",
        }}>
          {pendingRewards !== undefined ? formatUSDC(pendingRewards) : "$0.00"}
        </span>
      </div>

      {hasPending && (
        <button
          onClick={() =>
            withdraw({
              address: ADDRESSES.treasury,
              abi: TREASURY_ABI,
              functionName: "withdraw",
            })
          }
          disabled={isWithdrawing}
          className="btn-neutral w-full text-sm"
        >
          {isWithdrawing ? "Withdrawing..." : `Withdraw ${formatUSDC(pendingRewards!)}`}
        </button>
      )}
    </div>
  );
}
