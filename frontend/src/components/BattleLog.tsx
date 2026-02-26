import { useState } from "react";
import { FACTION, UNIT_EMOJI } from "../lib/constants";
import { formatUSDC } from "../lib/constants";
import type { HistoryRecord, BattleRecord, RetreatRecord } from "../hooks/useGameState";

function timeAgo(timestamp: number): string {
  const now = Math.floor(Date.now() / 1000);
  const diff = now - timestamp;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function RetreatEntry({ r }: { r: RetreatRecord }) {
  const factionEmoji = r.faction === FACTION.PEPE ? "\uD83D\uDC38" : "\uD83E\uDD8A";
  const unitEmoji = UNIT_EMOJI[r.unitType] || "";

  return (
    <div
      className="rounded px-3 py-1.5 text-[11px]"
      style={{ backgroundColor: "var(--game-bg)", opacity: 0.75 }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-12 shrink-0" style={{ color: "var(--text-muted)" }}>
            {r.timestamp > 0 ? timeAgo(r.timestamp) : "\u2014"}
          </span>
          <span style={{ color: "var(--text-secondary)" }}>L{r.laneId + 1}</span>
          <span>
            {factionEmoji} <span style={{ color: "var(--text-secondary)" }}>{"\uD83C\uDFC3"} Retreat</span>
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span style={{ color: "var(--text-secondary)" }}>
            {r.units}{"\u00D7"}{unitEmoji}
          </span>
          <span style={{ color: "var(--accent-green)" }}>
            {"\uD83D\uDCB0"}{formatUSDC(r.refund)}
          </span>
          <span style={{ color: "var(--accent-red)" }}>
            -{formatUSDC(r.penalty)}
          </span>
        </div>
      </div>
    </div>
  );
}

function BattleEntry({ b, expanded, onToggle }: { b: BattleRecord; expanded: boolean; onToggle: () => void }) {
  const isPepe = b.winner === FACTION.PEPE;
  const winEmoji = isPepe ? "\uD83D\uDC38" : "\uD83E\uDD8A";
  const loseEmoji = isPepe ? "\uD83E\uDD8A" : "\uD83D\uDC38";
  const winColor = isPepe ? "text-pepe" : "text-shib";

  const winnerUnitsStart = isPepe ? b.pepeUnitsStart : b.shibUnitsStart;
  const loserUnitsStart = isPepe ? b.shibUnitsStart : b.pepeUnitsStart;
  const winnerCombat = isPepe ? b.pepeCombat : b.shibCombat;
  const loserCombat = isPepe ? b.shibCombat : b.pepeCombat;
  const winnerLost = winnerUnitsStart - b.totalSurvivors;

  return (
    <div
      className="rounded overflow-hidden"
      style={{ backgroundColor: "var(--game-bg)" }}
    >
      {/* Summary row — clickable */}
      <div
        className="flex items-center justify-between px-3 py-1.5 text-[11px] cursor-pointer hover:opacity-80 transition-opacity"
        onClick={onToggle}
      >
        <div className="flex items-center gap-2">
          <span className="w-12 shrink-0" style={{ color: "var(--text-muted)" }}>
            {b.timestamp > 0 ? timeAgo(b.timestamp) : "\u2014"}
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
            {"\uD83D\uDC38"}{b.pepeUnitsStart} vs {"\uD83E\uDD8A"}{b.shibUnitsStart}
          </span>
          <span className="font-semibold" style={{ color: "var(--accent-yellow)" }}>
            {"\uD83D\uDCB0"} {formatUSDC(b.winnerPot + b.loserEarned)}
          </span>
          <span style={{ color: "var(--text-muted)", fontSize: "9px" }}>
            {expanded ? "\u25B2" : "\u25BC"}
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
                <span className="text-pepe font-semibold">{"\uD83D\uDC38"} {b.pepeUnitsStart}</span>
                <span style={{ color: "var(--text-muted)" }}>vs</span>
                <span className="text-shib font-semibold">{"\uD83E\uDD8A"} {b.shibUnitsStart}</span>
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
                  : "\u2014"
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
}

export default function BattleLog({ history }: { history: HistoryRecord[] }) {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  if (history.length === 0) {
    return (
      <div className="card text-center py-4">
        <span className="text-sm" style={{ color: "var(--text-muted)" }}>{"\u2694\uFE0F"} No battles yet this season</span>
      </div>
    );
  }

  return (
    <div className="card space-y-2">
      <h3 className="text-sm font-bold" style={{ color: "var(--text-secondary)" }}>{"\u2694\uFE0F"} Recent Activity</h3>
      <div className="space-y-1.5">
        {history.map((entry, i) => {
          if (entry.type === "retreat") {
            return <RetreatEntry key={`r-${entry.blockNumber}-${i}`} r={entry} />;
          }
          return (
            <BattleEntry
              key={`b-${entry.blockNumber}-${entry.laneId}-${i}`}
              b={entry}
              expanded={expandedIdx === i}
              onToggle={() => setExpandedIdx(expandedIdx === i ? null : i)}
            />
          );
        })}
      </div>
    </div>
  );
}
