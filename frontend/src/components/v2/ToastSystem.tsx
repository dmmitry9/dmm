import { useState, useEffect, useCallback } from "react";
import { PixelSword, PixelStar, PixelSkull } from "./PixelSprites";

export interface ToastData {
  type: "deploy" | "battle-win" | "battle-loss";
  message: string;
}

interface ToastSystemProps {
  toast: ToastData | null;
}

export function useToast() {
  const [toast, setToast] = useState<ToastData | null>(null);

  const showToast = useCallback((data: ToastData) => {
    setToast(data);
    setTimeout(() => setToast(null), 3500);
  }, []);

  return { toast, showToast };
}

export default function ToastSystem({ toast }: ToastSystemProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (toast) {
      setVisible(true);
      const timer = setTimeout(() => setVisible(false), 3400);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  if (!visible || !toast) return null;

  const icon = toast.type === "deploy"
    ? <PixelSword scale={2} />
    : toast.type === "battle-win"
    ? <PixelStar scale={2} />
    : <PixelSkull scale={2} />;

  const borderColor = toast.type === "battle-loss" ? "var(--accent-red)" : "var(--accent-yellow)";

  return (
    <div className="pixel-toast">
      <div
        className="pixel-card flex items-center gap-3 px-4 py-3"
        style={{ borderColor, minWidth: 280 }}
      >
        <span className="shrink-0">{icon}</span>
        <span className="pixel-heading text-[9px]" style={{ color: "var(--text-primary)" }}>
          {toast.message}
        </span>
      </div>
    </div>
  );
}

// Confetti burst effect
export function ConfettiBurst({ active }: { active: boolean }) {
  const [pieces, setPieces] = useState<{ id: number; x: number; color: string; delay: number }[]>([]);

  useEffect(() => {
    if (active) {
      const colors = ["#4CAF50", "#FF9800", "#fdd835", "#e53935", "#7c3aed", "#42a5f5"];
      const newPieces = Array.from({ length: 25 }, (_, i) => ({
        id: Date.now() + i,
        x: Math.random() * 100,
        color: colors[Math.floor(Math.random() * colors.length)],
        delay: Math.random() * 0.5,
      }));
      setPieces(newPieces);
      setTimeout(() => setPieces([]), 2500);
    }
  }, [active]);

  return (
    <>
      {pieces.map((p) => (
        <div
          key={p.id}
          className="confetti-piece"
          style={{
            left: `${p.x}%`,
            top: "40%",
            backgroundColor: p.color,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
    </>
  );
}
