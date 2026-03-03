import { useState, useEffect } from "react";
import { PixelSword, PixelRocket, PixelTrophy, PixelCoin } from "./PixelSprites";

const STORAGE_KEY = "v2-tour-done";

const STEPS = [
  {
    title: "The Battlefield",
    text: "3 lanes lead to the enemy bastion. Deploy units to march and conquer!",
    icon: <PixelSword scale={2} />,
    target: "v2-map",
  },
  {
    title: "Deploy Troops",
    text: "Mix unit types for best results. Swords beat Spears, Spears beat Cavalry, Cavalry beats Swords!",
    icon: <PixelRocket scale={2} />,
    target: "v2-deploy",
  },
  {
    title: "Season Timer",
    text: "Hold the bastion to earn USDC every minute. Season ends after ~5.6 hours.",
    icon: <PixelTrophy scale={2} />,
    target: "v2-season",
  },
  {
    title: "Claim Rewards",
    text: "Earned from battle kills and holding the bastion. Don't forget to claim!",
    icon: <PixelCoin scale={2} />,
    target: "v2-rewards",
  },
];

export default function OnboardingTour() {
  const [step, setStep] = useState(-1); // -1 = not showing
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const done = localStorage.getItem(STORAGE_KEY);
    if (!done) {
      // Small delay before showing
      const t = setTimeout(() => setStep(0), 1500);
      return () => clearTimeout(t);
    } else {
      setDismissed(true);
    }
  }, []);

  const handleNext = () => {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      handleDone();
    }
  };

  const handleDone = () => {
    localStorage.setItem(STORAGE_KEY, "1");
    setStep(-1);
    setDismissed(true);
  };

  if (dismissed || step < 0) return null;

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <>
      {/* Backdrop */}
      <div className="tour-backdrop" onClick={handleDone} />

      {/* Tooltip */}
      <div
        className="fixed inset-0 z-[301] flex items-center justify-center pointer-events-none"
      >
        <div
          className="pixel-card pointer-events-auto max-w-xs"
          style={{
            borderColor: "var(--accent-yellow)",
            boxShadow: "4px 4px 0 rgba(0,0,0,0.4)",
          }}
        >
          <div className="flex items-start gap-3 mb-3">
            <span className="shrink-0 mt-1">{current.icon}</span>
            <div>
              <h3 className="pixel-heading text-[10px] mb-1" style={{ color: "var(--accent-yellow)" }}>
                {current.title}
              </h3>
              <p className="text-[11px]" style={{ color: "var(--text-secondary)" }}>
                {current.text}
              </p>
            </div>
          </div>

          {/* Progress */}
          <div className="flex items-center justify-between">
            <div className="flex gap-1">
              {STEPS.map((_, i) => (
                <div
                  key={i}
                  className="w-2 h-2"
                  style={{
                    backgroundColor: i === step ? "var(--accent-yellow)" : "var(--game-border)",
                  }}
                />
              ))}
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleDone}
                className="text-[9px] px-2 py-1"
                style={{ color: "var(--text-muted)" }}
              >
                Skip
              </button>
              <button
                onClick={handleNext}
                className="pixel-btn !px-3 !py-1 !text-[9px]"
                style={{ backgroundColor: "var(--accent-yellow)", color: "#1a1a2e", borderColor: "#92400e", boxShadow: "2px 2px 0 #92400e" }}
              >
                {isLast ? "Got it!" : "Next"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
