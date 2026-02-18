/**
 * Physics-based particle simulation.
 * NO PHYSICS ENGINE — simplified gravity + peg-collision model.
 *
 * Each particle carries:
 *   - Pre-computed 50/50 path  (mathematical truth, P(k)=C(n,k)(1/2)^n)
 *   - Live physics state        (x, y, vx, vy — unique kinetic drama)
 *
 * Collision model: normal-based reflection off circular peg surfaces.
 * The deflection direction emerges from geometry (collision normal),
 * NOT from artificial kick forces.
 *
 * Time authority: elapsedMs is set EXCLUSIVELY by the Web Worker timer.
 * The simulation never self-increments elapsed time.
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
  rng: () => number;
}

// ── Physics constants (tuning knobs — live-editable via Console) ──

export type PhysicsParams = {
  restitution: number;    // coefficient of restitution (0 = perfectly inelastic, 1 = elastic)
  restitutionRange: number; // per-particle random spread added to restitution
  nudge: number;          // gentle position correction toward expected peg (0–0.15)
  dragX: number;
  dragY: number;
  dragXSettle: number;
  dragYSettle: number;
  gravity: number;
};

export const PRESETS: Record<string, PhysicsParams> = {
  'Standard': {
    restitution: 0.20, restitutionRange: 0.08,
    nudge: 0.08,
    dragX: 3.0, dragY: 1.5, dragXSettle: 6.0, dragYSettle: 3.0, gravity: 800,
  },
  'Heavy Sand': {
    restitution: 0.01, restitutionRange: 0.02,
    nudge: 0.10,
    dragX: 6.0, dragY: 2.0, dragXSettle: 14.0, dragYSettle: 7.0, gravity: 1400,
  },
  'Techno': {
    restitution: 0.0, restitutionRange: 0.0,
    nudge: 0.15,
    dragX: 10.0, dragY: 1.0, dragXSettle: 18.0, dragYSettle: 4.0, gravity: 1600,
  },
  'Moon Gravity': {
    restitution: 0.08, restitutionRange: 0.03,
    nudge: 0.12,
    dragX: 2.0, dragY: 0.08, dragXSettle: 3.0, dragYSettle: 0.8, gravity: 50,
  },
  'Super Ball': {
    restitution: 0.70, restitutionRange: 0.15,
    nudge: 0.04,
    dragX: 0.8, dragY: 0.4, dragXSettle: 2.5, dragYSettle: 1.2, gravity: 800,
  },
};

export const PHYSICS: PhysicsParams = { ...PRESETS['Standard'] };

// ── Helpers ─────────────────────────────────────────────────────────

function fract(x: number): number {
  return x - Math.floor(x);
}

/**
 * Compute the smallest positive time for a particle at `y` with velocity `vy`
 * under constant gravity `g` to reach `targetY`.
 * Uses standard kinematics: y(t) = y + vy*t + 0.5*g*t²
 * Returns Infinity if the target is unreachable.
 */
function timeToHit(y: number, vy: number, g: number, targetY: number): number {
  const dy = targetY - y;
  if (dy <= 0) return 0; // already at or past target

  if (Math.abs(g) < 1e-6) {
    // No gravity — linear: t = dy / vy
    return vy > 1e-9 ? dy / vy : Infinity;
  }

  // Quadratic: 0.5*g*t² + vy*t - dy = 0
  const disc = vy * vy + 2 * g * dy;
  if (disc < 0) return Infinity;

  const sqrtDisc = Math.sqrt(disc);
  const t1 = (-vy + sqrtDisc) / g;
  const t2 = (-vy - sqrtDisc) / g;

  // Return smallest positive root
  let t = Infinity;
  if (t1 > 1e-9) t = t1;
  if (t2 > 1e-9 && t2 < t) t = t2;
  return t;
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

/** Effective peg collision radius as fraction of pegSpacing. */
const PEG_COLLISION_FRAC = 0.30;

export class Simulation {
  readonly numRows: number;
  readonly totalParticles: number;
  totalTimeMs: number;

  binCounts: number[];
  activeParticles: Particle[] = [];
  emittedCount = 0;
  elapsedMs = 0;
  allEmitted = false;
  allSettled = false;

  private rng: () => number;
  emitIntervalMs: number;

  constructor(cfg: SimConfig) {
    this.numRows = cfg.numRows;
    this.totalParticles = cfg.totalParticles;
    this.totalTimeMs = cfg.totalTimeSec * 1000;
    this.rng = cfg.rng;
    this.binCounts = new Array(cfg.numRows + 1).fill(0);
    this.emitIntervalMs = this.totalTimeMs / cfg.totalParticles;
  }

  /**
   * Advance simulation. Returns newly-settled particles for baking.
   *
   * IMPORTANT: This method does NOT advance elapsedMs.
   * elapsedMs is set exclusively by the Worker timer via setElapsedMs().
   * Emission is derived from the current elapsedMs value.
   */
  update(
    dtMs: number,
    geom: BoardGeom,
    getGroundY: (x: number) => number,
  ): Particle[] {
    const dt = Math.min(dtMs, 100) / 1000; // seconds, capped
    const settled: Particle[] = [];

    // ── Emission (derived from Worker-authoritative elapsedMs) ──
    if (!this.allEmitted) {
      const expectedEmitted = Math.min(
        this.totalParticles,
        Math.floor(this.elapsedMs / this.emitIntervalMs),
      );
      const toEmit = expectedEmitted - this.emittedCount;
      for (let i = 0; i < toEmit; i++) {
        this.activeParticles.push(this.createParticle(geom));
      }
      if (this.emittedCount >= this.totalParticles) this.allEmitted = true;
    }

    // ── Physics ──
    const alive: Particle[] = [];
    const halfBoard = geom.pegSpacing * (this.numRows / 2 + 1.5);
    const pegR = geom.pegSpacing * PEG_COLLISION_FRAC;

    for (const p of this.activeParticles) {
      const g = PHYSICS.gravity;

      // Drag (stronger in settling zone)
      const settling = p.pegIndex >= this.numRows;
      const dxCoeff = settling ? PHYSICS.dragXSettle : PHYSICS.dragX;
      const dyCoeff = settling ? PHYSICS.dragYSettle : PHYSICS.dragY;
      p.vx *= Math.exp(-dxCoeff * dt);
      p.vy *= Math.exp(-dyCoeff * dt);

      // ── CCD sweep loop (quadratic — accounts for gravity during flight) ──
      let remainDt = dt;
      let didSettle = false;
      const MAX_CCD_ITER = this.numRows + 2;

      for (let iter = 0; iter < MAX_CCD_ITER && remainDt > 0; iter++) {
        if (p.pegIndex < this.numRows) {
          // ── Peg zone ──
          const pegRowY = geom.pegY(p.pegIndex);
          const tHit = timeToHit(p.y, p.vy, g, pegRowY);

          if (tHit > remainDt) {
            p.x += p.vx * remainDt;
            p.y += p.vy * remainDt + 0.5 * g * remainDt * remainDt;
            p.vy += g * remainDt;
            remainDt = 0;
            break;
          }

          // Advance to exact collision point
          p.x += p.vx * tHit;
          p.vy += g * tHit;
          p.y = pegRowY;
          remainDt -= tHit;

          // ── Collision response — normal-based reflection ──
          const dir = p.path[p.pegIndex];
          const bj = fract(p.jitter * 997.0 + p.pegIndex * 7.31);

          let hIdx = 0;
          for (let i = 0; i < p.pegIndex; i++) hIdx += p.path[i];
          const pegCX = geom.pegX(p.pegIndex, hIdx);

          const nudge = PHYSICS.nudge;
          p.x = p.x * (1 - nudge) + pegCX * nudge;

          let dx = p.x - pegCX;
          const minOff = pegR * (0.10 + 0.12 * bj);
          if (dir === 1 && dx < minOff) dx = minOff;
          if (dir === 0 && dx > -minOff) dx = -minOff;
          dx = Math.max(-pegR, Math.min(pegR, dx));

          const frac = dx / pegR;
          const nx = frac;
          const ny = -Math.sqrt(Math.max(0, 1 - frac * frac));

          const vDotN = p.vx * nx + p.vy * ny;
          if (vDotN < 0) {
            const e = PHYSICS.restitution + PHYSICS.restitutionRange * bj;
            p.vx -= (1 + e) * vDotN * nx;
            p.vy -= (1 + e) * vDotN * ny;
          }

          p.pegIndex++;
        } else {
          // ── Settling zone — CCD against ground ──
          const groundY = getGroundY(p.x);
          const tGround = timeToHit(p.y, p.vy, g, groundY);

          if (tGround > remainDt) {
            p.x += p.vx * remainDt;
            p.y += p.vy * remainDt + 0.5 * g * remainDt * remainDt;
            p.vy += g * remainDt;
            remainDt = 0;
            break;
          }

          // Hit ground
          p.x += p.vx * tGround;
          p.y = groundY;
          p.settled = true;
          this.binCounts[p.bin]++;
          settled.push(p);
          didSettle = true;
          break;
        }
      }

      if (didSettle) continue;
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

  /**
   * Set elapsed time from Worker tick.
   * This is the SOLE source of truth for elapsed time.
   */
  setElapsedMs(ms: number): void {
    this.elapsedMs = ms;
  }

  /** Get current beat index (0-based). */
  getCurrentBeat(): number {
    return Math.min(this.totalParticles, Math.floor(this.elapsedMs / this.emitIntervalMs));
  }

  /** Update BPM (emission rate) while preserving beat position. Returns new totalTimeMs. */
  updateBpm(newBpm: number): number {
    const currentBeat = this.getCurrentBeat();
    this.emitIntervalMs = 60000 / newBpm;
    this.elapsedMs = currentBeat * this.emitIntervalMs;
    this.totalTimeMs = this.totalParticles * this.emitIntervalMs;
    return this.totalTimeMs;
  }

  /** Add time to total duration and recalculate emission interval. */
  addTime(ms: number): void {
    this.totalTimeMs += ms;
    this.emitIntervalMs = this.totalTimeMs / this.totalParticles;
  }

  /**
   * Instant-snap: emit all particles that SHOULD have been emitted by now
   * (based on current elapsedMs) but weren't. Skip physics; settle immediately.
   * Used after tab-hidden restore when elapsedMs has advanced but update() didn't run.
   */
  instantSnap(geom: BoardGeom): Particle[] {
    const expectedEmitted = Math.min(
      this.totalParticles,
      Math.floor(this.elapsedMs / this.emitIntervalMs),
    );
    const toEmit = expectedEmitted - this.emittedCount;
    if (toEmit <= 0) return [];

    const settled: Particle[] = [];
    for (let i = 0; i < toEmit; i++) {
      const p = this.createParticle(geom);
      p.settled = true;
      p.pegIndex = this.numRows;
      this.binCounts[p.bin]++;
      settled.push(p);
    }

    if (this.emittedCount >= this.totalParticles) this.allEmitted = true;
    return settled;
  }

  /**
   * Force-settle all active (in-flight) particles immediately.
   * Returns them for baking. Used when restoring from hidden tab.
   */
  forceSettleActive(): Particle[] {
    const settled: Particle[] = [];
    for (const p of this.activeParticles) {
      p.settled = true;
      p.pegIndex = this.numRows;
      this.binCounts[p.bin]++;
      settled.push(p);
    }
    this.activeParticles = [];
    return settled;
  }

  /** Reset simulation to initial state — all particles removed, counters zeroed. */
  reset(): void {
    this.activeParticles = [];
    this.binCounts.fill(0);
    this.emittedCount = 0;
    this.elapsedMs = 0;
    this.allEmitted = false;
    this.allSettled = false;
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
