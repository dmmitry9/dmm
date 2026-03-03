import { useState } from "react";
import { FACTION, formatUSDC } from "../lib/constants";
import {
  useLeaderboard,
  sortLeaderboard,
  type LeaderboardTab,
  type LeaderboardEntry,
} from "../hooks/useLeaderboard";

const TABS: { key: LeaderboardTab; label: string; emoji: string }[] = [
  { key: "spenders", label: "Spent", emoji: "\uD83D\uDCB0" },
  { key: "active", label: "Active", emoji: "\u2694\uFE0F" },
  { key: "earners", label: "Earned", emoji: "\uD83D\uDC80" },
  { key: "roi", label: "ROI", emoji: "\uD83D\uDCC8" },
  { key: "hold", label: "Hold", emoji: "\uD83C\uDFF0" },
];

function truncateAddress(addr: string): string {
  return addr.length > 10 ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : addr;
}

function formatValue(entry: LeaderboardEntry, tab: LeaderboardTab): string {
  switch (tab) {
    case "spenders":
      return formatUSDC(entry.usdcSpent);
    case "active":
      return `${entry.squadsDeployed} squads`;
    case "earners":
      return formatUSDC(entry.earnings);
    case "roi":
      return entry.roi > 0 ? `${entry.roi.toFixed(0)}%` : "0%";
    case "hold":
      return entry.holdScore.toLocaleString();
  }
}

interface LeaderboardProps {
  seasonId: bigint | undefined;
  currentPlayer?: `0x${string}`;
}

export default function Leaderboard({ seasonId, currentPlayer }: LeaderboardProps) {
  const [tab, setTab] = useState<LeaderboardTab>("spenders");
  const entries = useLeaderboard(seasonId);
  const sorted = sortLeaderboard(entries, tab);

  return (
    <div className="card space-y-3">
      <h3 className="text-sm font-bold" style={{ color: "var(--text-secondary)" }}>
        {"\uD83C\uDFC6"} Leaderboard
      </h3>

      {/* Tabs */}
      <div className="flex gap-1 flex-wrap">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className="px-2 py-1 rounded-full text-[10px] font-semibold transition-all"
            style={{
              backgroundColor: tab === t.key ? "var(--accent-yellow-bold)" : "var(--game-bg)",
              color: tab === t.key ? "var(--accent-yellow)" : "var(--text-muted)",
              border: `1px solid ${tab === t.key ? "var(--accent-yellow)" : "var(--game-border)"}`,
            }}
          >
            {t.emoji} {t.label}
          </button>
        ))}
      </div>

      {/* Table */}
      {sorted.length === 0 ? (
        <div className="text-center py-4">
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
            No players yet this season
          </span>
        </div>
      ) : (
        <div className="space-y-1">
          {/* Header */}
          <div
            className="flex items-center text-[10px] uppercase tracking-wider px-2 py-1"
            style={{ color: "var(--text-muted)" }}
          >
            <span className="w-6">#</span>
            <span className="flex-1">Player</span>
            <span className="text-right w-24">
              {TABS.find((t) => t.key === tab)?.label}
            </span>
          </div>

          {/* Rows */}
          {sorted.map((entry, i) => {
            const isCurrentPlayer =
              currentPlayer?.toLowerCase() === entry.address.toLowerCase();
            const isPepe = entry.faction === FACTION.PEPE;
            const factionEmoji = isPepe ? "\uD83D\uDC38" : "\uD83E\uDD8A";
            const factionClass = isPepe ? "text-pepe" : "text-shib";

            return (
              <div
                key={entry.address}
                className="flex items-center text-[11px] px-2 py-1.5 rounded transition-all"
                style={{
                  backgroundColor: isCurrentPlayer
                    ? "var(--accent-yellow-bold)"
                    : i % 2 === 0
                    ? "var(--game-bg)"
                    : "transparent",
                  border: isCurrentPlayer
                    ? "1px solid var(--accent-yellow)"
                    : "1px solid transparent",
                }}
              >
                <span
                  className="w-6 font-bold"
                  style={{
                    color:
                      i === 0
                        ? "var(--accent-yellow)"
                        : i === 1
                        ? "var(--text-secondary)"
                        : i === 2
                        ? "#cd7f32"
                        : "var(--text-muted)",
                  }}
                >
                  {i === 0 ? "\uD83E\uDD47" : i === 1 ? "\uD83E\uDD48" : i === 2 ? "\uD83E\uDD49" : i + 1}
                </span>
                <span className="flex-1 flex items-center gap-1.5">
                  <span>{factionEmoji}</span>
                  <span
                    className={`font-mono ${factionClass}`}
                    style={{ fontSize: "10px" }}
                  >
                    {truncateAddress(entry.address)}
                  </span>
                  {isCurrentPlayer && (
                    <span
                      className="text-[9px] px-1 rounded"
                      style={{
                        backgroundColor: "var(--accent-yellow)",
                        color: "var(--game-bg)",
                      }}
                    >
                      YOU
                    </span>
                  )}
                </span>
                <span
                  className="text-right w-24 font-mono font-semibold"
                  style={{ color: "var(--text-primary)" }}
                >
                  {formatValue(entry, tab)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
