import { BASTION_SEGMENT } from "../lib/constants";

interface LaneData {
  pepeScore: bigint;
  shibScore: bigint;
}

interface GameMapProps {
  lanes: LaneData[];
  weather: number;
  specialEvent: number;
}

const SEGMENT_LABELS = ["P-Base", "P-2", "P-1", "Bastion", "S-1", "S-2", "S-Base"];

function Segment({
  index,
  laneId,
}: {
  index: number;
  laneId: number;
}) {
  const isBastion = index === BASTION_SEGMENT;
  const isPepeSide = index < BASTION_SEGMENT;
  const isShibSide = index > BASTION_SEGMENT;

  let bgClass = "bg-gray-800";
  if (isBastion) bgClass = "bg-bastion/30 bastion-glow";
  else if (isPepeSide) bgClass = "bg-pepe/10";
  else if (isShibSide) bgClass = "bg-shib/10";

  return (
    <div
      className={`
        relative flex items-center justify-center
        h-16 rounded-lg border transition-all
        ${isBastion ? "border-bastion" : "border-game-border"}
        ${bgClass}
      `}
    >
      <span className="text-[10px] text-gray-500 absolute top-1 left-1.5">
        {SEGMENT_LABELS[index]}
      </span>
      {isBastion && (
        <span className="text-lg">🏰</span>
      )}
      {index === 0 && <span className="text-sm">🐸</span>}
      {index === 6 && <span className="text-sm">🐕</span>}
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
}: {
  laneId: number;
  pepeScore: bigint;
  shibScore: bigint;
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
          <Segment key={seg} index={seg} laneId={laneId} />
        ))}
      </div>
      <ScoreBar pepe={pepeScore} shib={shibScore} />
    </div>
  );
}

export default function GameMap({ lanes, weather, specialEvent }: GameMapProps) {
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
        />
      ))}
    </div>
  );
}
