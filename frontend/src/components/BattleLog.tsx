import { useState } from "react";
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
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  if (battles.length === 0) {
    return (
      <div className="card text-center py-4">
        <span className="text-sm" style={{ color: "var(--text-muted)" }}>⚔️ No battles yet this season</span>
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
          const expanded = expandedIdx === i;

          const winnerUnitsStart = isPepe ? b.pepeUnitsStart : b.shibUnitsStart;
          const loserUnitsStart = isPepe ? b.shibUnitsStart : b.pepeUnitsStart;
          const winnerCombat = isPepe ? b.pepeCombat : b.shibCombat;
          const loserCombat = isPepe ? b.shibCombat : b.pepeCombat;
          const winnerLost = winnerUnitsStart - b.totalSurvivors;

          return (
            <div
              key={`${b.blockNumber}-${b.laneId}-${i}`}
              className="rounded overflow-hidden"
              style={{ backgroundColor: "var(--game-bg)" }}
            >
              {/* Summary row — clickable */}
              <div
                className="flex items-center justify-between px-3 py-1.5 text-[11px] cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => setExpandedIdx(expanded ? null : i)}
              >
                <div className="flex items-center gap-2">
                  <span className="w-12 shrink-0" style={{ color: "var(--text-muted)" }}>
                    {b.timestamp > 0 ? timeAgo(b.timestamp) : "—"}
                  </span>
                  <span style={{ color: "var(--text-secondary)" }}>L{b.laneId + 1}</span>
                  <span>
                    {winEmoji}
                    <span className={`${winColor} font-bold`}> WIN</span>
                    {" vs "}
                    {loseEmoji}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span style={{ color: "var(--text-secondary)" }}>
                    🐸{b.pepeUnitsStart} vs 🐕{b.shibUnitsStart}
                  </span>
                  <span className="font-semibold" style={{ color: "var(--accent-yellow)" }}>
                    💰 {formatUSDC(b.winnerPot + b.loserEarned)}
                  </span>
                  <span style={{ color: "var(--text-muted)", fontSize: "9px" }}>
                    {expanded ? "▲" : "▼"}
                  </span>
                </div>
              </div>

              {/* Expanded detail */}
              {expanded && (
                <div
                  className="px-3 pb-2 pt-1 text-[11px] space-y-1.5"
                  style={{ borderTop: "1px solid var(--game-border)" }}
                >
                  {/* Starting forces */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="block text-[10px] uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                        Starting Forces
                      </span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-pepe font-semibold">🐸 {b.pepeUnitsStart}</span>
                        <span style={{ color: "var(--text-muted)" }}>vs</span>
                        <span className="text-shib font-semibold">🐕 {b.shibUnitsStart}</span>
                      </div>
                    </div>
                    <div>
                      <span className="block text-[10px] uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                        Combat Power
                      </span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-pepe font-mono">{b.pepeCombat.toLocaleString()}</span>
                        <span style={{ color: "var(--text-muted)" }}>vs</span>
                        <span className="text-shib font-mono">{b.shibCombat.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Battle outcome */}
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <span className="block text-[10px] uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                        Survivors
                      </span>
                      <span className={`${winColor} font-bold`}>
                        {winEmoji} {b.totalSurvivors}
                      </span>
                      <span style={{ color: "var(--text-muted)" }}> / {winnerUnitsStart}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                        Casualties
                      </span>
                      <span style={{ color: "var(--accent-red)" }}>
                        {winEmoji} -{winnerLost}
                      </span>
                      {" "}
                      <span style={{ color: "var(--accent-red)" }}>
                        {loseEmoji} -{loserUnitsStart}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[10px] uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                        Power Ratio
                      </span>
                      <span className="font-mono">
                        {winnerCombat > 0 && loserCombat > 0
                          ? `${(winnerCombat / loserCombat).toFixed(2)}:1`
                          : "—"
                        }
                      </span>
                    </div>
                  </div>

                  {/* Earnings */}
                  <div
                    className="pt-1.5 flex items-center justify-between"
                    style={{ borderTop: "1px solid var(--game-border)" }}
                  >
                    <div>
                      <span className="text-[10px] uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                        {winEmoji} Winner Earned
                      </span>
                      <span className="ml-2 font-semibold" style={{ color: "var(--accent-green)" }}>
                        {formatUSDC(b.winnerPot)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                        {loseEmoji} Loser Earned
                      </span>
                      <span className="ml-2 font-semibold" style={{ color: "var(--accent-yellow)" }}>
                        {formatUSDC(b.loserEarned)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
