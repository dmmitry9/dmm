import { useState, useEffect } from "react";
import { BASTION_SEGMENT, FACTION, UNIT_TYPE, formatTimeRemaining, formatUSDC, WEATHER_LABELS, WEATHER_BONUS_UNIT, EVENT_LABELS, WEATHER_INTERVAL, formatTime } from "../../lib/constants";
import type { SegmentSquad } from "../../hooks/useGameState";
import {
  PixelSword, PixelBase, PixelBastion,
  PixelUnit, PixelPepe, PixelShib,
  PixelWeather, PixelCoin, PixelSwordsman,
} from "./PixelSprites";

interface LaneData {
  pepeScore: bigint;
  shibScore: bigint;
}

interface GameMapV2Props {
  lanes: LaneData[];
  laneSquads: SegmentSquad[][][];
  weather: number;
  specialEvent: number;
  specialEventEndsAt: number;
  weatherSetAt: number;
  address?: string;
  onResolveBattle?: (laneId: number) => void;
  resolvingLane?: number | null;
  onRefreshScores?: () => void;
  isRefreshingScores?: boolean;
  killPots?: { pepe: bigint; shib: bigint }[];
  weatherCooldownReady?: boolean;
  eventCooldownReady?: boolean;
  onRollWeather?: () => void;
  onRollSpecialEvent?: () => void;
  isRollingWeather?: boolean;
  isRollingEvent?: boolean;
  battleFlashLane?: number | null;
}

const WEATHER_CSS: Record<number, string> = {
  0: "",
  1: "v2-weather-rain",
  2: "v2-weather-sun",
  3: "v2-weather-fog",
};

const UNIT_TYPES = [UNIT_TYPE.SWORDSMAN, UNIT_TYPE.SPEARMAN, UNIT_TYPE.CAVALRY];

function factionTotals(squads: SegmentSquad[], faction: number) {
  const fSquads = squads.filter((s) => s.faction === faction);
  const total = fSquads.reduce((sum, s) => sum + s.effectiveUnits, 0);
  return total;
}

function SegmentV2({
  index,
  squads,
  address,
}: {
  index: number;
  squads: SegmentSquad[];
  address?: string;
}) {
  const isBastion = index === BASTION_SEGMENT;
  const isPepeSide = index < BASTION_SEGMENT;
  const hasSquads = squads.length > 0;
  const hasOwnSquad = address && squads.some((s) => s.owner.toLowerCase() === address.toLowerCase());

  const hasPepe = squads.some((s) => s.faction === FACTION.PEPE);
  const hasShib = squads.some((s) => s.faction === FACTION.SHIB);
  const contested = isBastion && hasPepe && hasShib;

  const pepeTotal = factionTotals(squads, FACTION.PEPE);
  const shibTotal = factionTotals(squads, FACTION.SHIB);

  // Background colors
  let bgStyle: React.CSSProperties = {};
  let extraClass = "";

  if (isBastion) {
    bgStyle = { backgroundColor: "rgba(139, 92, 246, 0.15)" };
    extraClass = contested ? "pixel-contested-glow" : "pixel-bastion-glow";
  } else if (isPepeSide) {
    bgStyle = { backgroundColor: "rgba(76, 175, 80, 0.08)" };
  } else {
    bgStyle = { backgroundColor: "rgba(255, 152, 0, 0.08)" };
  }

  if (hasOwnSquad) {
    bgStyle.border = "2px solid var(--accent-yellow)";
  }

  // Show top squads as pixel sprites
  const visibleSquads = [...squads].sort((a, b) => b.effectiveUnits - a.effectiveUnits).slice(0, 4);

  return (
    <div
      className={`relative flex flex-col items-center justify-center min-h-[4rem] sm:min-h-[6rem] rounded transition-all p-1 ${extraClass}`}
      style={{
        border: hasOwnSquad ? undefined : "2px solid var(--game-border)",
        ...bgStyle,
      }}
    >
      {isBastion && !hasSquads && (
        <div className="flex flex-col items-center">
          <PixelBastion scale={1.5} />
        </div>
      )}
      {index === 0 && !hasSquads && <PixelBase faction="pepe" scale={1.5} />}
      {index === 6 && !hasSquads && <PixelBase faction="shib" scale={1.5} />}

      {hasSquads && (
        <div className="flex flex-col items-center gap-0.5 w-full">
          {/* Total line */}
          <div className="flex items-center gap-1 text-[8px] font-bold w-full justify-center border-b pb-0.5" style={{ borderColor: "var(--game-border)" }}>
            {pepeTotal > 0 && (
              <span className="text-pepe flex items-center gap-0.5">
                {isBastion && <PixelPepe scale={0.8} />}
                {pepeTotal}
              </span>
            )}
            {pepeTotal > 0 && shibTotal > 0 && <span style={{ color: "var(--text-muted)" }}>|</span>}
            {shibTotal > 0 && (
              <span className="text-shib flex items-center gap-0.5">
                {isBastion && <PixelShib scale={0.8} />}
                {shibTotal}
              </span>
            )}
          </div>

          {/* Unit sprites */}
          <div className="flex flex-wrap gap-0.5 justify-center">
            {visibleSquads.map((s) => {
              const faction = s.faction === FACTION.PEPE ? "pepe" : "shib";
              const isOwn = address && s.owner.toLowerCase() === address.toLowerCase();
              const isMarching = s.isMarching && s.arrivalTime > Math.floor(Date.now() / 1000);
              return (
                <div
                  key={s.squadId}
                  className={`relative flex flex-col items-center ${isMarching ? "pixel-march" : ""}`}
                  title={`${s.effectiveUnits} ${faction} ${UNIT_TYPES[s.unitType - 1] ? ["Swordsman", "Spearman", "Cavalry"][s.unitType - 1] : "unit"}${isOwn ? " (yours)" : ""}`}
                >
                  <PixelUnit unitType={s.unitType} faction={faction} scale={1.2} />
                  <span
                    className={`text-[7px] font-bold ${s.faction === FACTION.PEPE ? "text-pepe" : "text-shib"}`}
                    style={isOwn ? { textDecoration: "underline", textDecorationColor: "var(--accent-yellow)" } : undefined}
                  >
                    {s.effectiveUnits}
                  </span>
                  {isMarching && (
                    <span className="text-[6px]" style={{ color: "var(--accent-yellow)" }}>
                      {formatTimeRemaining(s.arrivalTime)}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
          {squads.length > 4 && (
            <span className="text-[7px]" style={{ color: "var(--text-muted)" }}>+{squads.length - 4}</span>
          )}
        </div>
      )}
    </div>
  );
}

function ScoreBarV2({ pepe, shib }: { pepe: bigint; shib: bigint }) {
  const total = Number(pepe + shib);
  const pepePct = total > 0 ? (Number(pepe) / total) * 100 : 50;

  return (
    <div className="flex h-2.5 overflow-hidden" style={{ border: "2px solid var(--game-border)" }}>
      <div className="bg-pepe transition-all duration-1000" style={{ width: `${pepePct}%` }} />
      <div className="bg-shib transition-all duration-1000" style={{ width: `${100 - pepePct}%` }} />
    </div>
  );
}

function LaneRowV2({
  laneId,
  pepeScore,
  shibScore,
  segments,
  onResolveBattle,
  resolvingLane,
  killPot,
  address,
  battleFlashLane,
}: {
  laneId: number;
  pepeScore: bigint;
  shibScore: bigint;
  segments: SegmentSquad[][];
  onResolveBattle?: (laneId: number) => void;
  resolvingLane?: number | null;
  killPot?: { pepe: bigint; shib: bigint };
  address?: string;
  battleFlashLane?: number | null;
}) {
  const bastionSquads = segments[BASTION_SEGMENT] || [];
  const hasPepeInBastion = bastionSquads.some((s) => s.faction === FACTION.PEPE);
  const hasShibInBastion = bastionSquads.some((s) => s.faction === FACTION.SHIB);
  const contested = hasPepeInBastion && hasShibInBastion;
  const isResolving = resolvingLane === laneId;
  const isFlashing = battleFlashLane === laneId;

  return (
    <div className={`space-y-1.5 ${isFlashing ? "screen-shake" : ""}`}>
      {/* Lane header */}
      <div className="flex items-center justify-between text-[10px] px-1">
        <span className="pixel-heading text-[8px]" style={{ color: "var(--text-secondary)" }}>
          Lane {laneId + 1}
          {killPot && (killPot.pepe > 0n || killPot.shib > 0n) && (
            <span className="font-mono ml-2" style={{ color: "var(--accent-yellow)" }}>
              <span className="text-pepe">{formatUSDC(killPot.pepe)}</span>
              {" / "}
              <span className="text-shib">{formatUSDC(killPot.shib)}</span>
            </span>
          )}
        </span>
        <span className="font-mono text-[9px]" style={{ color: "var(--text-muted)" }}>
          {Number(pepeScore).toLocaleString()} — {Number(shibScore).toLocaleString()}
        </span>
      </div>

      {/* Pixel path with segments */}
      <div className="pixel-path rounded py-1 px-1">
        <div className="grid grid-cols-7 gap-1">
          {[0, 1, 2, 3, 4, 5, 6].map((seg) => (
            <SegmentV2 key={seg} index={seg} squads={segments[seg] || []} address={address} />
          ))}
        </div>
      </div>

      {/* Resolve battle button */}
      {contested && onResolveBattle && (
        <button
          onClick={() => onResolveBattle(laneId)}
          disabled={isResolving}
          className={`pixel-btn w-full !py-2 !text-[9px] ${isResolving ? "" : "pixel-btn-pepe"}`}
          style={!isResolving ? {
            background: "linear-gradient(90deg, #4CAF50, #e53935, #FF9800)",
            borderColor: "#333",
            boxShadow: "3px 3px 0 #333",
          } : undefined}
        >
          {isResolving ? "Resolving..." : `Resolve Battle — Lane ${laneId + 1}`}
        </button>
      )}

      <ScoreBarV2 pepe={pepeScore} shib={shibScore} />
    </div>
  );
}

export default function GameMapV2({
  lanes,
  laneSquads,
  weather,
  specialEvent,
  specialEventEndsAt,
  weatherSetAt,
  onResolveBattle,
  resolvingLane,
  onRefreshScores,
  isRefreshingScores,
  killPots,
  weatherCooldownReady,
  eventCooldownReady,
  onRollWeather,
  onRollSpecialEvent,
  isRollingWeather,
  isRollingEvent,
  address,
  battleFlashLane,
}: GameMapV2Props) {
  const [now, setNow] = useState(Math.floor(Date.now() / 1000));
  useEffect(() => {
    const timer = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(timer);
  }, []);

  const weatherCooldownEnd = weatherSetAt > 0 ? weatherSetAt + WEATHER_INTERVAL : 0;
  const weatherRemaining = weatherCooldownEnd > now ? weatherCooldownEnd - now : 0;
  const eventRemaining = specialEventEndsAt > now ? specialEventEndsAt - now : 0;

  const weatherClass = WEATHER_CSS[weather] || "";

  return (
    <div className={`pixel-card space-y-4 ${weatherClass} pixel-grass`}>
      {/* Header: Weather + Controls */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className="pixel-heading text-xs flex items-center gap-2">
            <PixelSword scale={2} />
            <span>Battlefield</span>
          </h2>

          {/* Weather */}
          <div className="pixel-badge flex items-center gap-1.5 text-[10px]">
            <PixelWeather weather={weather} scale={1.5} />
            <span>{WEATHER_LABELS[weather]}</span>
            {weather > 0 && (
              <span className="text-[9px]" style={{ color: "var(--accent-yellow)" }}>
                ({WEATHER_BONUS_UNIT[weather]})
              </span>
            )}
            {weatherRemaining > 0 && (
              <span className="text-[9px]" style={{ color: "var(--text-muted)" }}>{formatTime(weatherRemaining)}</span>
            )}
            {onRollWeather && (
              <button
                onClick={onRollWeather}
                disabled={!weatherCooldownReady || isRollingWeather}
                className="pixel-btn !px-1.5 !py-0 !text-[8px]"
                style={weatherCooldownReady && !isRollingWeather ? { backgroundColor: "var(--accent-blue)", color: "#fff", borderColor: "#1e40af", boxShadow: "2px 2px 0 #1e40af" } : undefined}
              >
                {isRollingWeather ? "..." : "Roll"}
              </button>
            )}
          </div>

          {/* Special Event */}
          {specialEvent > 0 ? (
            <div className="pixel-badge flex items-center gap-1.5 text-[10px]" style={{ color: "var(--accent-purple)" }}>
              <span>{EVENT_LABELS[specialEvent]}</span>
              {eventRemaining > 0 && (
                <span className="text-[9px]" style={{ color: "var(--text-muted)" }}>{formatTime(eventRemaining)}</span>
              )}
              {onRollSpecialEvent && (
                <button
                  onClick={onRollSpecialEvent}
                  disabled={!eventCooldownReady || isRollingEvent}
                  className="pixel-btn !px-1.5 !py-0 !text-[8px]"
                  style={eventCooldownReady && !isRollingEvent ? { backgroundColor: "var(--accent-purple)", color: "#fff", borderColor: "#5b21b6", boxShadow: "2px 2px 0 #5b21b6" } : undefined}
                >
                  {isRollingEvent ? "..." : "Roll"}
                </button>
              )}
            </div>
          ) : onRollSpecialEvent ? (
            <button
              onClick={onRollSpecialEvent}
              disabled={!eventCooldownReady || isRollingEvent}
              className="pixel-btn !px-2 !py-0.5 !text-[8px]"
              style={eventCooldownReady && !isRollingEvent ? { backgroundColor: "var(--accent-purple)", color: "#fff", borderColor: "#5b21b6", boxShadow: "2px 2px 0 #5b21b6" } : undefined}
            >
              {isRollingEvent ? "..." : "Event"}
            </button>
          ) : null}
        </div>

        {/* Sync */}
        {onRefreshScores && (
          <button
            onClick={onRefreshScores}
            disabled={isRefreshingScores}
            className="pixel-btn !px-2 !py-1 !text-[8px]"
            style={!isRefreshingScores ? { backgroundColor: "var(--accent-blue)", color: "#fff", borderColor: "#1e40af", boxShadow: "2px 2px 0 #1e40af" } : undefined}
          >
            {isRefreshingScores ? "..." : "Sync"}
          </button>
        )}
      </div>

      {/* Lanes */}
      {lanes.map((lane, i) => (
        <LaneRowV2
          key={i}
          laneId={i}
          pepeScore={lane.pepeScore}
          shibScore={lane.shibScore}
          segments={laneSquads[i] || Array.from({ length: 7 }, () => [])}
          onResolveBattle={onResolveBattle}
          resolvingLane={resolvingLane}
          killPot={killPots?.[i]}
          address={address}
          battleFlashLane={battleFlashLane}
        />
      ))}

      {/* Empty state */}
      {lanes.every((_, i) => (laneSquads[i] || []).flat().length === 0) && (
        <div className="text-center py-4">
          <div className="flex justify-center mb-2">
            <PixelSwordsman faction="pepe" scale={3} />
            <div className="mx-4"><PixelBastion scale={2} /></div>
            <PixelSwordsman faction="shib" scale={3} />
          </div>
          <p className="pixel-heading text-[9px]" style={{ color: "var(--text-muted)" }}>
            The battlefield awaits...
          </p>
          <p className="text-[10px] mt-1" style={{ color: "var(--text-muted)" }}>
            Deploy troops to begin the war
          </p>
        </div>
      )}
    </div>
  );
}
