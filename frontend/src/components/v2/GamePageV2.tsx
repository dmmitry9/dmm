import { useState } from "react";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { ADDRESSES, GAME_ENGINE_ABI } from "../../config/contracts";
import ConnectWallet from "../ConnectWallet";
import RewardsPanel from "../RewardsPanel";
import GameMapV2 from "./GameMapV2";
import SeasonInfoV2 from "./SeasonInfoV2";
import DeployPanelV2 from "./DeployPanelV2";
import BattleLogV2 from "./BattleLogV2";
import ToastSystem, { ConfettiBurst, useToast } from "./ToastSystem";
import OnboardingTour from "./OnboardingTour";
import { PixelSword, PixelPepe, PixelShib, PixelSwordsman, PixelSpearman, PixelCavalry, PixelTrident, PixelHorse, PixelRocket, PixelCoin } from "./PixelSprites";
import { FACTION, WEATHER_INTERVAL } from "../../lib/constants";
import type { HistoryRecord, TreasuryBreakdown, SegmentSquad } from "../../hooks/useGameState";
import "./v2.css";

interface GamePageV2Props {
  // Theme
  theme: "dark" | "light";
  toggleTheme: () => void;
  // Game state
  address?: `0x${string}`;
  seasonId: bigint | undefined;
  seasonActive: boolean | undefined;
  seasonStartTime: bigint | undefined;
  totalPEPE: bigint;
  totalSHIB: bigint;
  weather: number;
  specialEvent: number;
  specialEventEndsAt: number;
  weatherSetAt: number;
  effectivePEPE: number;
  effectiveSHIB: number;
  // Data
  laneData: { pepeScore: bigint; shibScore: bigint }[];
  lanes: { pepe: bigint; shib: bigint }[];
  laneSquads: SegmentSquad[][][];
  history: HistoryRecord[];
  usdcBalance: bigint | undefined;
  treasuryBreakdown: TreasuryBreakdown;
  pendingRewards: bigint | undefined;
  claimInfo: {
    claimSeasonId: bigint;
    claimable: bigint;
    alreadyClaimed: boolean;
    seasonFinalized: boolean;
    refetch: () => void;
  };
  playerHoldScore: bigint | undefined;
  playerLaneScores: bigint[];
  // Callbacks
  refetch: () => void;
}

export default function GamePageV2(props: GamePageV2Props) {
  const {
    theme, toggleTheme, address,
    seasonId, seasonActive, seasonStartTime, totalPEPE, totalSHIB,
    weather, specialEvent, specialEventEndsAt, weatherSetAt,
    effectivePEPE, effectiveSHIB,
    laneData, lanes, laneSquads, history,
    usdcBalance, treasuryBreakdown, pendingRewards, claimInfo,
    playerHoldScore, playerLaneScores,
    refetch,
  } = props;

  const { toast, showToast } = useToast();
  const [confettiActive, setConfettiActive] = useState(false);

  // ── Resolve battle ──
  const [resolvingLane, setResolvingLane] = useState<number | null>(null);
  const [battleFlashLane, setBattleFlashLane] = useState<number | null>(null);
  const [highlightLane, setHighlightLane] = useState<number | null>(null);
  const { writeContract: resolveBattle, data: resolveTx } = useWriteContract();
  const { isSuccess: resolveSuccess } = useWaitForTransactionReceipt({ hash: resolveTx });

  if (resolveSuccess && resolvingLane !== null) {
    const flashLane = resolvingLane;
    setResolvingLane(null);
    setBattleFlashLane(flashLane);
    setTimeout(() => {
      setBattleFlashLane(null);
      refetch();
      if (history.length > 0) {
        const latest = history[0];
        const isPepe = latest.winner === FACTION.PEPE;
        showToast({
          type: isPepe ? "battle-win" : "battle-loss",
          message: `${isPepe ? "PEPE" : "SHIB"} won Lane ${latest.laneId + 1}!`,
        });
      }
    }, 400);
  }

  const handleResolveBattle = (laneId: number) => {
    setResolvingLane(laneId);
    resolveBattle({ address: ADDRESSES.gameEngine, abi: GAME_ENGINE_ABI, functionName: "resolveBattle", args: [laneId] });
  };

  // ── End season ──
  const [endingSeason, setEndingSeason] = useState(false);
  const { writeContract: endSeasonTx, data: endSeasonHash } = useWriteContract();
  const { isSuccess: endSeasonSuccess } = useWaitForTransactionReceipt({ hash: endSeasonHash });
  if (endSeasonSuccess && endingSeason) { setEndingSeason(false); refetch(); }
  const handleEndSeason = () => { setEndingSeason(true); endSeasonTx({ address: ADDRESSES.gameEngine, abi: GAME_ENGINE_ABI, functionName: "endSeason" }); };

  // ── Start next season ──
  const [startingNextSeason, setStartingNextSeason] = useState(false);
  const { writeContract: startNextSeasonTx, data: startNextSeasonHash } = useWriteContract();
  const { isSuccess: startNextSeasonSuccess } = useWaitForTransactionReceipt({ hash: startNextSeasonHash });
  if (startNextSeasonSuccess && startingNextSeason) { setStartingNextSeason(false); refetch(); }
  const handleStartNextSeason = () => { setStartingNextSeason(true); startNextSeasonTx({ address: ADDRESSES.gameEngine, abi: GAME_ENGINE_ABI, functionName: "startNextSeason" }); };

  // ── Refresh hold scores ──
  const [refreshingScores, setRefreshingScores] = useState(false);
  const { writeContract: refreshAllLanes, data: refreshTx } = useWriteContract();
  const { isSuccess: refreshSuccess } = useWaitForTransactionReceipt({ hash: refreshTx });
  if (refreshSuccess && refreshingScores) { setRefreshingScores(false); refetch(); }
  const handleRefreshScores = () => { setRefreshingScores(true); refreshAllLanes({ address: ADDRESSES.gameEngine, abi: GAME_ENGINE_ABI, functionName: "refreshAllLanes" }); };

  // ── Roll weather ──
  const [rollingWeather, setRollingWeather] = useState(false);
  const { writeContract: rollWeatherTx, data: weatherTx } = useWriteContract();
  const { isSuccess: weatherSuccess } = useWaitForTransactionReceipt({ hash: weatherTx });
  if (weatherSuccess && rollingWeather) { setRollingWeather(false); refetch(); }
  const handleRollWeather = () => { setRollingWeather(true); rollWeatherTx({ address: ADDRESSES.gameEngine, abi: GAME_ENGINE_ABI, functionName: "rollWeather" }); };

  // ── Roll special event ──
  const [rollingEvent, setRollingEvent] = useState(false);
  const { writeContract: rollEventTx, data: eventTx } = useWriteContract();
  const { isSuccess: eventSuccess } = useWaitForTransactionReceipt({ hash: eventTx });
  if (eventSuccess && rollingEvent) { setRollingEvent(false); refetch(); }
  const handleRollEvent = () => { setRollingEvent(true); rollEventTx({ address: ADDRESSES.gameEngine, abi: GAME_ENGINE_ABI, functionName: "rollSpecialEvent" }); };

  // Cooldown checks
  const now = Math.floor(Date.now() / 1000);
  const weatherCooldownReady = weatherSetAt > 0 ? now >= weatherSetAt + WEATHER_INTERVAL : true;
  const eventCooldownReady = specialEvent === 0 || now >= specialEventEndsAt;
  const seasonExpired = seasonActive && seasonStartTime ? now >= Number(seasonStartTime) + 20160 : false;

  const handleConfetti = () => {
    setConfettiActive(true);
    showToast({ type: "deploy", message: "Your warriors are marching!" });
    setTimeout(() => setConfettiActive(false), 2500);
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--game-bg)", color: "var(--text-primary)" }}>
      {/* Header */}
      <header className="px-3 sm:px-6 py-3 sm:py-4" style={{ borderBottom: "3px solid var(--game-border)" }}>
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <PixelSword scale={3} />
            <div>
              <h1 className="pixel-heading text-sm tracking-tight">
                <span className="text-pepe">PEPE</span>
                {" vs "}
                <span className="text-shib">SHIB</span>
              </h1>
              <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                Pixel Battle Arena on Base
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <a
              href="#"
              className="text-[10px] px-2 py-1 hover:opacity-80 transition-opacity"
              style={{ color: "var(--text-muted)" }}
            >
              Classic View
            </a>
            <button
              onClick={toggleTheme}
              className="pixel-btn !px-2 !py-1 !text-[9px]"
            >
              {theme === "dark" ? "Light" : "Dark"}
            </button>
            <ConnectWallet />
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-6 grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Left column: Map + Info (2/3) */}
        <div className="lg:col-span-2 space-y-4" id="v2-map">
          <GameMapV2
            lanes={laneData}
            laneSquads={laneSquads}
            weather={weather}
            specialEvent={specialEvent}
            specialEventEndsAt={specialEventEndsAt}
            weatherSetAt={weatherSetAt}
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
            battleFlashLane={battleFlashLane ?? highlightLane}
          />

          {/* Forces + RPS */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
            <div className="pixel-card text-center">
              <span className="text-[10px] block" style={{ color: "var(--text-muted)" }}>PEPE Forces</span>
              <div className="flex items-center justify-center gap-1 mt-1">
                <PixelPepe scale={1.5} />
                <span className="text-2xl font-bold text-pepe">{effectivePEPE}</span>
              </div>
            </div>
            <div className="pixel-card text-center">
              <span className="text-[10px] block" style={{ color: "var(--text-muted)" }}>SHIB Forces</span>
              <div className="flex items-center justify-center gap-1 mt-1">
                <PixelShib scale={1.5} />
                <span className="text-2xl font-bold text-shib">{effectiveSHIB}</span>
              </div>
            </div>
            <div className="pixel-card text-center">
              <span className="text-[10px] block" style={{ color: "var(--text-muted)" }}>RPS System</span>
              <div className="flex items-center justify-center gap-1 mt-1">
                <PixelSword scale={1.5} />
                <span className="text-[10px]">&gt;</span>
                <PixelTrident scale={1.5} />
                <span className="text-[10px]">&gt;</span>
                <PixelHorse scale={1.5} />
                <span className="text-[10px]">&gt;</span>
                <PixelSword scale={1.5} />
              </div>
              <span className="text-[9px]" style={{ color: "var(--text-muted)" }}>1.8x advantage</span>
            </div>
          </div>

          <BattleLogV2
            history={history}
            onHighlightLane={(laneId) => {
              setHighlightLane(laneId);
              setTimeout(() => setHighlightLane(null), 1200);
            }}
          />

          {/* Spectator notice */}
          {!address && (
            <div className="pixel-card text-center py-6 space-y-2">
              <div className="flex justify-center gap-4">
                <PixelSwordsman faction="pepe" scale={2} />
                <PixelSpearman faction="shib" scale={2} />
                <PixelCavalry faction="pepe" scale={2} />
              </div>
              <p className="pixel-heading text-[9px]" style={{ color: "var(--text-secondary)" }}>
                Spectator Mode
              </p>
              <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                Connect your wallet to join the battle
              </p>
            </div>
          )}
        </div>

        {/* Right column: Controls (1/3) */}
        <div className="space-y-4 sm:space-y-6">
          <div id="v2-season">
            <SeasonInfoV2
              seasonId={seasonId}
              seasonActive={seasonActive}
              seasonStartTime={seasonStartTime}
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
              onDonated={() => refetch()}
            />
          </div>

          <details className="lg:open" open>
            <summary className="lg:hidden cursor-pointer font-bold text-sm py-2 list-none flex items-center gap-2 pixel-heading text-[10px]" style={{ color: "var(--text-secondary)" }}>
              <PixelRocket scale={1.5} /> Deploy Units
            </summary>
            <div id="v2-deploy">
              <DeployPanelV2
                seasonActive={seasonActive}
                totalPEPE={totalPEPE}
                totalSHIB={totalSHIB}
                onDeployed={() => refetch()}
                onConfetti={handleConfetti}
              />
            </div>
          </details>

          <details className="lg:open" open>
            <summary className="lg:hidden cursor-pointer font-bold text-sm py-2 list-none flex items-center gap-2 pixel-heading text-[10px]" style={{ color: "var(--text-secondary)" }}>
              <PixelCoin scale={1.5} /> Rewards
            </summary>
            <div id="v2-rewards">
              <RewardsPanel
                pendingRewards={pendingRewards}
                seasonId={seasonId}
                claimInfo={claimInfo}
              />
            </div>
          </details>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-4 text-center text-[10px]" style={{ borderTop: "3px solid var(--game-border)", color: "var(--text-muted)" }}>
        <span className="pixel-heading text-[8px]">PEPE vs SHIB</span> — Pixel Battle Arena on Base L2
      </footer>

      {/* Overlays */}
      <ToastSystem toast={toast} />
      <ConfettiBurst active={confettiActive} />
      <OnboardingTour />
    </div>
  );
}
