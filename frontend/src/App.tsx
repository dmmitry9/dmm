import { useState, useEffect } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { ADDRESSES, GAME_ENGINE_ABI } from "./config/contracts";
import ConnectWallet from "./components/ConnectWallet";
import GameMap from "./components/GameMap";
import SeasonInfo from "./components/SeasonInfo";
import DeployPanel from "./components/DeployPanel";
import RewardsPanel from "./components/RewardsPanel";
import RulesPage from "./components/RulesPage";
import BattleLog from "./components/BattleLog";
import { FACTION } from "./lib/constants";
import {
  useGameState,
  useLaneScores,
  useLaneSquads,
  useBattleHistory,
  useTreasuryBreakdown,
  useUSDCBalance,
  usePendingRewards,
} from "./hooks/useGameState";

function useTheme() {
  const [theme, setTheme] = useState<"dark" | "light">(
    () => (localStorage.getItem("theme") as "dark" | "light") || "dark"
  );
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);
  const toggle = () => setTheme((t) => (t === "dark" ? "light" : "dark"));
  return { theme, toggle };
}

export default function App() {
  const { theme, toggle: toggleTheme } = useTheme();
  const [showRules, setShowRules] = useState(window.location.hash === "#rules");

  useEffect(() => {
    const onHash = () => setShowRules(window.location.hash === "#rules");
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  if (showRules) {
    return (
      <RulesPage
        onBack={() => {
          window.location.hash = "";
          setShowRules(false);
        }}
      />
    );
  }
  const { address } = useAccount();
  const gameState = useGameState();
  const { lanes } = useLaneScores();
  const laneSquads = useLaneSquads();
  const battleHistory = useBattleHistory();
  const usdcBalance = useUSDCBalance(address);
  const treasuryBreakdown = useTreasuryBreakdown(gameState.seasonId);
  const pendingRewards = usePendingRewards(address);

  const laneData = lanes.map((l) => ({
    pepeScore: l.pepe,
    shibScore: l.shib,
  }));

  // Compute effective unit totals from squad data (not stale contract counters)
  const effectivePEPE = laneSquads.flat(2)
    .filter(s => s.faction === FACTION.PEPE)
    .reduce((sum, s) => sum + s.effectiveUnits, 0);
  const effectiveSHIB = laneSquads.flat(2)
    .filter(s => s.faction === FACTION.SHIB)
    .reduce((sum, s) => sum + s.effectiveUnits, 0);

  // Resolve battle
  const [resolvingLane, setResolvingLane] = useState<number | null>(null);
  const { writeContract: resolveBattle, data: resolveTx } = useWriteContract();
  const { isSuccess: resolveSuccess } = useWaitForTransactionReceipt({ hash: resolveTx });

  if (resolveSuccess && resolvingLane !== null) {
    setResolvingLane(null);
    gameState.refetch();
  }

  const handleResolveBattle = (laneId: number) => {
    setResolvingLane(laneId);
    resolveBattle({
      address: ADDRESSES.gameEngine,
      abi: GAME_ENGINE_ABI,
      functionName: "resolveBattle",
      args: [laneId],
    });
  };

  // Arrive squads at bastion
  const [arrivingSquadId, setArrivingSquadId] = useState<number | null>(null);
  const { writeContract: arriveSquad, data: arriveTx } = useWriteContract();
  const { isSuccess: arriveSuccess } = useWaitForTransactionReceipt({ hash: arriveTx });

  if (arriveSuccess && arrivingSquadId !== null) {
    setArrivingSquadId(null);
    gameState.refetch();
  }

  const handleArriveSquad = (squadId: number) => {
    setArrivingSquadId(squadId);
    arriveSquad({
      address: ADDRESSES.gameEngine,
      abi: GAME_ENGINE_ABI,
      functionName: "arrive",
      args: [BigInt(squadId)],
    });
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--game-bg)", color: "var(--text-primary)" }}>
      {/* Header */}
      <header className="border-b border-game-border px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚔️</span>
            <div>
              <h1 className="text-xl font-bold tracking-tight">
                <span className="text-pepe">PEPE</span>
                {" vs "}
                <span className="text-shib">SHIB</span>
              </h1>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                Strategic Battle Arena on Base
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className="text-xl hover:opacity-70 transition-opacity"
              title={theme === "dark" ? "Switch to light" : "Switch to dark"}
            >
              {theme === "dark" ? "☀️" : "🌙"}
            </button>
            <ConnectWallet />
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-6 py-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Map (2/3 width) */}
        <div className="lg:col-span-2 space-y-6">
          <GameMap
            lanes={laneData}
            laneSquads={laneSquads}
            weather={gameState.weather}
            specialEvent={gameState.specialEvent}
            onResolveBattle={handleResolveBattle}
            resolvingLane={resolvingLane}
            onArriveSquad={handleArriveSquad}
            arrivingSquadId={arrivingSquadId}
          />

          {/* Game Info Bar */}
          <div className="grid grid-cols-3 gap-3">
            <ForcesCard
              label="PEPE Forces"
              count={effectivePEPE}
              color="pepe"
              emoji="🐸"
            />
            <ForcesCard
              label="SHIB Forces"
              count={effectiveSHIB}
              color="shib"
              emoji="🐕"
            />
            <div className="card text-center">
              <span className="text-xs block" style={{ color: "var(--text-muted)" }}>RPS System</span>
              <div className="text-lg mt-1">⚔️ &gt; 🔱 &gt; 🐴 &gt; ⚔️</div>
              <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>1.5× advantage</span>
            </div>
          </div>

          <BattleLog battles={battleHistory} />

          {/* Spectator notice */}
          {!address && (
            <div className="card text-center py-6 space-y-2">
              <p style={{ color: "var(--text-secondary)" }}>
                👀 You are watching as a spectator
              </p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                Connect your wallet to deploy units and join the battle
              </p>
            </div>
          )}
        </div>

        {/* Right column: Controls (1/3 width) */}
        <div className="space-y-6">
          <SeasonInfo
            seasonId={gameState.seasonId}
            seasonActive={gameState.seasonActive}
            seasonStartTime={gameState.seasonStartTime}
            totalPEPE={gameState.totalPEPE}
            totalSHIB={gameState.totalSHIB}
            weather={gameState.weather}
            specialEvent={gameState.specialEvent}
            specialEventEndsAt={gameState.specialEventEndsAt}
            pendingRewards={pendingRewards}
            usdcBalance={usdcBalance}
            treasuryBreakdown={treasuryBreakdown}
          />

          <DeployPanel
            seasonActive={gameState.seasonActive}
            totalPEPE={gameState.totalPEPE ?? 0n}
            totalSHIB={gameState.totalSHIB ?? 0n}
            onDeployed={() => gameState.refetch()}
          />

          <RewardsPanel
            pendingRewards={pendingRewards}
            seasonId={gameState.seasonId}
          />
        </div>
      </main>

      {/* Rules */}
      <section className="max-w-7xl mx-auto px-6 pb-6">
        <div className="card space-y-2 text-sm" style={{ color: "var(--text-secondary)" }}>
          <h3 className="font-bold text-base" style={{ color: "var(--text-primary)" }}>📜 How It Works</h3>
          <p>🐸 <span className="text-pepe font-semibold">PEPE</span> vs <span className="text-shib font-semibold">SHIB</span> 🐕 — pick a side and recruit units for USDC.</p>
          <p>3 lanes, 3 unit types: ⚔️ &gt; 🔱 &gt; 🐎 &gt; ⚔️ (1.5× RPS bonus).</p>
          <p>Units march to the enemy bastion 🏰 in 90 minutes.</p>
          <p>💰 70% of recruits → kill pot: win battles — claim the enemy&apos;s USDC.</p>
          <p>🏦 Hold the bastion — farm USDC every minute.</p>
          <p>🏆 Top 3 players of the winning faction receive a Season NFT at the end of each season (7 days).</p>
          <a
            href="#rules"
            className="inline-block mt-2 text-pepe hover:text-pepe/80 font-semibold transition-colors"
          >
            📖 Full Rules & Mechanics →
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-game-border px-6 py-4 text-center text-xs" style={{ color: "var(--text-muted)" }}>
        PEPE vs SHIB Battle Arena — Built on Base L2 — USDC Economy
      </footer>
    </div>
  );
}

function ForcesCard({
  label,
  count,
  color,
  emoji,
}: {
  label: string;
  count: number;
  color: string;
  emoji: string;
}) {
  return (
    <div className="card text-center">
      <span className="text-xs block" style={{ color: "var(--text-muted)" }}>{label}</span>
      <div className={`text-2xl font-bold text-${color} mt-1`}>
        {emoji} {count}
      </div>
    </div>
  );
}
