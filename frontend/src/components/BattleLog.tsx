import { FACTION } from "../lib/constants";
import { formatUSDC } from "../lib/constants";
import type { BattleRecord } from "../hooks/useGameState";

function timeAgo(timestamp: number): string {
  const now = Math.floor(Date.now() / 1000);
  const diff = now - timestamp;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function BattleLog({ battles }: { battles: BattleRecord[] }) {
  if (battles.length === 0) {
    return (
      <div className="card text-center py-4">
        <span className="text-gray-500 text-sm">⚔️ No battles yet this season</span>
      </div>
    );
  }

  return (
    <div className="card space-y-2">
      <h3 className="text-sm font-bold" style={{ color: "var(--text-secondary)" }}>⚔️ Recent Battles</h3>
      <div className="space-y-1.5">
        {battles.map((b, i) => {
          const isPepe = b.winner === FACTION.PEPE;
          const winEmoji = isPepe ? "🐸" : "🐕";
          const loseEmoji = isPepe ? "🐕" : "🐸";
          const winColor = isPepe ? "text-pepe" : "text-shib";
          const totalPot = b.winnerPot + b.loserEarned;

          return (
            <div
              key={`${b.blockNumber}-${b.laneId}-${i}`}
              className="flex items-center justify-between rounded px-3 py-1.5 text-[11px]"
              style={{ backgroundColor: "var(--game-bg)" }}
            >
              <div className="flex items-center gap-2">
                <span className="text-gray-500 w-12 shrink-0">
                  {b.timestamp > 0 ? timeAgo(b.timestamp) : "—"}
                </span>
                <span className="text-gray-400">L{b.laneId + 1}</span>
                <span>
                  {winEmoji}
                  <span className={`${winColor} font-bold`}> WIN</span>
                  {" vs "}
                  {loseEmoji}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-gray-400">
                  {b.totalSurvivors} survived
                </span>
                <span className="text-yellow-400 font-semibold">
                  💰 {formatUSDC(totalPot)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
