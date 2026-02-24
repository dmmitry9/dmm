import { useAccount } from "wagmi";
import ConnectWallet from "./components/ConnectWallet";
import GameMap from "./components/GameMap";
import SeasonInfo from "./components/SeasonInfo";
import DeployPanel from "./components/DeployPanel";
import RewardsPanel from "./components/RewardsPanel";
import {
  useGameState,
  useLaneScores,
  useUSDCBalance,
  usePendingRewards,
} from "./hooks/useGameState";

export default function App() {
  const { address } = useAccount();
  const gameState = useGameState();
  const { lanes } = useLaneScores();
  const usdcBalance = useUSDCBalance(address);
  const pendingRewards = usePendingRewards(address);

  const laneData = lanes.map((l) => ({
    pepeScore: l.pepe,
    shibScore: l.shib,
  }));

  return (
    <div className="min-h-screen bg-game-bg">
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
              <p className="text-xs text-gray-500">
                Strategic Battle Arena on Base
              </p>
            </div>
          </div>
          <ConnectWallet />
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-6 py-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Map (2/3 width) */}
        <div className="lg:col-span-2 space-y-6">
          <GameMap
            lanes={laneData}
            weather={gameState.weather}
            specialEvent={gameState.specialEvent}
          />

          {/* Game Info Bar */}
          <div className="grid grid-cols-3 gap-3">
            <ForcesCard
              label="PEPE Forces"
              count={gameState.totalPEPE}
              color="pepe"
              emoji="🐸"
            />
            <ForcesCard
              label="SHIB Forces"
              count={gameState.totalSHIB}
              color="shib"
              emoji="🐕"
            />
            <div className="card text-center">
              <span className="text-xs text-gray-500 block">RPS System</span>
              <div className="text-lg mt-1">⚔️ &gt; 🏹 &gt; 🐴 &gt; ⚔️</div>
              <span className="text-[10px] text-gray-600">1.5× advantage</span>
            </div>
          </div>

          {/* Spectator notice */}
          {!address && (
            <div className="card text-center py-6 space-y-2">
              <p className="text-gray-400">
                👀 You are watching as a spectator
              </p>
              <p className="text-xs text-gray-600">
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

      {/* Footer */}
      <footer className="border-t border-game-border px-6 py-4 text-center text-xs text-gray-600">
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
  count: bigint | undefined;
  color: string;
  emoji: string;
}) {
  return (
    <div className="card text-center">
      <span className="text-xs text-gray-500 block">{label}</span>
      <div className={`text-2xl font-bold text-${color} mt-1`}>
        {emoji} {count?.toString() ?? "0"}
      </div>
    </div>
  );
}
