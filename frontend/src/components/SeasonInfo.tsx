import { useState, useEffect } from "react";
import type { TreasuryBreakdown } from "../hooks/useGameState";
import {
  WEATHER_LABELS,
  WEATHER_EMOJI,
  WEATHER_BONUS_UNIT,
  EVENT_LABELS,
  EVENT_EMOJI,
  EVENT_DESCRIPTION,
  SEASON_DURATION,
  WEATHER_INTERVAL,
  formatTimeRemaining,
  formatUSDC,
  formatTime,
} from "../lib/constants";

interface SeasonInfoProps {
  seasonId: bigint | undefined;
  seasonActive: boolean | undefined;
  seasonStartTime: bigint | undefined;
  totalPEPE: bigint | undefined;
  totalSHIB: bigint | undefined;
  weather: number;
  specialEvent: number;
  specialEventEndsAt: number;
  weatherSetAt: number;
  pendingRewards: bigint | undefined;
  usdcBalance: bigint | undefined;
  treasuryBreakdown: TreasuryBreakdown;
  weatherCooldownReady: boolean;
  eventCooldownReady: boolean;
  onRollWeather?: () => void;
  onRollSpecialEvent?: () => void;
  isRollingWeather?: boolean;
  isRollingEvent?: boolean;
  playerHoldScore?: bigint;
  playerLaneScores?: bigint[];
  laneHoldScores?: { pepe: bigint; shib: bigint }[];
  onEndSeason?: () => void;
  isEndingSeason?: boolean;
  onStartNextSeason?: () => void;
  isStartingNextSeason?: boolean;
  seasonExpired?: boolean;
}

export default function SeasonInfo({
  seasonId,
  seasonActive,
  seasonStartTime,
  totalPEPE,
  totalSHIB,
  weather,
  specialEvent,
  specialEventEndsAt,
  weatherSetAt,
  pendingRewards,
  usdcBalance,
  treasuryBreakdown,
  weatherCooldownReady,
  eventCooldownReady,
  onRollWeather,
  onRollSpecialEvent,
  isRollingWeather,
  isRollingEvent,
  playerHoldScore,
  playerLaneScores,
  laneHoldScores,
  onEndSeason,
  isEndingSeason,
  onStartNextSeason,
  isStartingNextSeason,
  seasonExpired,
}: SeasonInfoProps) {
  const seasonEnd = seasonStartTime
    ? Number(seasonStartTime) + SEASON_DURATION
    : 0;

  const totalKillPot = treasuryBreakdown.killPots.reduce(
    (sum, lp) => sum + lp.pepe + lp.shib,
    0n
  );

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
          <span className="block text-xs" style={{ color: "var(--text-muted)" }}>Status</span>
          <span className="font-bold" style={{ color: seasonActive ? "var(--accent-green)" : "var(--accent-red)" }}>
            {seasonActive ? "🟢 Active" : "🔴 Inactive"}
          </span>
        </div>
        <div>
          <span className="block text-xs" style={{ color: "var(--text-muted)" }}>Time Left</span>
          <span className="font-mono">
            {seasonEnd > 0 ? formatTimeRemaining(seasonEnd) : "—"}
          </span>
        </div>
        <div>
          <span className="block text-xs" style={{ color: "var(--text-muted)" }}>Forces</span>
          <span>
            <span className="text-pepe">{totalPEPE?.toString() ?? "0"}</span>
            {" vs "}
            <span className="text-shib">{totalSHIB?.toString() ?? "0"}</span>
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

      {/* Treasury Breakdown */}
      <div className="p-3 rounded-lg space-y-2" style={{ backgroundColor: "var(--treasury-bg)", border: "1px solid var(--treasury-border)" }}>
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold" style={{ color: "var(--accent-yellow-bold)" }}>💰 Treasury</span>
          <span className="font-mono text-xs" style={{ color: "var(--accent-yellow)" }}>
            Season Pool: {formatUSDC(treasuryBreakdown.seasonTreasury)}
          </span>
        </div>

        {/* Kill Pots per lane */}
        <div className="space-y-1">
          <span className="text-[10px] uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Kill Pots</span>
          {treasuryBreakdown.killPots.map((lp, i) => (
            <div key={i} className="flex items-center justify-between text-xs">
              <span style={{ color: "var(--text-secondary)" }}>Lane {i + 1}</span>
              <span className="font-mono">
                <span className="text-pepe">🐸{formatUSDC(lp.pepe)}</span>
                {" / "}
                <span className="text-shib">🦊{formatUSDC(lp.shib)}</span>
              </span>
            </div>
          ))}
          <div className="flex items-center justify-between text-xs pt-1" style={{ borderTop: "1px solid var(--treasury-divider)" }}>
            <span style={{ color: "var(--accent-yellow-bold)" }}>Total Kill Pot</span>
            <span className="font-mono font-bold" style={{ color: "var(--accent-yellow)" }}>{formatUSDC(totalKillPot)}</span>
          </div>
        </div>
      </div>

      {/* Per-Lane Hold Scores */}
      {laneHoldScores && (
        <div className="p-3 rounded-lg space-y-2" style={{ backgroundColor: "var(--panel-bg)" }}>
          <span className="text-xs font-bold" style={{ color: "var(--accent-yellow-bold)" }}>🏰 Hold Scores</span>
          {laneHoldScores.map((lane, i) => (
            <div key={i} className="flex items-center justify-between text-xs">
              <span style={{ color: "var(--text-secondary)" }}>Lane {i + 1}</span>
              <span className="font-mono">
                <span className="text-pepe">🐸 {lane.pepe.toString()}</span>
                {" — "}
                <span className="text-shib">{lane.shib.toString()} 🦊</span>
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Weather + Event */}
      <WeatherEventPanel
        weather={weather}
        specialEvent={specialEvent}
        specialEventEndsAt={specialEventEndsAt}
        weatherSetAt={weatherSetAt}
        weatherCooldownReady={weatherCooldownReady}
        eventCooldownReady={eventCooldownReady}
        onRollWeather={onRollWeather}
        onRollSpecialEvent={onRollSpecialEvent}
        isRollingWeather={isRollingWeather}
        isRollingEvent={isRollingEvent}
      />

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

function WeatherEventPanel({
  weather,
  specialEvent,
  specialEventEndsAt,
  weatherSetAt,
  weatherCooldownReady,
  eventCooldownReady,
  onRollWeather,
  onRollSpecialEvent,
  isRollingWeather,
  isRollingEvent,
}: {
  weather: number;
  specialEvent: number;
  specialEventEndsAt: number;
  weatherSetAt: number;
  weatherCooldownReady: boolean;
  eventCooldownReady: boolean;
  onRollWeather?: () => void;
  onRollSpecialEvent?: () => void;
  isRollingWeather?: boolean;
  isRollingEvent?: boolean;
}) {
  const [now, setNow] = useState(Math.floor(Date.now() / 1000));
  useEffect(() => {
    const timer = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(timer);
  }, []);

  const weatherCooldownEnd = weatherSetAt > 0 ? weatherSetAt + WEATHER_INTERVAL : 0;
  const weatherRemaining = weatherCooldownEnd > now ? weatherCooldownEnd - now : 0;

  return (
    <div className="p-3 rounded-lg space-y-2" style={{ backgroundColor: "var(--panel-bg)" }}>
      <div className="flex items-center justify-between">
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>Weather</span>
        <span className="text-sm">
          {WEATHER_EMOJI[weather]} {WEATHER_LABELS[weather]}
        </span>
      </div>
      {weather > 0 && (
        <div className="text-xs" style={{ color: "var(--accent-yellow)" }}>
          {WEATHER_BONUS_UNIT[weather]}
        </div>
      )}
      {/* Weather cooldown timer */}
      <div className="text-xs" style={{ color: "var(--text-muted)" }}>
        {weatherRemaining > 0
          ? `\u23F3 Next roll in ${formatTime(weatherRemaining)}`
          : "\u2705 Ready to roll"}
      </div>
      {onRollWeather && (
        <button
          onClick={onRollWeather}
          disabled={!weatherCooldownReady || isRollingWeather}
          className="w-full text-xs py-1.5 rounded font-semibold transition-colors"
          style={{
            backgroundColor: weatherCooldownReady && !isRollingWeather ? "var(--accent-blue)" : "var(--btn-disabled-bg)",
            color: weatherCooldownReady && !isRollingWeather ? "#fff" : "var(--text-muted)",
            cursor: weatherCooldownReady && !isRollingWeather ? "pointer" : "not-allowed",
          }}
        >
          {isRollingWeather ? "Rolling..." : weatherCooldownReady ? "\uD83C\uDFB2 Roll Weather" : "\u23F3 Weather Cooldown"}
        </button>
      )}

      {/* Special Event */}
      {specialEvent > 0 && (
        <div className="pt-2 space-y-1" style={{ borderTop: "1px solid var(--game-border)" }}>
          <div className="flex items-center justify-between">
            <span className="text-xs" style={{ color: "var(--accent-purple)" }}>Active Event</span>
            <span className="text-sm">
              {EVENT_EMOJI[specialEvent]} {EVENT_LABELS[specialEvent]}
            </span>
          </div>
          {EVENT_DESCRIPTION[specialEvent] && (
            <div className="text-xs" style={{ color: "var(--accent-purple)" }}>
              {EVENT_DESCRIPTION[specialEvent]}
            </div>
          )}
          <div className="text-xs" style={{ color: "var(--text-secondary)" }}>
            Ends: {formatTimeRemaining(specialEventEndsAt)}
          </div>
        </div>
      )}
      {onRollSpecialEvent && (
        <button
          onClick={onRollSpecialEvent}
          disabled={!eventCooldownReady || isRollingEvent}
          className="w-full text-xs py-1.5 rounded font-semibold transition-colors"
          style={{
            backgroundColor: eventCooldownReady && !isRollingEvent ? "var(--accent-purple)" : "var(--btn-disabled-bg)",
            color: eventCooldownReady && !isRollingEvent ? "#fff" : "var(--text-muted)",
            cursor: eventCooldownReady && !isRollingEvent ? "pointer" : "not-allowed",
          }}
        >
          {isRollingEvent ? "Rolling..." : eventCooldownReady ? "\uD83C\uDFB2 Roll Event" : "\u23F3 Event Active"}
        </button>
      )}
    </div>
  );
}
