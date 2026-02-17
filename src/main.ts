/**
 * GALTON-TIMER — main entry point.
 * "Chaos to Order, Randomness to Truth."
 *
 * Time authority: The Web Worker timer is the SOLE source of truth for elapsed time.
 * The simulation never self-increments elapsedMs — it receives it from Worker ticks.
 * On tab-hidden, the Worker keeps running (never paused). On restore, we snap.
 */

import { readParams, writeParams } from './utils/url-params';
import type { AppMode } from './utils/url-params';
import { createPRNG } from './utils/seed';
import { Simulation } from './engine/simulation';
import { Renderer, getThemeByName } from './engine/renderer';
import { gaussianHW } from './engine/layout';
import { TimerBridge } from './engine/timer-bridge';
import { createConsole, applyPreset } from './components/console';

// ── Bootstrap ──

const params = readParams();

// CLOCK mode overrides
const isClockMode = params.app === 'clock';
if (isClockMode) {
  params.n = 3600;
  params.t = 3600;
} else if (params.timerMode === 'seconds') {
  params.n = params.t; // 1:1 sync: one grain per second
}
writeParams(params);

const rng = createPRNG(params.s);

let sim = new Simulation({
  numRows: params.rows,
  totalParticles: params.n,
  totalTimeSec: params.t,
  rng,
});

// ── DOM ──

const container = document.getElementById('app')!;
const renderer = new Renderer(container, params.rows, params.n, params.s);

// ── Apply initial theme + clock ──

renderer.setThemeByName(params.theme);
renderer.setClockEnabled(params.clock);
renderer.setGlowIntensity(1.0); // Fixed recommended glow

// ── Apply initial mode preset ──

applyPreset(params.mode);

// ── Web Worker Timer (SOLE time authority) ──

const timerBridge = new TimerBridge();
let workerRemainingMs = params.t * 1000;

// Clock mode: worker elapsed starts from 0 for the remaining portion of the hour,
// but the simulation needs the full hour-elapsed offset so grains continue emitting.
let clockElapsedOffset = 0;

timerBridge.onTick = (remainingMs, elapsedMs) => {
  workerRemainingMs = remainingMs;
  sim.setElapsedMs(elapsedMs + clockElapsedOffset);
  consoleCtrl.setTime(remainingMs);
};

timerBridge.onDone = () => {
  workerRemainingMs = 0;
  consoleCtrl.setTime(0);

  if (isClockMode) {
    // Hourly refill — no alarm, auto restart
    startTheLoop();
  } else {
    renderer.startAlarm();
    consoleCtrl.setStatus('alarm');
  }
};

// ── Console ──

const consoleCtrl = createConsole(
  params.mode,
  params.theme,
  params.t,
  params.cs,
  params.app,
  params.friction,
);

// Set initial accent color
consoleCtrl.setAccentColor(getThemeByName(params.theme).segmentRGB);

// Auto-hide timer (5 seconds)
let hideTimeout: ReturnType<typeof setTimeout> | null = null;

function showConsole(): void {
  consoleCtrl.show();
  if (hideTimeout !== null) clearTimeout(hideTimeout);
  hideTimeout = setTimeout(() => consoleCtrl.hide(), 5000);
}

document.addEventListener('mousemove', showConsole);
document.addEventListener('touchstart', showConsole);
showConsole();

// Console callbacks
consoleCtrl.onModeChange = (modeName: string) => {
  applyPreset(modeName);
  params.mode = modeName;
  writeParams(params);
};

consoleCtrl.onThemeChange = (themeName: string) => {
  renderer.setThemeByName(themeName);
  consoleCtrl.setThemeName(themeName);
  consoleCtrl.setAccentColor(getThemeByName(themeName).segmentRGB);
  params.theme = themeName.toLowerCase();
  writeParams(params);
};

consoleCtrl.onCentisecondsToggle = (enabled: boolean) => {
  params.cs = enabled;
  writeParams(params);
};

consoleCtrl.onDurationChange = (sec: number) => {
  params.t = sec;
  writeParams(params);
};

consoleCtrl.onAppModeChange = (mode: AppMode) => {
  params.app = mode;
  writeParams(params);
  // Reload to fully reinitialize with new mode
  window.location.reload();
};

consoleCtrl.onGravityChange = (_value: number) => {
  // Gravity is set directly on PHYSICS by the console slider
};

consoleCtrl.onFrictionChange = (value: number) => {
  params.friction = value;
  writeParams(params);
};

consoleCtrl.onPause = () => togglePause();
consoleCtrl.onStart = () => {
  if (paused) togglePause();      // resume if paused
  else if (appState === 'idle' || sim.allSettled) startTheLoop(); // restart
};
consoleCtrl.onStop = () => stopToIdle();

consoleCtrl.onShareURL = () => {
  writeParams(params);
  navigator.clipboard.writeText(window.location.href).catch(() => {});
};

consoleCtrl.onResetDefaults = () => {
  window.location.search = '';
};

// ── State ──

type AppState = 'running' | 'paused' | 'purging' | 'refilling' | 'stopping' | 'idle';
let appState: AppState = 'idle';
let lastTime: number | null = null;
let paused = false;
let rafId = 0;
let hopperFadeAlpha = 1;

// Rain particles for refill animation
let rainParticles: { x: number; y: number; vx: number; vy: number; alpha: number; bounces: number }[] = [];
let refillElapsed = 0;

// ── Helpers ──

function getCs(): number | undefined {
  if (isClockMode) return undefined;
  if (!params.cs) return undefined;
  return Math.floor((workerRemainingMs % 1000) / 10);
}

function getWallClockSec(): number | undefined {
  if (!isClockMode) return undefined;
  const now = new Date();
  return now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
}

function togglePause(): void {
  if (appState === 'purging' || appState === 'refilling' || appState === 'stopping') return;
  if (sim.allSettled) return;

  paused = !paused;
  consoleCtrl.setPaused(paused);

  if (paused) {
    appState = 'paused';
    timerBridge.pause();
    cancelAnimationFrame(rafId);
    renderer.drawFrame(
      sim.activeParticles,
      workerRemainingMs / 1000,
      sim.totalParticles,
      sim.emittedCount,
      true,
      sim.totalTimeMs,
      undefined,
      getCs(),
      getWallClockSec(),
    );
  } else {
    appState = 'running';
    timerBridge.resume();
    lastTime = null;
    rafId = requestAnimationFrame(frame);
  }
}

function startTheLoop(): void {
  timerBridge.reset();
  cancelAnimationFrame(rafId);
  renderer.stopAlarm();
  renderer.beginPurge();
  appState = 'purging';
  consoleCtrl.setStatus('ending');
  consoleCtrl.setDurationEnabled(false);
  lastTime = null;
  rafId = requestAnimationFrame(frame);
}

function stopToIdle(): void {
  cancelAnimationFrame(rafId);
  timerBridge.reset();
  renderer.stopAlarm();
  paused = false;
  consoleCtrl.setPaused(false);

  // Fill stacks with binomial distribution
  renderer.fillStacks(params.rows, params.n);

  // Begin hopper fade-out
  renderer.beginHopperFade();
  hopperFadeAlpha = 1;
  appState = 'stopping';
  consoleCtrl.setStatus('idle');
  consoleCtrl.setDurationEnabled(true);
  lastTime = null;
  rafId = requestAnimationFrame(frame);
}

function beginRefill(): void {
  appState = 'refilling';
  refillElapsed = 0;
  rainParticles = [];

  const L = renderer.layout;
  const hopperHW = L.hopperTopHW;
  const count = Math.min(Math.round(params.n * 0.15), 400);
  for (let i = 0; i < count; i++) {
    const tx = (Math.random() - 0.5) * 2;
    rainParticles.push({
      x: L.centerX + tx * hopperHW * 0.85,
      y: L.hopperTop - 5 - Math.random() * 25,
      vx: (Math.random() - 0.5) * 8,
      vy: 300 + Math.random() * 50,
      alpha: 0.5 + Math.random() * 0.3,
      bounces: 0,
    });
  }
}

function startFresh(): void {
  sim.reset();
  renderer.clearStatic();
  renderer.resize(params.rows);

  workerRemainingMs = params.t * 1000;
  paused = false;
  appState = 'running';

  consoleCtrl.setPaused(false);
  consoleCtrl.setStatus('ready');
  consoleCtrl.setTime(params.t * 1000);
  consoleCtrl.setDurationEnabled(false);

  setTimeout(() => {
    if (appState === 'running') {
      consoleCtrl.setStatus('running');
    }
  }, 1000);

  if (isClockMode) {
    // Start from current position within the hour
    const now = new Date();
    const min = now.getMinutes();
    const sec = now.getSeconds();
    const ms = now.getMilliseconds();
    const elapsedInHourMs = (min * 60 + sec) * 1000 + ms;
    const remainingMs = 3600000 - elapsedInHourMs;

    // Store offset so onTick adds it to worker's elapsed
    clockElapsedOffset = elapsedInHourMs;

    timerBridge.start(remainingMs);
    workerRemainingMs = remainingMs;

    // Instantly snap elapsed grains into place
    sim.setElapsedMs(elapsedInHourMs);
    const geom = renderer.getGeom();
    const snapped = sim.instantSnap(geom);
    for (const p of snapped) {
      renderer.bakeParticle(p);
    }
  } else {
    clockElapsedOffset = 0;
    timerBridge.start(params.t * 1000);
  }

  lastTime = null;
  rafId = requestAnimationFrame(frame);
}

function bakeSettledBatch(particles: import('./engine/simulation').Particle[]): void {
  for (const p of particles) {
    renderer.bakeParticle(p);
  }
}

// ── Resize ──

window.addEventListener('resize', () => {
  renderer.resize(params.rows);
  if (paused || sim.allSettled) {
    renderer.drawFrame(
      sim.activeParticles,
      workerRemainingMs / 1000,
      sim.totalParticles,
      sim.emittedCount,
      paused,
      sim.totalTimeMs,
      undefined,
      getCs(),
      getWallClockSec(),
    );
  }
});

// ── Pause / Resume (Space) ──

document.addEventListener('keydown', (e) => {
  if (e.code === 'Space') {
    e.preventDefault();
    togglePause();
  }
});

// ── Visibility API (Instant Snap) ──

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    cancelAnimationFrame(rafId);
  } else {
    if (appState !== 'running') {
      if (appState === 'purging' || appState === 'refilling' || appState === 'stopping') {
        lastTime = null;
        rafId = requestAnimationFrame(frame);
      }
      return;
    }

    const geom = renderer.getGeom();
    const forcedSettled = sim.forceSettleActive();
    bakeSettledBatch(forcedSettled);
    const snapped = sim.instantSnap(geom);
    bakeSettledBatch(snapped);

    renderer.drawFrame(
      sim.activeParticles,
      workerRemainingMs / 1000,
      sim.totalParticles,
      sim.emittedCount,
      false,
      sim.totalTimeMs,
      undefined,
      getCs(),
      getWallClockSec(),
    );

    lastTime = null;
    rafId = requestAnimationFrame(frame);
  }
});

// ── Main Loop ──

function frame(now: number): void {
  if (appState === 'paused' || appState === 'idle') return;

  if (lastTime === null) lastTime = now;
  const dtMs = Math.min(now - lastTime, 100);
  const dtSec = dtMs / 1000;
  lastTime = now;

  if (appState === 'purging') {
    const done = renderer.purgeStacks(dtSec);
    renderer.drawFrame([], 0, sim.totalParticles, sim.totalParticles, false, sim.totalTimeMs);

    if (done) {
      beginRefill();
    }
    rafId = requestAnimationFrame(frame);
    return;
  }

  if (appState === 'refilling') {
    refillElapsed += dtMs;

    const L = renderer.layout;
    const gravity = 400;
    for (const p of rainParticles) {
      p.vy += gravity * dtSec;
      p.x += p.vx * dtSec;
      p.y += p.vy * dtSec;

      if (p.y >= L.hopperBottom) {
        p.y = L.hopperBottom - 1;
        if (p.bounces < 3 && Math.abs(p.vy) > 15) {
          const e = 0.15 + Math.random() * 0.30;
          p.vy = -Math.abs(p.vy) * e;
          p.vx = (Math.random() - 0.5) * 60;
          p.bounces++;
        } else {
          p.vy = 0;
          p.vx = 0;
          p.alpha = Math.max(0, p.alpha - dtSec * 1.8);
        }
      }

      const hw = gaussianHW(p.y, L);
      const maxX = L.centerX + hw * 0.88;
      const minX = L.centerX - hw * 0.88;
      if (p.x > maxX) { p.x = maxX; p.vx = -Math.abs(p.vx) * 0.3; }
      if (p.x < minX) { p.x = minX; p.vx = Math.abs(p.vx) * 0.3; }
    }
    rainParticles = rainParticles.filter(p => p.alpha > 0.01);

    renderer.drawFrame([], params.t, sim.totalParticles, 0, false, sim.totalTimeMs, rainParticles);

    if (refillElapsed >= 800) {
      startFresh();
      return;
    }
    rafId = requestAnimationFrame(frame);
    return;
  }

  // ── Stopping state (hopper fade-out) ──
  if (appState === 'stopping') {
    hopperFadeAlpha -= dtSec / 0.3; // 0.3s fade
    renderer.setHopperFadeAlpha(Math.max(0, hopperFadeAlpha));
    renderer.drawFrame([], 0, sim.totalParticles, sim.totalParticles, false, sim.totalTimeMs);
    if (hopperFadeAlpha <= 0) {
      appState = 'idle';
      renderer.resetHopperFade();
      return; // idle — stop loop
    }
    rafId = requestAnimationFrame(frame);
    return;
  }

  // ── Running state ──
  const geom = renderer.getGeom();
  const settled = sim.update(dtMs, geom, (x) => renderer.getGroundY(x));

  for (const p of settled) {
    renderer.bakeParticle(p);
  }

  renderer.drawFrame(
    sim.activeParticles,
    workerRemainingMs / 1000,
    sim.totalParticles,
    sim.emittedCount,
    false,
    sim.totalTimeMs,
    undefined,
    getCs(),
    getWallClockSec(),
  );

  if (!sim.allSettled) {
    rafId = requestAnimationFrame(frame);
  } else {
    consoleCtrl.setStatus('ending');
  }
}

// ── Initial start ──

startFresh();
