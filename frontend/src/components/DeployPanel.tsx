import { useState } from "react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { ADDRESSES, GAME_ENGINE_ABI, ERC20_ABI } from "../config/contracts";
import { useUnitPrice, usePlayerFaction } from "../hooks/useGameState";
import {
  FACTION,
  UNIT_TYPE,
  UNIT_LABELS,
  UNIT_EMOJI,
  RPS_CHART,
  formatUSDC,
} from "../lib/constants";

interface DeployPanelProps {
  seasonActive: boolean | undefined;
  totalPEPE: bigint;
  totalSHIB: bigint;
  onDeployed: () => void;
}

export default function DeployPanel({
  seasonActive,
  totalPEPE,
  totalSHIB,
  onDeployed,
}: DeployPanelProps) {
  const { address } = useAccount();
  const playerFaction = usePlayerFaction(address);

  const [faction, setFaction] = useState<number>(FACTION.PEPE);
  const [unitType, setUnitType] = useState<number>(UNIT_TYPE.SWORDSMAN);
  const [laneId, setLaneId] = useState<number>(0);
  const [count, setCount] = useState<number>(10);

  // Lock faction if player already has one
  const activeFaction = playerFaction > 0 ? playerFaction : faction;

  const price = useUnitPrice(activeFaction, count, totalPEPE, totalSHIB);

  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: ADDRESSES.usdc,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: address ? [address, ADDRESSES.gameEngine] : undefined,
    query: { enabled: !!address },
  });
  const currentAllowance = (allowance as bigint | undefined) ?? 0n;
  const hasEnoughAllowance = price ? currentAllowance >= price : false;

  const { writeContract: approve, data: approveTx } = useWriteContract();
  const { writeContract: deploy, data: deployTx } = useWriteContract();

  const { isLoading: isApproving, isSuccess: approveSuccess } = useWaitForTransactionReceipt({
    hash: approveTx,
  });
  const { isLoading: isDeploying, isSuccess } = useWaitForTransactionReceipt({
    hash: deployTx,
  });

  if (approveSuccess) {
    refetchAllowance();
  }

  if (isSuccess) {
    onDeployed();
    refetchAllowance();
  }

  const handleApprove = () => {
    if (!price) return;
    approve({
      address: ADDRESSES.usdc,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [ADDRESSES.gameEngine, price],
    });
  };

  const handleDeploy = () => {
    deploy({
      address: ADDRESSES.gameEngine,
      abi: GAME_ENGINE_ABI,
      functionName: "deployUnits",
      args: [laneId, unitType, activeFaction, count],
    });
  };

  if (!address) {
    return (
      <div className="card text-center py-8" style={{ color: "var(--text-muted)" }}>
        Connect wallet to deploy units
      </div>
    );
  }

  if (!seasonActive) {
    return (
      <div className="card text-center py-8" style={{ color: "var(--text-muted)" }}>
        No active season
      </div>
    );
  }

  return (
    <div className="card space-y-4">
      <h2 className="text-lg font-bold">🚀 Deploy Units</h2>

      {/* Faction */}
      <div>
        <label className="text-xs block mb-1" style={{ color: "var(--text-muted)" }}>Faction</label>
        <div className="flex gap-2">
          <button
            onClick={() => setFaction(FACTION.PEPE)}
            disabled={playerFaction > 0 && playerFaction !== FACTION.PEPE}
            className={`flex-1 py-2 rounded-lg font-bold text-sm transition-all
              ${activeFaction === FACTION.PEPE ? "bg-pepe text-white" : ""}
              disabled:opacity-30`}
            style={activeFaction !== FACTION.PEPE ? { backgroundColor: "var(--btn-inactive-bg)", color: "var(--btn-inactive-text)" } : undefined}
          >
            🐸 PEPE
          </button>
          <button
            onClick={() => setFaction(FACTION.SHIB)}
            disabled={playerFaction > 0 && playerFaction !== FACTION.SHIB}
            className={`flex-1 py-2 rounded-lg font-bold text-sm transition-all
              ${activeFaction === FACTION.SHIB ? "bg-shib text-white" : ""}
              disabled:opacity-30`}
            style={activeFaction !== FACTION.SHIB ? { backgroundColor: "var(--btn-inactive-bg)", color: "var(--btn-inactive-text)" } : undefined}
          >
            🐕 SHIB
          </button>
        </div>
        {playerFaction > 0 && (
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
            Faction locked for this season
          </p>
        )}
      </div>

      {/* Unit Type */}
      <div>
        <label className="text-xs block mb-1" style={{ color: "var(--text-muted)" }}>
          Unit Type <span style={{ color: "var(--text-muted)" }}>({RPS_CHART})</span>
        </label>
        <div className="grid grid-cols-3 gap-2">
          {[UNIT_TYPE.SWORDSMAN, UNIT_TYPE.SPEARMAN, UNIT_TYPE.CAVALRY].map(
            (ut) => (
              <button
                key={ut}
                onClick={() => setUnitType(ut)}
                className={`py-2 rounded-lg text-sm transition-all
                ${unitType === ut ? "bg-indigo-600 text-white" : ""}`}
                style={unitType !== ut ? { backgroundColor: "var(--btn-inactive-bg)", color: "var(--btn-inactive-text)" } : undefined}
              >
                {UNIT_EMOJI[ut]} {UNIT_LABELS[ut]}
              </button>
            )
          )}
        </div>
      </div>

      {/* Lane */}
      <div>
        <label className="text-xs block mb-1" style={{ color: "var(--text-muted)" }}>Lane</label>
        <div className="grid grid-cols-3 gap-2">
          {[0, 1, 2].map((l) => (
            <button
              key={l}
              onClick={() => setLaneId(l)}
              className={`py-2 rounded-lg text-sm transition-all
                ${laneId === l ? "bg-bastion text-white" : ""}`}
              style={laneId !== l ? { backgroundColor: "var(--btn-inactive-bg)", color: "var(--btn-inactive-text)" } : undefined}
            >
              Lane {l + 1}
            </button>
          ))}
        </div>
      </div>

      {/* Count */}
      <div>
        <label className="text-xs block mb-1" style={{ color: "var(--text-muted)" }}>Count</label>
        <input
          type="number"
          value={count}
          onChange={(e) => setCount(Math.max(1, Number(e.target.value)))}
          min={1}
          className="w-full border border-game-border rounded-lg px-3 py-2 text-sm font-mono"
          style={{ backgroundColor: "var(--input-bg)", color: "var(--text-primary)" }}
        />
      </div>

      {/* Price preview */}
      <div className="p-3 rounded-lg flex justify-between items-center" style={{ backgroundColor: "var(--panel-bg)" }}>
        <span className="text-sm" style={{ color: "var(--text-secondary)" }}>Estimated Cost</span>
        <span className="font-mono font-bold text-lg">
          {price ? formatUSDC(price) : "—"}
        </span>
      </div>

      {/* Actions */}
      {hasEnoughAllowance ? (
        <button
          onClick={handleDeploy}
          disabled={!price || isDeploying}
          className={`w-full py-3 rounded-lg font-bold ${activeFaction === FACTION.PEPE ? "btn-pepe" : "btn-shib"}`}
        >
          {isDeploying ? "Deploying..." : "Deploy ⚔️"}
        </button>
      ) : (
        <div className="flex gap-2">
          <button
            onClick={handleApprove}
            disabled={!price || isApproving}
            className="btn-neutral flex-1"
          >
            {isApproving ? "Approving..." : "1. Approve USDC"}
          </button>
          <button
            onClick={handleDeploy}
            disabled={!price || isDeploying || !hasEnoughAllowance}
            className={`flex-1 opacity-50 ${activeFaction === FACTION.PEPE ? "btn-pepe" : "btn-shib"}`}
          >
            2. Deploy ⚔️
          </button>
        </div>
      )}
    </div>
  );
}
