import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { ADDRESSES, TREASURY_ABI } from "../config/contracts";
import { formatUSDC } from "../lib/constants";

interface RewardsPanelProps {
  pendingRewards: bigint | undefined;
  seasonId: bigint | undefined;
}

export default function RewardsPanel({ pendingRewards, seasonId }: RewardsPanelProps) {
  const { address } = useAccount();
  const { writeContract: withdraw, data: withdrawTx } = useWriteContract();
  const { writeContract: claim, data: claimTx } = useWriteContract();

  const { isLoading: isWithdrawing } = useWaitForTransactionReceipt({ hash: withdrawTx });
  const { isLoading: isClaiming } = useWaitForTransactionReceipt({ hash: claimTx });

  if (!address) return null;

  const hasPending = pendingRewards !== undefined && pendingRewards > 0n;

  return (
    <div className="card space-y-3">
      <h2 className="text-lg font-bold">💰 Rewards</h2>

      <div className="flex items-center justify-between">
        <span className="text-gray-400 text-sm">Pending</span>
        <span className={`font-mono font-bold ${hasPending ? "text-green-400" : "text-gray-500"}`}>
          {pendingRewards !== undefined ? formatUSDC(pendingRewards) : "$0.00"}
        </span>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() =>
            withdraw({
              address: ADDRESSES.treasury,
              abi: TREASURY_ABI,
              functionName: "withdraw",
            })
          }
          disabled={!hasPending || isWithdrawing}
          className="btn-neutral flex-1 text-sm"
        >
          {isWithdrawing ? "Withdrawing..." : "Withdraw USDC"}
        </button>
        <button
          onClick={() => {
            if (!seasonId) return;
            claim({
              address: ADDRESSES.treasury,
              abi: TREASURY_ABI,
              functionName: "claim",
              args: [seasonId - 1n > 0n ? seasonId - 1n : 1n], // claim previous season
            });
          }}
          disabled={!seasonId || isClaiming}
          className="btn-neutral flex-1 text-sm"
        >
          {isClaiming ? "Claiming..." : "Claim Season"}
        </button>
      </div>
    </div>
  );
}
