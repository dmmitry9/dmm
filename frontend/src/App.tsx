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
import BattleToast from "./components/BattleToast";
import Leaderboard from "./components/Leaderboard";
import { FACTION, WEATHER_INTERVAL } from "./lib/constants";
import { isMuted, toggleMute, playBattle, playWeatherChange, playSeasonEvent } from "./lib/sounds";
import {
  useGameState,
  useLaneScores,
  useLaneSquads,
  useBattleHistory,
  useTreasuryBreakdown,
  useUSDCBalance,
  usePendingRewards,
  usePlayerHoldScore,
  usePlayerLaneScores,
  useClaimableReward,
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
  const [soundMuted, setSoundMuted] = useState(isMuted());
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
  const history = useBattleHistory();
  const usdcBalance = useUSDCBalance(address);
  const treasuryBreakdown = useTreasuryBreakdown(gameState.seasonId);
  const pendingRewards = usePendingRewards(address);
  const claimInfo = useClaimableReward(gameState.seasonId, gameState.seasonActive, address);
  const playerHoldScore = usePlayerHoldScore(gameState.seasonId, address);
  const playerLaneScores = usePlayerLaneScores(gameState.seasonId, address);

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
  const [battleFlashLane, setBattleFlashLane] = useState<number | null>(null);
  const [toastData, setToastData] = useState<{ winner: number; laneId: number; survivors: number; earnings: string } | null>(null);
  const { writeContract: resolveBattle, data: resolveTx } = useWriteContract();
  const { isSuccess: resolveSuccess } = useWaitForTransactionReceipt({ hash: resolveTx });

  if (resolveSuccess && resolvingLane !== null) {
    const flashLane = resolvingLane;
    setResolvingLane(null);
    setBattleFlashLane(flashLane);
    playBattle();
    // Delayed refetch — let flash animation play
    setTimeout(() => {
      setBattleFlashLane(null);
      gameState.refetch();
      // Show toast from latest battle
      if (history.length > 0) {
        const latest = history[0];
        setToastData({
          winner: latest.winner,
          laneId: latest.laneId,
          survivors: Number(latest.totalSurvivors),
          earnings: `$${(Number(latest.winnerPot) / 1e6).toFixed(2)}`,
        });
      }
    }, 1200);
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

  // End season
  const [endingSeason, setEndingSeason] = useState(false);
  const { writeContract: endSeasonTx, data: endSeasonHash } = useWriteContract();
  const { isSuccess: endSeasonSuccess } = useWaitForTransactionReceipt({ hash: endSeasonHash });

  if (endSeasonSuccess && endingSeason) {
    setEndingSeason(false);
    gameState.refetch();
  }

  const handleEndSeason = () => {
    setEndingSeason(true);
    endSeasonTx({
      address: ADDRESSES.gameEngine,
      abi: GAME_ENGINE_ABI,
      functionName: "endSeason",
    });
  };

  // Start next season
  const [startingNextSeason, setStartingNextSeason] = useState(false);
  const { writeContract: startNextSeasonTx, data: startNextSeasonHash } = useWriteContract();
  const { isSuccess: startNextSeasonSuccess } = useWaitForTransactionReceipt({ hash: startNextSeasonHash });

  if (startNextSeasonSuccess && startingNextSeason) {
    setStartingNextSeason(false);
    gameState.refetch();
  }

  const handleStartNextSeason = () => {
    setStartingNextSeason(true);
    startNextSeasonTx({
      address: ADDRESSES.gameEngine,
      abi: GAME_ENGINE_ABI,
      functionName: "startNextSeason",
    });
  };

  // Refresh hold scores (all 3 lanes in one tx)
  const [refreshingScores, setRefreshingScores] = useState(false);
  const { writeContract: refreshAllLanes, data: refreshTx } = useWriteContract();
  const { isSuccess: refreshSuccess } = useWaitForTransactionReceipt({ hash: refreshTx });

  if (refreshSuccess && refreshingScores) {
    setRefreshingScores(false);
    gameState.refetch();
  }

  const handleRefreshScores = () => {
    setRefreshingScores(true);
    refreshAllLanes({
      address: ADDRESSES.gameEngine,
      abi: GAME_ENGINE_ABI,
      functionName: "refreshAllLanes",
    });
  };

  // Roll weather
  const [rollingWeather, setRollingWeather] = useState(false);
  const { writeContract: rollWeatherTx, data: weatherTx } = useWriteContract();
  const { isSuccess: weatherSuccess } = useWaitForTransactionReceipt({ hash: weatherTx });

  if (weatherSuccess && rollingWeather) {
    setRollingWeather(false);
    gameState.refetch();
    playWeatherChange();
  }

  const handleRollWeather = () => {
    setRollingWeather(true);
    rollWeatherTx({
      address: ADDRESSES.gameEngine,
      abi: GAME_ENGINE_ABI,
      functionName: "rollWeather",
    });
  };

  // Roll special event
  const [rollingEvent, setRollingEvent] = useState(false);
  const { writeContract: rollEventTx, data: eventTx } = useWriteContract();
  const { isSuccess: eventSuccess } = useWaitForTransactionReceipt({ hash: eventTx });

  if (eventSuccess && rollingEvent) {
    setRollingEvent(false);
    gameState.refetch();
    playSeasonEvent();
  }

  const handleRollEvent = () => {
    setRollingEvent(true);
    rollEventTx({
      address: ADDRESSES.gameEngine,
      abi: GAME_ENGINE_ABI,
      functionName: "rollSpecialEvent",
    });
  };

  // Cooldown checks
  const now = Math.floor(Date.now() / 1000);
  const weatherCooldownReady = gameState.weatherSetAt > 0
    ? now >= gameState.weatherSetAt + WEATHER_INTERVAL
    : true;
  const eventCooldownReady = gameState.specialEvent === 0 || now >= gameState.specialEventEndsAt;
  const seasonExpired = gameState.seasonActive && gameState.seasonStartTime
    ? now >= Number(gameState.seasonStartTime) + 20160
    : false;

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--game-bg)", color: "var(--text-primary)" }}>
      {/* Header */}
      <header className="border-b border-game-border px-3 sm:px-6 py-3 sm:py-4">
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
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => setSoundMuted(toggleMute())}
              className="text-xl hover:opacity-70 transition-opacity"
              title={soundMuted ? "Unmute sounds" : "Mute sounds"}
            >
              {soundMuted ? "🔇" : "🔊"}
            </button>
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
      <main className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-6 grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Left column: Map (2/3 width) */}
        <div className="lg:col-span-2 space-y-6">
          <GameMap
            lanes={laneData}
            laneSquads={laneSquads}
            weather={gameState.weather}
            specialEvent={gameState.specialEvent}
            specialEventEndsAt={gameState.specialEventEndsAt}
            weatherSetAt={gameState.weatherSetAt}
            address={address}
            onResolveBattle={handleResolveBattle}
            resolvingLane={resolvingLane}
            onRefreshScores={address ? handleRefreshScores : undefined}
            isRefreshingScores={refreshingScores}
            killPots={treasuryBreakdown.killPots}
            weatherCooldownReady={weatherCooldownReady}
            eventCooldownReady={eventCooldownReady}
            onRollWeather={address ? handleRollWeather : undefined}
            onRollSpecialEvent={address ? handleRollEvent : undefined}
            isRollingWeather={rollingWeather}
            isRollingEvent={rollingEvent}
            battleFlashLane={battleFlashLane}
          />

          {/* Game Info Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
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
              emoji="🦊"
            />
            <div className="card text-center">
              <span className="text-xs block" style={{ color: "var(--text-muted)" }}>RPS System</span>
              <div className="text-lg mt-1">⚔️ &gt; 🔱 &gt; 🐴 &gt; ⚔️</div>
              <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>1.8× advantage</span>
            </div>
          </div>

          <BattleLog history={history} />

          <Leaderboard seasonId={gameState.seasonId} currentPlayer={address} />

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
        <div className="space-y-4 sm:space-y-6">
          <SeasonInfo
            seasonId={gameState.seasonId}
            seasonActive={gameState.seasonActive}
            seasonStartTime={gameState.seasonStartTime}
            pendingRewards={pendingRewards}
            usdcBalance={usdcBalance}
            treasuryBreakdown={treasuryBreakdown}
            playerHoldScore={playerHoldScore}
            playerLaneScores={playerLaneScores}
            laneHoldScores={lanes}
            onEndSeason={address ? handleEndSeason : undefined}
            isEndingSeason={endingSeason}
            onStartNextSeason={address ? handleStartNextSeason : undefined}
            isStartingNextSeason={startingNextSeason}
            seasonExpired={seasonExpired}
            onDonated={() => gameState.refetch()}
          />

          {/* Collapsible on mobile */}
          <details className="lg:open" open>
            <summary className="lg:hidden cursor-pointer font-bold text-sm py-2 list-none flex items-center gap-2" style={{ color: "var(--text-secondary)" }}>
              🚀 Deploy Units <span className="text-xs" style={{ color: "var(--text-muted)" }}>▼</span>
            </summary>
            <DeployPanel
              seasonActive={gameState.seasonActive}
              totalPEPE={gameState.totalPEPE ?? 0n}
              totalSHIB={gameState.totalSHIB ?? 0n}
              onDeployed={() => gameState.refetch()}
            />
          </details>

          <details className="lg:open" open>
            <summary className="lg:hidden cursor-pointer font-bold text-sm py-2 list-none flex items-center gap-2" style={{ color: "var(--text-secondary)" }}>
              💎 Rewards <span className="text-xs" style={{ color: "var(--text-muted)" }}>▼</span>
            </summary>
            <RewardsPanel
              pendingRewards={pendingRewards}
              seasonId={gameState.seasonId}
              claimInfo={claimInfo}
            />
          </details>
        </div>
      </main>

      {/* Rules */}
      <section className="max-w-7xl mx-auto px-3 sm:px-6 pb-4 sm:pb-6">
        <div className="card space-y-2 text-sm" style={{ color: "var(--text-secondary)" }}>
          <h3 className="font-bold text-base" style={{ color: "var(--text-primary)" }}>📜 How It Works</h3>
          <p>🐸 <span className="text-pepe font-semibold">PEPE</span> vs <span className="text-shib font-semibold">SHIB</span> 🦊 — pick a side and recruit units for USDC.</p>
          <p>3 lanes, 3 unit types: ⚔️ &gt; 🔱 &gt; 🐎 &gt; ⚔️ (1.8× RPS bonus).</p>
          <p>Units march to the enemy bastion 🏰 in 3 minutes (30× speed).</p>
          <p>💰 70% of recruits → kill pot: win battles — claim the enemy&apos;s USDC.</p>
          <p>🏦 Hold the bastion — farm USDC every minute.</p>
          <p>🏆 Season ends after ~5.6h — hold score winners claim the season treasury.</p>
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

      {/* Battle result toast */}
      <BattleToast data={toastData} />
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
