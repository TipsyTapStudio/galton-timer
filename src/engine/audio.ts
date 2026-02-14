/**
 * Minimalist sound synthesis via Web Audio API.
 * Plays a sine-wave decay (singing-bowl resonance) on simulation end.
 */

let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  return audioCtx;
}

/** Play a single sine-wave tone with exponential decay. */
export function playSettledChime(): void {
  try {
    const ctx = getCtx();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(528, now);         // C5-ish
    osc.frequency.exponentialRampToValueAtTime(264, now + 3); // octave down

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 3);

    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 3);
  } catch {
    // Audio may be blocked by browser policy; fail silently.
  }
}
