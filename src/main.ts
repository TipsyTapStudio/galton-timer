/**
 * GALTON-TIMER — main entry point.
 * "Chaos to Order, Randomness to Truth."
 */

import { readParams, writeParams } from './utils/url-params';
import { createPRNG } from './utils/seed';
import { Simulation } from './engine/simulation';
import { Renderer } from './engine/renderer';
import { playSettledChime } from './engine/audio';
import { createSettingsBar } from './components/ui';

// ── Bootstrap ──

const params = readParams();
writeParams(params);

const rng = createPRNG(params.s);
const FALL_DURATION_SEC = 3.5;

const sim = new Simulation({
  numRows: params.rows,
  totalParticles: params.n,
  totalTimeSec: params.t,
  fallDurationSec: FALL_DURATION_SEC,
  rng,
});

// ── DOM ──

const container = document.getElementById('app')!;
const renderer = new Renderer(container, params.rows, params.n, params.s);
document.body.appendChild(createSettingsBar(params));

// ── State ──

let lastTime: number | null = null;
let chimePlayed = false;
let paused = false;

// ── Resize ──

window.addEventListener('resize', () => {
  renderer.resize(params.rows);
  // Redraw static frame when paused or finished
  if (paused || sim.allSettled) {
    renderer.drawFrame(
      sim.activeParticles,
      sim.getRemainingTimeSec(),
      sim.totalParticles,
      sim.emittedCount,
      paused,
    );
  }
});

// ── Pause / Resume (Space) ──

document.addEventListener('keydown', (e) => {
  if (e.code === 'Space') {
    e.preventDefault();
    if (sim.allSettled) return;
    paused = !paused;
    if (!paused) {
      lastTime = null; // avoid dt spike after unpause
      requestAnimationFrame(frame);
    } else {
      // Draw one paused frame
      renderer.drawFrame(
        sim.activeParticles,
        sim.getRemainingTimeSec(),
        sim.totalParticles,
        sim.emittedCount,
        true,
      );
    }
  }
});

// ── Loop ──

function frame(now: number): void {
  if (paused) return;

  if (lastTime === null) lastTime = now;
  const dt = Math.min(now - lastTime, 100);
  lastTime = now;

  // Physics + emission
  const geom = renderer.getGeom();
  const settled = sim.update(dt, geom, (x) => renderer.getGroundY(x));

  // Bake settled particles
  for (const p of settled) {
    renderer.bakeParticle(p);
  }

  // Draw dynamic layer
  renderer.drawFrame(
    sim.activeParticles,
    sim.getRemainingTimeSec(),
    sim.totalParticles,
    sim.emittedCount,
    false,
  );

  // End chime
  if (sim.allSettled && !chimePlayed) {
    chimePlayed = true;
    playSettledChime();
  }

  if (!sim.allSettled) {
    requestAnimationFrame(frame);
  }
}

requestAnimationFrame(frame);
