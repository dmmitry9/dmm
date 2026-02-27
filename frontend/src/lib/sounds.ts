// Procedural sound effects using Web Audio API — zero dependencies
let audioCtx: AudioContext | null = null;
let muted = typeof localStorage !== "undefined" && localStorage.getItem("soundMuted") === "true";

function getCtx(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext();
  return audioCtx;
}

export function isMuted(): boolean {
  return muted;
}

export function toggleMute(): boolean {
  muted = !muted;
  localStorage.setItem("soundMuted", String(muted));
  return muted;
}

function playTone(freq: number, duration: number, type: OscillatorType = "sine", volume = 0.12) {
  if (muted) return;
  try {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch {
    // Silently fail if audio context unavailable
  }
}

/** Rising 3-note tone — unit deployment */
export function playDeploy() {
  playTone(440, 0.1, "square", 0.08);
  setTimeout(() => playTone(554, 0.1, "square", 0.08), 100);
  setTimeout(() => playTone(659, 0.15, "square", 0.08), 200);
}

/** Harsh clash — battle resolved */
export function playBattle() {
  playTone(200, 0.3, "sawtooth", 0.1);
  setTimeout(() => playTone(150, 0.2, "sawtooth", 0.08), 150);
  setTimeout(() => playTone(300, 0.15, "triangle", 0.06), 350);
}

/** Soft chime — weather changed */
export function playWeatherChange() {
  playTone(523, 0.2, "sine", 0.07);
  setTimeout(() => playTone(659, 0.3, "sine", 0.07), 200);
}

/** Fanfare — special event or season event */
export function playSeasonEvent() {
  playTone(523, 0.15, "triangle", 0.08);
  setTimeout(() => playTone(659, 0.15, "triangle", 0.08), 150);
  setTimeout(() => playTone(784, 0.3, "triangle", 0.08), 300);
}

/** Short confirm beep — donation/claim success */
export function playConfirm() {
  playTone(880, 0.12, "sine", 0.06);
  setTimeout(() => playTone(1100, 0.15, "sine", 0.06), 120);
}
