/**
 * Physics-based particle simulation.
 * NO PHYSICS ENGINE — simplified gravity + peg-collision model.
 *
 * Each particle carries:
 *   - Pre-computed 50/50 path  (mathematical truth, P(k)=C(n,k)(1/2)^n)
 *   - Live physics state        (x, y, vx, vy — unique kinetic drama)
 */

// ── Types ───────────────────────────────────────────────────────────

export interface Particle {
  path: number[];       // 0=left, 1=right at each peg row
  bin: number;          // final bin = sum(path)
  x: number;            // px
  y: number;            // px
  vx: number;           // px/s
  vy: number;           // px/s
  pegIndex: number;     // next peg row to interact with
  settled: boolean;
  jitter: number;       // [0,1) per-particle randomness seed
}

export interface BoardGeom {
  emitX: number;
  emitY: number;
  pegX: (row: number, index: number) => number;
  pegY: (row: number) => number;
  pegSpacing: number;
  numRows: number;
  accBottom: number;
}

export interface SimConfig {
  numRows: number;
  totalParticles: number;
  totalTimeSec: number;
  fallDurationSec: number;
  rng: () => number;
}

// ── Physics constants (tuning knobs) ────────────────────────────────

const FALL_FRACTION = 0.55;
const RESTITUTION_MIN = 0.10;
const RESTITUTION_RANGE = 0.18;
const KICK_FACTOR = 2.0;
const X_CORRECTION = 0.40;
const DRAG = 3.0;
const DRAG_SETTLE = 6.0;

// ── Helpers ─────────────────────────────────────────────────────────

function fract(x: number): number {
  return x - Math.floor(x);
}

export function maxBinProbability(numRows: number): number {
  const k = Math.floor(numRows / 2);
  let logC = 0;
  for (let i = 1; i <= numRows; i++) logC += Math.log(i);
  for (let i = 1; i <= k; i++) logC -= Math.log(i);
  for (let i = 1; i <= numRows - k; i++) logC -= Math.log(i);
  return Math.exp(logC - numRows * Math.LN2);
}

// ── Simulation ──────────────────────────────────────────────────────

export class Simulation {
  readonly numRows: number;
  readonly totalParticles: number;
  readonly totalTimeMs: number;

  binCounts: number[];
  activeParticles: Particle[] = [];
  emittedCount = 0;
  elapsedMs = 0;
  allEmitted = false;
  allSettled = false;

  private rng: () => number;
  private fallDurationSec: number;
  private emitIntervalMs: number;
  private emitAccumulator = 0;
  private gravity = 0;

  constructor(cfg: SimConfig) {
    this.numRows = cfg.numRows;
    this.totalParticles = cfg.totalParticles;
    this.totalTimeMs = cfg.totalTimeSec * 1000;
    this.fallDurationSec = cfg.fallDurationSec;
    this.rng = cfg.rng;
    this.binCounts = new Array(cfg.numRows + 1).fill(0);
    this.emitIntervalMs = this.totalTimeMs / cfg.totalParticles;
  }

  /** Advance simulation. Returns newly-settled particles for baking. */
  update(
    dtMs: number,
    geom: BoardGeom,
    getGroundY: (x: number) => number,
  ): Particle[] {
    const dt = Math.min(dtMs, 100) / 1000; // seconds, capped
    this.elapsedMs += dtMs;
    const settled: Particle[] = [];

    // Calibrate gravity once from actual layout dimensions
    if (this.gravity === 0) {
      const totalH = geom.accBottom - geom.emitY;
      const ft = this.fallDurationSec * FALL_FRACTION;
      this.gravity = Math.max(100, (2 * totalH) / (ft * ft));
    }

    // ── Emission ──
    if (!this.allEmitted) {
      this.emitAccumulator += dtMs;
      while (
        this.emitAccumulator >= this.emitIntervalMs &&
        this.emittedCount < this.totalParticles
      ) {
        this.activeParticles.push(this.createParticle(geom));
        this.emitAccumulator -= this.emitIntervalMs;
      }
      if (this.emittedCount >= this.totalParticles) this.allEmitted = true;
    }

    // ── Physics ──
    const alive: Particle[] = [];
    const halfBoard =
      geom.pegSpacing * (this.numRows / 2 + 1.5);

    for (const p of this.activeParticles) {
      // Gravity
      p.vy += this.gravity * dt;

      // Drag (stronger in settling zone)
      const drag = p.pegIndex >= this.numRows ? DRAG_SETTLE : DRAG;
      p.vx *= Math.exp(-drag * dt);

      // Integrate
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      // ── Peg collisions ──
      while (p.pegIndex < this.numRows) {
        const pegRowY = geom.pegY(p.pegIndex);
        if (p.y < pegRowY) break;

        const dir = p.path[p.pegIndex];
        const bj = fract(p.jitter * 997.0 + p.pegIndex * 7.31);

        // Target peg x
        let hIdx = 0;
        for (let i = 0; i < p.pegIndex; i++) hIdx += p.path[i];
        const tgtX = geom.pegX(p.pegIndex, hIdx);

        // Partial x-correction toward target
        p.x = p.x * (1 - X_CORRECTION) + tgtX * X_CORRECTION;
        p.y = pegRowY;

        // Bounce
        p.vy = -Math.abs(p.vy) * (RESTITUTION_MIN + RESTITUTION_RANGE * bj);

        // Horizontal kick
        const kickDir = dir === 1 ? 1 : -1;
        p.vx = kickDir * geom.pegSpacing * KICK_FACTOR * (0.8 + 0.4 * bj);

        p.pegIndex++;
      }

      // ── Settling ──
      if (p.pegIndex >= this.numRows && p.vy > 0) {
        const groundY = getGroundY(p.x);
        if (p.y >= groundY) {
          p.y = groundY;
          p.settled = true;
          this.binCounts[p.bin]++;
          settled.push(p);
          continue; // skip alive push
        }
      }

      // Horizontal bounds
      p.x = Math.max(geom.emitX - halfBoard, Math.min(geom.emitX + halfBoard, p.x));

      alive.push(p);
    }

    this.activeParticles = alive;
    if (this.allEmitted && alive.length === 0) this.allSettled = true;

    return settled;
  }

  getRemainingTimeSec(): number {
    return Math.max(0, (this.totalTimeMs - this.elapsedMs) / 1000);
  }

  private createParticle(geom: BoardGeom): Particle {
    const path: number[] = [];
    let bin = 0;
    for (let i = 0; i < this.numRows; i++) {
      const d = this.rng() < 0.5 ? 0 : 1;
      path.push(d);
      bin += d;
    }
    this.emittedCount++;
    return {
      path,
      bin,
      x: geom.emitX,
      y: geom.emitY,
      vx: 0,
      vy: 0,
      pegIndex: 0,
      settled: false,
      jitter: this.rng(),
    };
  }
}
