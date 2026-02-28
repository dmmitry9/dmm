import { useEffect, useState } from "react";
import { FACTION } from "../lib/constants";

interface BattleToastData {
  winner: number;
  laneId: number;
  survivors: number;
  earnings: string;
}

export default function BattleToast({ data }: { data: BattleToastData | null }) {
  const [visible, setVisible] = useState(false);
  const [current, setCurrent] = useState<BattleToastData | null>(null);

  useEffect(() => {
    if (data) {
      setCurrent(data);
      setVisible(true);
      const timer = setTimeout(() => setVisible(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [data]);

  if (!visible || !current) return null;

  const isPepe = current.winner === FACTION.PEPE;
  const emoji = isPepe ? "🐸" : "🦊";
  const label = isPepe ? "PEPE" : "SHIB";
  const colorClass = isPepe ? "text-pepe" : "text-shib";
  const borderColor = isPepe ? "rgba(76, 175, 80, 0.6)" : "rgba(255, 152, 0, 0.6)";

  return (
    <div
      className="battle-toast rounded-xl px-4 py-3 shadow-2xl text-sm font-bold"
      style={{
        backgroundColor: "var(--game-card)",
        border: `2px solid ${borderColor}`,
        color: "var(--text-primary)",
      }}
    >
      <span className={colorClass}>{emoji} {label} WIN</span>
      <span style={{ color: "var(--text-secondary)" }}>
        {" "}— Lane {current.laneId + 1} — {current.survivors} survivors
      </span>
      {current.earnings !== "$0.00" && (
        <span style={{ color: "var(--accent-yellow)" }}> — 💰 {current.earnings}</span>
      )}
    </div>
  );
}
