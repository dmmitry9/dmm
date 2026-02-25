import { BASTION_SEGMENT, FACTION, UNIT_EMOJI, formatTimeRemaining } from "../lib/constants";
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

function SquadBadge({ squads }: { squads: SegmentSquad[] }) {
  if (squads.length === 0) return null;

  // Sort by arrival time (closest first), show up to 5
  const sorted = [...squads].sort((a, b) => a.arrivalTime - b.arrivalTime).slice(0, 5);

  return (
    <div className="flex flex-col items-center gap-px">
      {sorted.map((s) => {
        const factionEmoji = s.faction === FACTION.PEPE ? "🐸" : "🐕";
        const colorClass = s.faction === FACTION.PEPE ? "text-pepe" : "text-shib";
        return (
          <span key={s.squadId} className={`text-[9px] ${colorClass} font-bold leading-tight`}>
            {factionEmoji}{s.effectiveUnits}{UNIT_EMOJI[s.unitType] || ""}
            {s.isMarching && (
              <span className="text-yellow-400 ml-0.5">⏳{formatTimeRemaining(s.arrivalTime)}</span>
            )}
          </span>
        );
      })}
      {squads.length > 5 && (
        <span className="text-[8px] text-gray-500">+{squads.length - 5} more</span>
      )}
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

  let bgClass = "bg-gray-800";
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
        relative flex items-center justify-center
        min-h-[5.5rem] rounded-lg border transition-all py-1
        ${isBastion ? "border-bastion" : hasSquads ? "border-gray-500" : "border-game-border"}
        ${bgClass}
      `}
    >
      {hasSquads ? (
        <SquadBadge squads={squads} />
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
    <div className="flex h-2 rounded-full overflow-hidden bg-gray-700">
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
