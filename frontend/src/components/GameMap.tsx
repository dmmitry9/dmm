import { BASTION_SEGMENT, FACTION, UNIT_EMOJI, UNIT_TYPE, formatTimeRemaining } from "../lib/constants";
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
}

const SEGMENT_LABELS = ["P-Base", "P-2", "P-1", "Bastion", "S-1", "S-2", "S-Base"];
const UNIT_TYPES = [UNIT_TYPE.SWORDSMAN, UNIT_TYPE.SPEARMAN, UNIT_TYPE.CAVALRY];

function factionTotals(squads: SegmentSquad[], faction: number) {
  const fSquads = squads.filter((s) => s.faction === faction);
  const total = fSquads.reduce((sum, s) => sum + s.effectiveUnits, 0);
  const byType = UNIT_TYPES.map((t) =>
    fSquads.filter((s) => s.unitType === t).reduce((sum, s) => sum + s.effectiveUnits, 0)
  );
  return { total, byType };
}

function TotalLine({ squads }: { squads: SegmentSquad[] }) {
  const pepe = factionTotals(squads, FACTION.PEPE);
  const shib = factionTotals(squads, FACTION.SHIB);

  return (
    <div className="flex flex-col items-center gap-px border-b border-gray-700/50 pb-0.5 mb-0.5 w-full px-0.5">
      {pepe.total > 0 && (
        <span className="text-[8px] text-pepe font-bold leading-tight">
          🐸{pepe.total}
          {pepe.byType.map((c, i) =>
            c > 0 ? <span key={i} className="text-gray-400"> {c}{UNIT_EMOJI[UNIT_TYPES[i]]}</span> : null
          )}
        </span>
      )}
      {shib.total > 0 && (
        <span className="text-[8px] text-shib font-bold leading-tight">
          🐕{shib.total}
          {shib.byType.map((c, i) =>
            c > 0 ? <span key={i} className="text-gray-400"> {c}{UNIT_EMOJI[UNIT_TYPES[i]]}</span> : null
          )}
        </span>
      )}
    </div>
  );
}

function SquadLine({ s }: { s: SegmentSquad }) {
  const factionEmoji = s.faction === FACTION.PEPE ? "🐸" : "🐕";
  const colorClass = s.faction === FACTION.PEPE ? "text-pepe" : "text-shib";
  const now = Math.floor(Date.now() / 1000);
  const showTimer = s.isMarching && s.arrivalTime > now;
  return (
    <span className={`text-[9px] ${colorClass} font-bold leading-tight`}>
      {factionEmoji}{s.effectiveUnits}{UNIT_EMOJI[s.unitType] || ""}
      {showTimer && (
        <span className="text-yellow-400 ml-0.5">⏳{formatTimeRemaining(s.arrivalTime)}</span>
      )}
    </span>
  );
}

function SquadBadge({ squads, showTotal = true }: { squads: SegmentSquad[]; showTotal?: boolean }) {
  if (squads.length === 0) return null;

  const sorted = [...squads].sort((a, b) => a.arrivalTime - b.arrivalTime);
  const visible = sorted.slice(0, 5);

  return (
    <div className="flex flex-col items-center gap-px w-full">
      {showTotal && <TotalLine squads={squads} />}
      {visible.map((s) => (
        <SquadLine key={s.squadId} s={s} />
      ))}
      {squads.length > 5 && (
        <span className="text-[8px]" style={{ color: "var(--text-muted)" }}>+{squads.length - 5} more</span>
      )}
    </div>
  );
}

function SquadTooltip({ squads }: { squads: SegmentSquad[] }) {
  const sorted = [...squads].sort((a, b) => a.arrivalTime - b.arrivalTime).slice(0, 20);

  return (
    <div className="absolute z-50 left-1/2 -translate-x-1/2 bottom-full mb-1 rounded-lg px-2 py-1.5 shadow-xl min-w-[120px] pointer-events-none" style={{ backgroundColor: "var(--game-card)", borderColor: "var(--game-border)", border: "1px solid var(--game-border)" }}>
      <TotalLine squads={squads} />
      <div className="flex flex-col items-center gap-px mt-0.5">
        {sorted.map((s) => (
          <SquadLine key={s.squadId} s={s} />
        ))}
        {squads.length > 20 && (
          <span className="text-[8px] text-gray-500">+{squads.length - 20} more</span>
        )}
      </div>
    </div>
  );
}

function Segment({
  index,
  squads,
}: {
  index: number;
  squads: SegmentSquad[];
}) {
  const isBastion = index === BASTION_SEGMENT;
  const isPepeSide = index < BASTION_SEGMENT;
  const isShibSide = index > BASTION_SEGMENT;
  const hasSquads = squads.length > 0;

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
        min-h-[5.5rem] rounded-lg border transition-all py-1
        ${isBastion ? "border-bastion" : hasSquads ? "border-gray-500" : "border-game-border"}
        ${bgClass}
      `}
    >
      {hasSquads ? (
        <>
          <SquadBadge squads={squads} showTotal={!isBastion} />
          {squads.length > 5 && (
            <div className="hidden group-hover:block">
              <SquadTooltip squads={squads} />
            </div>
          )}
        </>
      ) : (
        <>
          {isBastion && <span className="text-lg">🏰</span>}
          {index === 0 && <span className="text-sm">🐸</span>}
          {index === 6 && <span className="text-sm">🐕</span>}
        </>
      )}
    </div>
  );
}

function ScoreBar({ pepe, shib }: { pepe: bigint; shib: bigint }) {
  const total = Number(pepe + shib);
  const pepePct = total > 0 ? (Number(pepe) / total) * 100 : 50;

  return (
    <div className="flex h-2 rounded-full overflow-hidden" style={{ backgroundColor: "var(--score-bar-bg)" }}>
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
}: {
  laneId: number;
  pepeScore: bigint;
  shibScore: bigint;
  segments: SegmentSquad[][];
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-gray-400 px-1">
        <span>Lane {laneId + 1}</span>
        <span>
          🐸 {Number(pepeScore).toLocaleString()} — {Number(shibScore).toLocaleString()} 🐕
        </span>
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {[0, 1, 2, 3, 4, 5, 6].map((seg) => (
          <Segment key={seg} index={seg} squads={segments[seg] || []} />
        ))}
      </div>
      <ScoreBar pepe={pepeScore} shib={shibScore} />
    </div>
  );
}

export default function GameMap({ lanes, laneSquads, weather, specialEvent }: GameMapProps) {
  return (
    <div className="card space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">⚔️ Battlefield</h2>
        <div className="flex items-center gap-3 text-xs text-gray-400">
          <span className="text-pepe font-bold">🐸 PEPE</span>
          <span>→ march →</span>
          <span className="text-bastion font-bold">🏰</span>
          <span>← march ←</span>
          <span className="text-shib font-bold">🐕 SHIB</span>
        </div>
      </div>

      {lanes.map((lane, i) => (
        <LaneRow
          key={i}
          laneId={i}
          pepeScore={lane.pepeScore}
          shibScore={lane.shibScore}
          segments={laneSquads[i] || Array.from({ length: 7 }, () => [])}
        />
      ))}
    </div>
  );
}
