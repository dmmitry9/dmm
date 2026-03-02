import { useState } from "react";
import { FACTION, formatUSDC } from "../../lib/constants";
import type { HistoryRecord, BattleRecord } from "../../hooks/useGameState";
import { PixelPepe, PixelShib, PixelStar, PixelSkull, PixelCoin, PixelSwordsman, PixelSword } from "./PixelSprites";

function timeAgo(timestamp: number): string {
  const now = Math.floor(Date.now() / 1000);
  const diff = now - timestamp;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function memeMessage(b: BattleRecord): string {
  const isPepe = b.winner === FACTION.PEPE;
  const winName = isPepe ? "PEPE" : "SHIB";
  const loseName = isPepe ? "SHIB" : "PEPE";
  const ratio = b.pepeCombat > 0 && b.shibCombat > 0
    ? Math.max(b.pepeCombat, b.shibCombat) / Math.min(b.pepeCombat, b.shibCombat)
    : 1;

  if (ratio > 3) return `${winName} absolutely demolished ${loseName}!`;
  if (ratio > 1.5) return `${winName} dominated Lane ${b.laneId + 1}!`;
  if (ratio > 1.1) return `${winName} barely survived!`;
  return `Nail-biter on Lane ${b.laneId + 1}!`;
}

function BattleEntryV2({
  b,
  expanded,
  onToggle,
  onHighlightLane,
}: {
  b: BattleRecord;
  expanded: boolean;
  onToggle: () => void;
  onHighlightLane?: (laneId: number) => void;
}) {
  const isPepe = b.winner === FACTION.PEPE;
  const winColor = isPepe ? "text-pepe" : "text-shib";

  const winnerUnitsStart = isPepe ? b.pepeUnitsStart : b.shibUnitsStart;
  const loserUnitsStart = isPepe ? b.shibUnitsStart : b.pepeUnitsStart;
  const winnerLost = winnerUnitsStart - b.totalSurvivors;

  return (
    <div className="pixel-card" style={{ padding: 0 }}>
      {/* Summary row — clickable */}
      <div
        className="flex items-center justify-between px-3 py-2 cursor-pointer hover:opacity-80 transition-opacity"
        onClick={() => {
          onToggle();
          onHighlightLane?.(b.laneId);
        }}
      >
        <div className="flex items-center gap-2">
          <span className="shrink-0">
            {isPepe ? <PixelPepe scale={1} /> : <PixelShib scale={1} />}
          </span>
          <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
            {b.timestamp > 0 ? timeAgo(b.timestamp) : "—"}
          </span>
          <span className={`text-[10px] font-bold ${winColor}`}>
            L{b.laneId + 1}
          </span>
          <span className="shrink-0"><PixelStar scale={1} /></span>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1">
            <PixelCoin scale={1} />
            <span className="text-[10px] font-mono font-bold" style={{ color: "var(--accent-yellow)" }}>
              {formatUSDC(b.winnerPot + b.loserEarned)}
            </span>
          </span>
          <span className="text-[9px]" style={{ color: "var(--text-muted)" }}>
            {expanded ? "▲" : "▼"}
          </span>
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div
          className="px-3 pb-3 pt-2 space-y-2"
          style={{ borderTop: "2px solid var(--game-border)" }}
        >
          <p className="pixel-heading text-[8px]" style={{ color: "var(--text-secondary)" }}>
            {memeMessage(b)}
          </p>

          {/* Starting forces */}
          <div className="grid grid-cols-2 gap-2 text-[10px]">
            <div>
              <span className="block text-[9px] uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                Starting Forces
              </span>
              <div className="flex items-center gap-2 mt-1">
                <span className="flex items-center gap-1">
                  <PixelPepe scale={1} />
                  <span className="text-pepe font-bold">{b.pepeUnitsStart}</span>
                </span>
                <span style={{ color: "var(--text-muted)" }}>vs</span>
                <span className="flex items-center gap-1">
                  <PixelShib scale={1} />
                  <span className="text-shib font-bold">{b.shibUnitsStart}</span>
                </span>
              </div>
            </div>
            <div>
              <span className="block text-[9px] uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                Combat Power
              </span>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-pepe font-mono">{b.pepeCombat.toLocaleString()}</span>
                <span style={{ color: "var(--text-muted)" }}>vs</span>
                <span className="text-shib font-mono">{b.shibCombat.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Outcome */}
          <div className="grid grid-cols-3 gap-2 text-[10px]">
            <div>
              <span className="block text-[9px] uppercase" style={{ color: "var(--text-muted)" }}>Survivors</span>
              <span className={`${winColor} font-bold flex items-center gap-1`}>
                {isPepe ? <PixelPepe scale={1} /> : <PixelShib scale={1} />}
                {b.totalSurvivors}
              </span>
            </div>
            <div>
              <span className="block text-[9px] uppercase" style={{ color: "var(--text-muted)" }}>Casualties</span>
              <span style={{ color: "var(--accent-red)" }} className="flex items-center gap-1">
                <PixelSkull scale={1} /> -{winnerLost} / -{loserUnitsStart}
              </span>
            </div>
            <div>
              <span className="block text-[9px] uppercase" style={{ color: "var(--text-muted)" }}>Spoils</span>
              <span className="flex items-center gap-1" style={{ color: "var(--accent-green)" }}>
                <PixelCoin scale={1} />
                <span className="font-bold">{formatUSDC(b.winnerPot)}</span>
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface BattleLogV2Props {
  history: HistoryRecord[];
  onHighlightLane?: (laneId: number) => void;
}

export default function BattleLogV2({ history, onHighlightLane }: BattleLogV2Props) {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  if (history.length === 0) {
    return (
      <div className="pixel-card text-center py-6">
        <div className="flex justify-center mb-2">
          <PixelSwordsman faction="pepe" scale={3} />
        </div>
        <p className="pixel-heading text-[9px]" style={{ color: "var(--text-muted)" }}>
          No battles yet...
        </p>
        <p className="text-[10px] mt-1" style={{ color: "var(--text-muted)" }}>
          The calm before the storm
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h3 className="pixel-heading text-[10px] flex items-center gap-2">
        <PixelSword scale={1.5} />
        <span>Battle Log</span>
      </h3>
      <div className="space-y-2">
        {history.map((entry, i) => (
          <BattleEntryV2
            key={`b-${entry.blockNumber}-${entry.laneId}-${i}`}
            b={entry}
            expanded={expandedIdx === i}
            onToggle={() => setExpandedIdx(expandedIdx === i ? null : i)}
            onHighlightLane={onHighlightLane}
          />
        ))}
      </div>
    </div>
  );
}
