import { useState } from "react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { ADDRESSES, GAME_ENGINE_ABI, ERC20_ABI } from "../../config/contracts";
import { useUnitPrice, usePlayerFaction } from "../../hooks/useGameState";
import { FACTION, formatUSDC } from "../../lib/constants";
import {
  PixelRocket, PixelSwordsman, PixelSpearman, PixelCavalry,
  PixelShield, PixelSword, PixelTrident, PixelHorse,
  PixelPepe, PixelShib, PixelCoin,
} from "./PixelSprites";

interface DeployPanelV2Props {
  seasonActive: boolean | undefined;
  totalPEPE: bigint;
  totalSHIB: bigint;
  onDeployed: () => void;
  onConfetti?: () => void;
}

const PRESETS = [
  { label: "Balanced", icon: "shield", sword: 34, spear: 33, cav: 33 },
  { label: "Swords", icon: "sword", sword: 100, spear: 0, cav: 0 },
  { label: "Spears", icon: "trident", sword: 0, spear: 100, cav: 0 },
  { label: "Cavalry", icon: "horse", sword: 0, spear: 0, cav: 100 },
] as const;

function PresetIcon({ type }: { type: string }) {
  switch (type) {
    case "shield": return <PixelShield scale={1.5} />;
    case "sword": return <PixelSword scale={1.5} />;
    case "trident": return <PixelTrident scale={1.5} />;
    case "horse": return <PixelHorse scale={1.5} />;
    default: return null;
  }
}

export default function DeployPanelV2({
  seasonActive,
  totalPEPE,
  totalSHIB,
  onDeployed,
  onConfetti,
}: DeployPanelV2Props) {
  const { address } = useAccount();
  const playerFaction = usePlayerFaction(address);

  const [faction, setFaction] = useState<number>(FACTION.PEPE);
  const [laneId, setLaneId] = useState<number>(0);
  const [swordsmanCount, setSwordsmanCount] = useState<number>(0);
  const [spearmanCount, setSpearmanCount] = useState<number>(0);
  const [cavalryCount, setCavalryCount] = useState<number>(0);

  const activeFaction = playerFaction > 0 ? playerFaction : faction;
  const factionKey = activeFaction === FACTION.PEPE ? "pepe" : "shib";

  const totalCount = swordsmanCount + spearmanCount + cavalryCount;
  const price = useUnitPrice(activeFaction, totalCount, totalPEPE, totalSHIB);

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

  const { isLoading: isApproving, isSuccess: approveSuccess } = useWaitForTransactionReceipt({ hash: approveTx });
  const { isLoading: isDeploying, isSuccess } = useWaitForTransactionReceipt({ hash: deployTx });

  if (approveSuccess) refetchAllowance();
  if (isSuccess) {
    onDeployed();
    refetchAllowance();
    onConfetti?.();
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
      functionName: "deployMixedUnits",
      args: [laneId, activeFaction, swordsmanCount, spearmanCount, cavalryCount],
    });
  };

  const applyPreset = (preset: typeof PRESETS[number]) => {
    setSwordsmanCount(preset.sword);
    setSpearmanCount(preset.spear);
    setCavalryCount(preset.cav);
  };

  if (!address) {
    return (
      <div className="pixel-card text-center py-6">
        <p className="pixel-heading text-[9px]" style={{ color: "var(--text-muted)" }}>
          Connect wallet to deploy
        </p>
      </div>
    );
  }

  if (!seasonActive) {
    return (
      <div className="pixel-card text-center py-6">
        <p className="pixel-heading text-[9px]" style={{ color: "var(--text-muted)" }}>
          No active season
        </p>
      </div>
    );
  }

  return (
    <div className="pixel-card space-y-4">
      <h2 className="pixel-heading text-xs flex items-center gap-2">
        <PixelRocket scale={2} />
        <span>Send your troops!</span>
      </h2>

      {/* Faction */}
      <div>
        <label className="text-[10px] block mb-1" style={{ color: "var(--text-muted)" }}>Choose your side</label>
        <div className="flex gap-2">
          <button
            onClick={() => setFaction(FACTION.PEPE)}
            disabled={playerFaction > 0 && playerFaction !== FACTION.PEPE}
            className={`pixel-btn flex-1 flex items-center justify-center gap-2 !text-[9px] ${activeFaction === FACTION.PEPE ? "pixel-btn-pepe" : ""}`}
          >
            <PixelPepe scale={1.5} /> PEPE
          </button>
          <button
            onClick={() => setFaction(FACTION.SHIB)}
            disabled={playerFaction > 0 && playerFaction !== FACTION.SHIB}
            className={`pixel-btn flex-1 flex items-center justify-center gap-2 !text-[9px] ${activeFaction === FACTION.SHIB ? "pixel-btn-shib" : ""}`}
          >
            <PixelShib scale={1.5} /> SHIB
          </button>
        </div>
        {playerFaction > 0 && (
          <p className="text-[10px] mt-1" style={{ color: "var(--text-muted)" }}>
            Faction locked this season
          </p>
        )}
      </div>

      {/* Presets */}
      <div>
        <label className="text-[10px] block mb-1" style={{ color: "var(--text-muted)" }}>Quick presets</label>
        <div className="grid grid-cols-4 gap-1">
          {PRESETS.map((p) => (
            <button
              key={p.label}
              onClick={() => applyPreset(p)}
              className="pixel-btn !px-1 !py-2 flex flex-col items-center gap-1 !text-[7px]"
            >
              <PresetIcon type={p.icon} />
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Unit Composition */}
      <div>
        <label className="text-[10px] block mb-1" style={{ color: "var(--text-muted)" }}>
          Unit Composition
        </label>
        <div className="space-y-2">
          {/* Swordsman */}
          <div className="flex items-center gap-2">
            <span className="shrink-0"><PixelSwordsman faction={factionKey} scale={1.5} /></span>
            <span className="w-20 text-[10px]" style={{ color: "var(--text-secondary)" }}>Swordsman</span>
            <input
              type="number"
              value={swordsmanCount}
              onChange={(e) => setSwordsmanCount(Math.max(0, Math.floor(Number(e.target.value) || 0)))}
              min={0}
              className="pixel-input flex-1 text-sm"
            />
            <span className="text-[8px] w-24" style={{ color: "var(--text-muted)" }}>
              beats <span style={{ display: "inline-flex", verticalAlign: "middle" }}><PixelTrident scale={1} /></span>
            </span>
          </div>

          {/* Spearman */}
          <div className="flex items-center gap-2">
            <span className="shrink-0"><PixelSpearman faction={factionKey} scale={1.5} /></span>
            <span className="w-20 text-[10px]" style={{ color: "var(--text-secondary)" }}>Spearman</span>
            <input
              type="number"
              value={spearmanCount}
              onChange={(e) => setSpearmanCount(Math.max(0, Math.floor(Number(e.target.value) || 0)))}
              min={0}
              className="pixel-input flex-1 text-sm"
            />
            <span className="text-[8px] w-24" style={{ color: "var(--text-muted)" }}>
              beats <span style={{ display: "inline-flex", verticalAlign: "middle" }}><PixelHorse scale={1} /></span>
            </span>
          </div>

          {/* Cavalry */}
          <div className="flex items-center gap-2">
            <span className="shrink-0"><PixelCavalry faction={factionKey} scale={1.5} /></span>
            <span className="w-20 text-[10px]" style={{ color: "var(--text-secondary)" }}>Cavalry</span>
            <input
              type="number"
              value={cavalryCount}
              onChange={(e) => setCavalryCount(Math.max(0, Math.floor(Number(e.target.value) || 0)))}
              min={0}
              className="pixel-input flex-1 text-sm"
            />
            <span className="text-[8px] w-24" style={{ color: "var(--text-muted)" }}>
              beats <span style={{ display: "inline-flex", verticalAlign: "middle" }}><PixelSword scale={1} /></span>
            </span>
          </div>
        </div>
        {totalCount > 0 && (
          <p className="text-[10px] mt-1 text-right" style={{ color: "var(--text-muted)" }}>
            Total: {totalCount} units
          </p>
        )}
      </div>

      {/* Lane */}
      <div>
        <label className="text-[10px] block mb-1" style={{ color: "var(--text-muted)" }}>Target Lane</label>
        <div className="grid grid-cols-3 gap-2">
          {[0, 1, 2].map((l) => (
            <button
              key={l}
              onClick={() => setLaneId(l)}
              className={`pixel-btn !text-[9px] ${laneId === l ? "!border-bastion" : ""}`}
              style={laneId === l ? { backgroundColor: "#8B5CF6", color: "#fff", boxShadow: "3px 3px 0 #5b21b6" } : undefined}
            >
              Lane {l + 1}
            </button>
          ))}
        </div>
      </div>

      {/* Price preview */}
      <div className="pixel-badge w-full flex justify-between items-center py-2 px-3">
        <span className="text-[10px] flex items-center gap-1" style={{ color: "var(--text-secondary)" }}>
          <PixelCoin scale={1.5} /> Cost
        </span>
        <span className="font-mono font-bold text-lg">
          {price ? formatUSDC(price) : "—"}
        </span>
      </div>

      {/* Actions */}
      {hasEnoughAllowance ? (
        <button
          onClick={handleDeploy}
          disabled={!price || isDeploying || totalCount === 0}
          className={`pixel-btn w-full !py-3 !text-[10px] ${activeFaction === FACTION.PEPE ? "pixel-btn-pepe" : "pixel-btn-shib"}`}
        >
          {isDeploying ? "Deploying..." : "March to glory!"}
        </button>
      ) : (
        <div className="flex gap-2">
          <button
            onClick={handleApprove}
            disabled={!price || isApproving}
            className="pixel-btn flex-1 !text-[9px]"
          >
            {isApproving ? "Approving..." : "1. Approve"}
          </button>
          <button
            onClick={handleDeploy}
            disabled={!price || isDeploying || !hasEnoughAllowance || totalCount === 0}
            className={`pixel-btn flex-1 !text-[9px] opacity-50 ${activeFaction === FACTION.PEPE ? "pixel-btn-pepe" : "pixel-btn-shib"}`}
          >
            2. Deploy
          </button>
        </div>
      )}

      <p className="text-[9px] text-center" style={{ color: "var(--text-muted)" }}>
        Troops arrive in ~3 min
      </p>
    </div>
  );
}
