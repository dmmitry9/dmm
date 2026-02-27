import { useState, useEffect, useRef } from "react";
import { BASTION_SEGMENT, FACTION, UNIT_EMOJI, UNIT_TYPE, formatTimeRemaining, formatUSDC, WEATHER_LABELS, WEATHER_EMOJI, WEATHER_BONUS_UNIT, EVENT_LABELS, EVENT_EMOJI, WEATHER_INTERVAL, formatTime } from "../lib/constants";
import type { SegmentSquad } from "../hooks/useGameState";

interface LaneData {
  pepeScore: bigint;
  shibScore: bigint;
}

interface GameMapProps {
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
}

const UNIT_TYPES = [UNIT_TYPE.SWORDSMAN, UNIT_TYPE.SPEARMAN, UNIT_TYPE.CAVALRY];

function factionTotals(squads: SegmentSquad[], faction: number) {
  const fSquads = squads.filter((s) => s.faction === faction);
  const total = fSquads.reduce((sum, s) => sum + s.effectiveUnits, 0);
  const byType = UNIT_TYPES.map((t) =>
    fSquads.filter((s) => s.unitType === t).reduce((sum, s) => sum + s.effectiveUnits, 0)
  );
  return { total, byType };
}

function TotalLine({ squads, isBastion = true }: { squads: SegmentSquad[]; isBastion?: boolean }) {
  const pepe = factionTotals(squads, FACTION.PEPE);
  const shib = factionTotals(squads, FACTION.SHIB);

  return (
    <div className="flex flex-col items-center gap-px border-b pb-0.5 mb-0.5 w-full px-0.5" style={{ borderColor: "var(--game-border)" }}>
      {pepe.total > 0 && (
        <span className="text-[7px] sm:text-[8px] text-pepe font-bold leading-tight">
          {isBastion && "🐸"}{pepe.total}
          {pepe.byType.map((c, i) =>
            c > 0 ? <span key={i} style={{ color: "var(--text-secondary)" }}> {c}{UNIT_EMOJI[UNIT_TYPES[i]]}</span> : null
          )}
        </span>
      )}
      {shib.total > 0 && (
        <span className="text-[7px] sm:text-[8px] text-shib font-bold leading-tight">
          {isBastion && "🦊"}{shib.total}
          {shib.byType.map((c, i) =>
            c > 0 ? <span key={i} style={{ color: "var(--text-secondary)" }}> {c}{UNIT_EMOJI[UNIT_TYPES[i]]}</span> : null
          )}
        </span>
      )}
    </div>
  );
}

function SquadLine({ s, isBastion = true, address }: { s: SegmentSquad; isBastion?: boolean; address?: string }) {
  const factionEmoji = s.faction === FACTION.PEPE ? "🐸" : "🦊";
  const colorClass = s.faction === FACTION.PEPE ? "text-pepe" : "text-shib";
  const now = Math.floor(Date.now() / 1000);
  const showTimer = s.isMarching && s.arrivalTime > now;
  const isOwn = address && s.owner.toLowerCase() === address.toLowerCase();
  return (
    <span className={`text-[9px] ${colorClass} font-bold leading-tight ${isOwn ? "ring-1 ring-yellow-400 rounded px-0.5" : ""}`}>
      {isOwn && "★"}{isBastion && factionEmoji}{s.effectiveUnits}{UNIT_EMOJI[s.unitType] || ""}
      {showTimer && (
        <span className="ml-0.5" style={{ color: "var(--accent-yellow)" }}>⏳{formatTimeRemaining(s.arrivalTime)}</span>
      )}
    </span>
  );
}

function SquadBadge({ squads, isBastion = true, address }: { squads: SegmentSquad[]; isBastion?: boolean; address?: string }) {
  if (squads.length === 0) return null;

  const sorted = [...squads].sort((a, b) => a.arrivalTime - b.arrivalTime);
  const visible = sorted.slice(0, 5);

  return (
    <div className="flex flex-col items-center gap-px w-full">
      <TotalLine squads={squads} isBastion={isBastion} />
      {visible.map((s) => (
        <SquadLine key={s.squadId} s={s} isBastion={isBastion} address={address} />
      ))}
      {squads.length > 5 && (
        <span className="text-[8px]" style={{ color: "var(--text-muted)" }}>+{squads.length - 5} more</span>
      )}
    </div>
  );
}

function SquadTooltip({ squads, isBastion = true, address }: { squads: SegmentSquad[]; isBastion?: boolean; address?: string }) {
  const sorted = [...squads].sort((a, b) => a.arrivalTime - b.arrivalTime).slice(0, 20);

  return (
    <div className="absolute z-50 left-1/2 -translate-x-1/2 bottom-full mb-1 rounded-lg px-2 py-1.5 shadow-xl min-w-[120px] pointer-events-none" style={{ backgroundColor: "var(--game-card)", borderColor: "var(--game-border)", border: "1px solid var(--game-border)" }}>
      <TotalLine squads={squads} isBastion={isBastion} />
      <div className="flex flex-col items-center gap-px mt-0.5">
        {sorted.map((s) => (
          <SquadLine key={s.squadId} s={s} isBastion={isBastion} address={address} />
        ))}
        {squads.length > 20 && (
          <span className="text-[8px]" style={{ color: "var(--text-muted)" }}>+{squads.length - 20} more</span>
        )}
      </div>
    </div>
  );
}

function Segment({
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
  const isShibSide = index > BASTION_SEGMENT;
  const hasSquads = squads.length > 0;
  const hasOwnSquad = address && squads.some((s) => s.owner.toLowerCase() === address.toLowerCase());

  let bgClass = "bg-game-card";
  if (isBastion) bgClass = "bg-bastion/30 bastion-glow";
  else if (isPepeSide) bgClass = "bg-pepe/10";
  else if (isShibSide) bgClass = "bg-shib/10";

  if (hasSquads && !isBastion) {
    const hasPepe = squads.some((s) => s.faction === FACTION.PEPE);
    const hasShib = squads.some((s) => s.faction === FACTION.SHIB);
    if (hasPepe && hasShib) bgClass = "bg-yellow-900/30";
    else if (hasPepe) bgClass = "bg-pepe/20";
    else if (hasShib) bgClass = "bg-shib/20";
  }

  return (
    <div
      className={`
        group relative flex items-center justify-center
        min-h-[3.5rem] sm:min-h-[5.5rem] rounded-lg border transition-all py-1
        ${isBastion ? "border-bastion" : hasSquads ? "border-game-border" : "border-game-border"}
        ${bgClass}
        ${hasOwnSquad ? "own-squad-glow border-yellow-400/50" : ""}
      `}
    >
      {hasSquads ? (
        <>
          {isBastion ? (
            <TotalLine squads={squads} isBastion={true} />
          ) : (
            <>
              <SquadBadge squads={squads} isBastion={false} address={address} />
              {squads.length > 5 && (
                <div className="hidden group-hover:block">
                  <SquadTooltip squads={squads} isBastion={false} address={address} />
                </div>
              )}
            </>
          )}
        </>
      ) : (
        <>
          {isBastion && <span className="text-lg">🏰</span>}
          {index === 0 && <span className="text-sm">🐸</span>}
          {index === 6 && <span className="text-sm">🦊</span>}
        </>
      )}
    </div>
  );
}

function ScoreBar({ pepe, shib }: { pepe: bigint; shib: bigint }) {
  const total = Number(pepe + shib);
  const pepePct = total > 0 ? (Number(pepe) / total) * 100 : 50;
  const prevPepe = useRef(pepe);
  const prevShib = useRef(shib);
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    if (prevPepe.current !== pepe || prevShib.current !== shib) {
      if (prevPepe.current !== undefined) {
        setFlash(true);
        const t = setTimeout(() => setFlash(false), 1000);
        prevPepe.current = pepe;
        prevShib.current = shib;
        return () => clearTimeout(t);
      }
      prevPepe.current = pepe;
      prevShib.current = shib;
    }
  }, [pepe, shib]);

  return (
    <div className={`flex h-2 rounded-full overflow-hidden ${flash ? "score-updated" : ""}`} style={{ backgroundColor: "var(--score-bar-bg)" }}>
      <div
        className="bg-pepe transition-all duration-1000"
        style={{ width: `${pepePct}%` }}
      />
      <div
        className="bg-shib transition-all duration-1000"
        style={{ width: `${100 - pepePct}%` }}
      />
    </div>
  );
}

function LaneRow({
  laneId,
  pepeScore,
  shibScore,
  segments,
  onResolveBattle,
  resolvingLane,
  killPot,
  address,
}: {
  laneId: number;
  pepeScore: bigint;
  shibScore: bigint;
  segments: SegmentSquad[][];
  onResolveBattle?: (laneId: number) => void;
  resolvingLane?: number | null;
  killPot?: { pepe: bigint; shib: bigint };
  address?: string;
}) {
  const bastionSquads = segments[BASTION_SEGMENT] || [];
  const hasPepeInBastion = bastionSquads.some((s) => s.faction === FACTION.PEPE);
  const hasShibInBastion = bastionSquads.some((s) => s.faction === FACTION.SHIB);
  const contested = hasPepeInBastion && hasShibInBastion;
  const isResolving = resolvingLane === laneId;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs px-1" style={{ color: "var(--text-secondary)" }}>
        <span className="flex items-center gap-2">
          Lane {laneId + 1}
          {killPot && (killPot.pepe > 0n || killPot.shib > 0n) && (
            <span className="font-mono text-[10px]" style={{ color: "var(--accent-yellow)" }}>
              💰 <span className="text-pepe">🐸{formatUSDC(killPot.pepe)}</span>
              {" / "}
              <span className="text-shib">🦊{formatUSDC(killPot.shib)}</span>
            </span>
          )}
        </span>
        <span>
          🐸 {Number(pepeScore).toLocaleString()} — {Number(shibScore).toLocaleString()} 🦊
        </span>
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {[0, 1, 2, 3, 4, 5, 6].map((seg) => (
          <Segment key={seg} index={seg} squads={segments[seg] || []} address={address} />
        ))}
      </div>
      {contested && onResolveBattle && (
        <button
          onClick={() => onResolveBattle(laneId)}
          disabled={isResolving}
          className="w-full py-2 rounded-lg font-bold text-sm text-white transition-all bg-gradient-to-r from-pepe via-red-500 to-shib hover:opacity-90 disabled:opacity-50"
        >
          {isResolving ? "⏳ Resolving..." : `⚔️ Resolve Battle — Lane ${laneId + 1}`}
        </button>
      )}
      <ScoreBar pepe={pepeScore} shib={shibScore} />
    </div>
  );
}

export default function GameMap({
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
}: GameMapProps) {
  const [now, setNow] = useState(Math.floor(Date.now() / 1000));
  useEffect(() => {
    const timer = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(timer);
  }, []);

  const weatherCooldownEnd = weatherSetAt > 0 ? weatherSetAt + WEATHER_INTERVAL : 0;
  const weatherRemaining = weatherCooldownEnd > now ? weatherCooldownEnd - now : 0;

  return (
    <div className="card space-y-6">
      {/* Header: Weather + Controls */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-bold">⚔️ Battlefield</h2>
        <div className="flex items-center gap-2 text-xs flex-wrap">
          {/* Weather badge */}
          <span className="px-2 py-0.5 rounded" style={{ backgroundColor: "var(--panel-bg)" }}>
            {WEATHER_EMOJI[weather]} {WEATHER_LABELS[weather]}
            {weather > 0 && (
              <span className="ml-1" style={{ color: "var(--accent-yellow)" }}>({WEATHER_BONUS_UNIT[weather]})</span>
            )}
          </span>

          {/* Special event badge */}
          {specialEvent > 0 && (
            <span className="px-2 py-0.5 rounded" style={{ backgroundColor: "var(--panel-bg)", color: "var(--accent-purple)" }}>
              {EVENT_EMOJI[specialEvent]} {EVENT_LABELS[specialEvent]}
              <span className="ml-1" style={{ color: "var(--text-muted)" }}>
                ({formatTimeRemaining(specialEventEndsAt)})
              </span>
            </span>
          )}

          {/* Weather cooldown */}
          {weatherRemaining > 0 && (
            <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
              ⏳{formatTime(weatherRemaining)}
            </span>
          )}

          {/* Roll Weather button */}
          {onRollWeather && (
            <button
              onClick={onRollWeather}
              disabled={!weatherCooldownReady || isRollingWeather}
              className="px-2 py-0.5 rounded text-[10px] font-semibold transition-colors"
              style={{
                backgroundColor: weatherCooldownReady && !isRollingWeather ? "var(--accent-blue)" : "var(--btn-disabled-bg)",
                color: weatherCooldownReady && !isRollingWeather ? "#fff" : "var(--text-muted)",
                cursor: weatherCooldownReady && !isRollingWeather ? "pointer" : "not-allowed",
              }}
            >
              {isRollingWeather ? "⏳..." : "🎲 Weather"}
            </button>
          )}

          {/* Roll Event button */}
          {onRollSpecialEvent && (
            <button
              onClick={onRollSpecialEvent}
              disabled={!eventCooldownReady || isRollingEvent}
              className="px-2 py-0.5 rounded text-[10px] font-semibold transition-colors"
              style={{
                backgroundColor: eventCooldownReady && !isRollingEvent ? "var(--accent-purple)" : "var(--btn-disabled-bg)",
                color: eventCooldownReady && !isRollingEvent ? "#fff" : "var(--text-muted)",
                cursor: eventCooldownReady && !isRollingEvent ? "pointer" : "not-allowed",
              }}
            >
              {isRollingEvent ? "⏳..." : "🎲 Event"}
            </button>
          )}

          {/* Refresh button */}
          {onRefreshScores && (
            <button
              onClick={onRefreshScores}
              disabled={isRefreshingScores}
              className="px-2 py-0.5 rounded text-[10px] font-semibold transition-colors"
              style={{
                backgroundColor: isRefreshingScores ? "var(--btn-disabled-bg)" : "var(--accent-blue)",
                color: isRefreshingScores ? "var(--text-muted)" : "#fff",
                cursor: isRefreshingScores ? "not-allowed" : "pointer",
              }}
              title="Refresh hold scores & clean zombie squads (1 tx)"
            >
              {isRefreshingScores ? "⏳..." : "♻️ Refresh"}
            </button>
          )}
        </div>
      </div>

      {lanes.map((lane, i) => (
        <LaneRow
          key={i}
          laneId={i}
          pepeScore={lane.pepeScore}
          shibScore={lane.shibScore}
          segments={laneSquads[i] || Array.from({ length: 7 }, () => [])}
          onResolveBattle={onResolveBattle}
          resolvingLane={resolvingLane}
          killPot={killPots?.[i]}
          address={address}
        />
      ))}
    </div>
  );
}
