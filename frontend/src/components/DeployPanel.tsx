import { useState } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
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

  const { writeContract: approve, data: approveTx } = useWriteContract();
  const { writeContract: deploy, data: deployTx } = useWriteContract();

  const { isLoading: isApproving } = useWaitForTransactionReceipt({
    hash: approveTx,
  });
  const { isLoading: isDeploying, isSuccess } = useWaitForTransactionReceipt({
    hash: deployTx,
  });

  if (isSuccess) {
    onDeployed();
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
      <div className="card text-center text-gray-500 py-8">
        Connect wallet to deploy units
      </div>
    );
  }

  if (!seasonActive) {
    return (
      <div className="card text-center text-gray-500 py-8">
        No active season
      </div>
    );
  }

  return (
    <div className="card space-y-4">
      <h2 className="text-lg font-bold">🚀 Deploy Units</h2>

      {/* Faction */}
      <div>
        <label className="text-xs text-gray-500 block mb-1">Faction</label>
        <div className="flex gap-2">
          <button
            onClick={() => setFaction(FACTION.PEPE)}
            disabled={playerFaction > 0 && playerFaction !== FACTION.PEPE}
            className={`flex-1 py-2 rounded-lg font-bold text-sm transition-all
              ${activeFaction === FACTION.PEPE ? "bg-pepe text-white" : "bg-gray-800 text-gray-400"}
              disabled:opacity-30`}
          >
            🐸 PEPE
          </button>
          <button
            onClick={() => setFaction(FACTION.SHIB)}
            disabled={playerFaction > 0 && playerFaction !== FACTION.SHIB}
            className={`flex-1 py-2 rounded-lg font-bold text-sm transition-all
              ${activeFaction === FACTION.SHIB ? "bg-shib text-white" : "bg-gray-800 text-gray-400"}
              disabled:opacity-30`}
          >
            🐕 SHIB
          </button>
        </div>
        {playerFaction > 0 && (
          <p className="text-xs text-gray-500 mt-1">
            Faction locked for this season
          </p>
        )}
      </div>

      {/* Unit Type */}
      <div>
        <label className="text-xs text-gray-500 block mb-1">
          Unit Type <span className="text-gray-600">({RPS_CHART})</span>
        </label>
        <div className="grid grid-cols-3 gap-2">
          {[UNIT_TYPE.SWORDSMAN, UNIT_TYPE.SPEARMAN, UNIT_TYPE.CAVALRY].map(
            (ut) => (
              <button
                key={ut}
                onClick={() => setUnitType(ut)}
                className={`py-2 rounded-lg text-sm transition-all
                ${unitType === ut ? "bg-indigo-600 text-white" : "bg-gray-800 text-gray-400"}`}
              >
                {UNIT_EMOJI[ut]} {UNIT_LABELS[ut]}
              </button>
            )
          )}
        </div>
      </div>

      {/* Lane */}
      <div>
        <label className="text-xs text-gray-500 block mb-1">Lane</label>
        <div className="grid grid-cols-3 gap-2">
          {[0, 1, 2].map((l) => (
            <button
              key={l}
              onClick={() => setLaneId(l)}
              className={`py-2 rounded-lg text-sm transition-all
                ${laneId === l ? "bg-bastion text-white" : "bg-gray-800 text-gray-400"}`}
            >
              Lane {l + 1}
            </button>
          ))}
        </div>
      </div>

      {/* Count */}
      <div>
        <label className="text-xs text-gray-500 block mb-1">Count</label>
        <input
          type="number"
          value={count}
          onChange={(e) => setCount(Math.max(1, Number(e.target.value)))}
          min={1}
          className="w-full bg-gray-800 border border-game-border rounded-lg px-3 py-2 text-sm font-mono"
        />
      </div>

      {/* Price preview */}
      <div className="p-3 rounded-lg bg-gray-800/50 flex justify-between items-center">
        <span className="text-sm text-gray-400">Estimated Cost</span>
        <span className="font-mono font-bold text-lg">
          {price ? formatUSDC(price) : "—"}
        </span>
      </div>

      {/* Actions */}
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
          disabled={!price || isDeploying}
          className={`flex-1 ${activeFaction === FACTION.PEPE ? "btn-pepe" : "btn-shib"}`}
        >
          {isDeploying ? "Deploying..." : "2. Deploy ⚔️"}
        </button>
      </div>
    </div>
  );
}
