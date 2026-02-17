/**
 * GrainRenderer — owns both canvases + all grain/peg/hopper drawing.
 *
 * Architecture:
 *   staticCanvas  — settled grains baked once, never redrawn per frame.
 *   dynamicCanvas — moving particles, pegs, hopper grains, UI — cleared each frame.
 */

import type { Particle } from './simulation';
import type { ClockTheme } from './seven-seg';
import {
  Layout, HopperGrain,
  pegX, pegY,
  stackJitterX, stackJitterY,
  computeHopperGrains,
  gaussianHW,
} from './layout';

const PI2 = Math.PI * 2;

// ── Unified grain appearance ──
const GRAIN_ALPHA = 0.85;          // moving particles
const GRAIN_GLOW_ALPHA = 0.06;
const GRAIN_GLOW_SCALE = 2.5;
const STATIC_GRAIN_ALPHA = 1.0;    // baked stack grains — fully opaque to prevent accumulation

export class GrainRenderer {
  readonly staticCanvas: HTMLCanvasElement;
  readonly dynamicCanvas: HTMLCanvasElement;
  readonly sCtx: CanvasRenderingContext2D;
  readonly dCtx: CanvasRenderingContext2D;

  /** Per-bin settled grain counts. */
  private binCounts: number[];

  /** Hopper grain positions (pre-computed). */
  private hopperGrainCache: HopperGrain[] = [];
  /** Topmost grain Y (minimum Y in cache). */
  private hopperGrainTopY = 0;

  // ── Hopper fade (for stop→idle transition) ──
  private hopperFadeAlpha = 1;

  // ── Purge drain animation ──
  private purgeOffsets: number[] = [];
  private purgeVelocities: number[] = [];
  private purgeDelays: number[] = [];
  private purgeAlphas: number[] = [];
  private purging = false;

  // ── Grain colors ──
  private grainCoreFill = '';
  private grainGlowFill = '';
  private staticGrainFill = '';    // opaque — for baked stack grains

  constructor(container: HTMLElement) {
    this.staticCanvas = document.createElement('canvas');
    this.dynamicCanvas = document.createElement('canvas');
    for (const c of [this.staticCanvas, this.dynamicCanvas]) {
      c.style.position = 'absolute';
      c.style.top = '0';
      c.style.left = '0';
      container.appendChild(c);
    }
    this.sCtx = this.staticCanvas.getContext('2d')!;
    this.dCtx = this.dynamicCanvas.getContext('2d')!;
    this.binCounts = [];
  }

  updateGrainColors(theme: ClockTheme): void {
    const [r, g, b] = theme.grainRGB;
    this.grainCoreFill = `rgba(${r},${g},${b},${GRAIN_ALPHA})`;
    this.grainGlowFill = `rgba(${r},${g},${b},${GRAIN_GLOW_ALPHA})`;
    this.staticGrainFill = `rgba(${r},${g},${b},${STATIC_GRAIN_ALPHA})`;
  }

  applyLayout(L: Layout, totalParticles: number): void {
    const w = L.width;
    const h = L.height;
    const dpr = L.dpr;

    for (const c of [this.staticCanvas, this.dynamicCanvas]) {
      c.width = w * dpr;
      c.height = h * dpr;
      c.style.width = w + 'px';
      c.style.height = h + 'px';
    }
    this.sCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.dCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

    this.binCounts = new Array(L.numRows + 1).fill(0);
    this.sCtx.clearRect(0, 0, w, h);

    this.hopperGrainCache = computeHopperGrains(L, totalParticles, L.miniGrainR);

    // Find actual top of grain pile (min Y in cache)
    let minY = L.hopperBottom;
    for (const g of this.hopperGrainCache) {
      if (g.y < minY) minY = g.y;
    }
    this.hopperGrainTopY = minY;
  }

  getBinCounts(): number[] {
    return this.binCounts;
  }

  // ── Baking — grain with slot-width X jitter ──

  bakeParticle(L: Layout, p: Particle): void {
    const bin = p.bin;
    this.binCounts[bin]++;
    const count = this.binCounts[bin];

    const binX = pegX(L, L.numRows - 1, bin);
    const mr = L.miniGrainR;
    const d = mr * 2.1;
    const rowH = L.stackRowH;
    const maxJitterX = Math.min(4, mr * 2.5);
    const maxJitterY = rowH * 0.18;
    const hexOff = (count % 2 === 0) ? d * 0.5 : 0;
    const jx = stackJitterX(bin, count, maxJitterX);
    const jy = stackJitterY(bin, count, maxJitterY);
    const grainX = binX + hexOff + jx;
    const grainY = L.accBottom - (count - 0.5) * rowH + jy;

    const ctx = this.sCtx;
    ctx.fillStyle = this.staticGrainFill;
    ctx.beginPath();
    ctx.arc(grainX, grainY, mr, 0, PI2);
    ctx.fill();
  }

  /** Rebake all settled grains with current grain color. */
  rebakeStatic(L: Layout, _theme: ClockTheme): void {
    if (!L) return;
    this.sCtx.clearRect(0, 0, L.width, L.height);
    const mr = L.miniGrainR;
    const d = mr * 2.1;
    const rowH = L.stackRowH;
    const maxJitterX = Math.min(4, mr * 2.5);
    const maxJitterY = rowH * 0.18;

    this.sCtx.fillStyle = this.staticGrainFill;

    // Opaque grain circles only — no column fills
    this.sCtx.beginPath();
    for (let bin = 0; bin <= L.numRows; bin++) {
      const binX = pegX(L, L.numRows - 1, bin);
      for (let k = 1; k <= this.binCounts[bin]; k++) {
        const hexOff = (k % 2 === 0) ? d * 0.5 : 0;
        const jx = stackJitterX(bin, k, maxJitterX);
        const jy = stackJitterY(bin, k, maxJitterY);
        const gx = binX + hexOff + jx;
        const gy = L.accBottom - (k - 0.5) * rowH + jy;
        this.sCtx.moveTo(gx + mr, gy);
        this.sCtx.arc(gx, gy, mr, 0, PI2);
      }
    }
    this.sCtx.fill();
  }

  drawHopper(
    ctx: CanvasRenderingContext2D,
    L: Layout,
    emitted: number,
    total: number,
  ): void {
    const cx = L.centerX;

    ctx.save();
    ctx.globalAlpha = this.hopperFadeAlpha;

    // ── Funnel outline (Gaussian curve) ──
    const visTop = Math.max(0, L.hopperTop);
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 0.5;
    const nSamples = 40;
    ctx.beginPath();
    // Right edge top→bottom
    for (let i = 0; i <= nSamples; i++) {
      const y = visTop + (L.hopperBottom - visTop) * (i / nSamples);
      const hw = gaussianHW(y, L);
      if (i === 0) ctx.moveTo(cx + hw, y);
      else ctx.lineTo(cx + hw, y);
    }
    // Left edge bottom→top
    for (let i = nSamples; i >= 0; i--) {
      const y = visTop + (L.hopperBottom - visTop) * (i / nSamples);
      const hw = gaussianHW(y, L);
      ctx.lineTo(cx - hw, y);
    }
    ctx.closePath();
    ctx.stroke();

    // ── Grain fill: bowl-shaped surface clipping ──
    // Center sinks early (concave curve), edges follow later (convex curve).
    // The bowl shape is maintained throughout, shrinking as sand depletes.
    const remaining = Math.max(0, total - emitted);
    const cacheLen = this.hopperGrainCache.length;

    if (remaining > 0 && cacheLen > 0) {
      const r = L.miniGrainR;
      const ratio = remaining / total;  // 1.0 = full, 0.0 = empty
      const progress = 1 - ratio;       // 0.0 = full, 1.0 = empty

      // Use actual grain pile top, not hopperTop (grains may not reach hopper ceiling)
      const grainTop = this.hopperGrainTopY;
      const grainH = L.hopperBottom - grainTop;
      const topHW = L.hopperTopHW;

      // Volumetric correction: cone-shaped container holds most volume at the top.
      // Removing fraction `progress` of grains lowers fill height by 1-(1-p)^(1/3).
      const volP = 1 - Math.pow(1 - progress, 1 / 3);

      // Center drops with volumetric height, edges follow with delay
      const centerDrop = volP * grainH * 1.1;
      const edgeDrop = Math.pow(volP, 2.0) * grainH * 1.1;
      // Bowl depth = difference between center and edge drop
      const bowlDepth = centerDrop - edgeDrop;

      // Surface noise amplitude: roughens the boundary for a granular look.
      // Scales with grain radius so it's subtle but visible.
      const noiseAmp = r * 3.5;

      // Glow pass (batched)
      ctx.fillStyle = this.grainGlowFill;
      ctx.beginPath();
      for (let i = 0; i < cacheLen; i++) {
        const g = this.hopperGrainCache[i];
        if (g.y < -r * 3) continue;
        // Use local half-width so the bowl curve is visible at every row
        const localHW = gaussianHW(g.y, L);
        const off = Math.min(1, Math.abs(g.x - cx) / localHW);
        // Deterministic per-grain noise (hash-based, no flicker)
        const noise = (((i * 2654435761) >>> 0) % 10000 / 10000 - 0.5) * noiseAmp;
        const surfaceY = grainTop + edgeDrop + bowlDepth * (1 - off * off) + noise;
        if (g.y < surfaceY) continue;
        ctx.moveTo(g.x + r * GRAIN_GLOW_SCALE, g.y);
        ctx.arc(g.x, g.y, r * GRAIN_GLOW_SCALE, 0, PI2);
      }
      ctx.fill();

      // Core pass (batched)
      ctx.fillStyle = this.grainCoreFill;
      ctx.beginPath();
      for (let i = 0; i < cacheLen; i++) {
        const g = this.hopperGrainCache[i];
        if (g.y < -r) continue;
        const localHW = gaussianHW(g.y, L);
        const off = Math.min(1, Math.abs(g.x - cx) / localHW);
        const noise = (((i * 2654435761) >>> 0) % 10000 / 10000 - 0.5) * noiseAmp;
        const surfaceY = grainTop + edgeDrop + bowlDepth * (1 - off * off) + noise;
        if (g.y < surfaceY) continue;
        ctx.moveTo(g.x + r, g.y);
        ctx.arc(g.x, g.y, r, 0, PI2);
      }
      ctx.fill();
    }

    // ── Nozzle stream ──
    if (remaining > 0) {
      const now = performance.now();
      const r = L.miniGrainR;
      // Fewer stream dots when only a few grains remain
      const streamCount = remaining < 10 ? Math.max(1, Math.ceil(remaining / 3)) : 4;
      for (let i = 0; i < streamCount; i++) {
        const phase = ((now * 0.003 + i * 0.25) % 1);
        const sy = L.hopperBottom + (L.emitY - L.hopperBottom) * phase;
        ctx.globalAlpha = 0.4 * (1 - phase * 0.8);
        ctx.fillStyle = this.grainCoreFill;
        ctx.beginPath();
        ctx.arc(cx, sy, r * 0.7, 0, PI2);
        ctx.fill();
      }
    }

    ctx.restore();
  }

  drawPegs(ctx: CanvasRenderingContext2D, L: Layout, theme: ClockTheme, pegAlphaOverride?: number): void {
    const [pr, pg, pb] = theme.segmentRGB;
    const alpha = pegAlphaOverride !== undefined ? pegAlphaOverride : 0.15;
    // Blend theme color with gray(180). When alpha is high (alarm flash), use more theme color.
    const themeWeight = (pegAlphaOverride !== undefined && pegAlphaOverride > 0.5) ? 0.6 : 0.3;
    const grayWeight = 1 - themeWeight;
    const blendR = Math.round(pr * themeWeight + 180 * grayWeight);
    const blendG = Math.round(pg * themeWeight + 180 * grayWeight);
    const blendB = Math.round(pb * themeWeight + 180 * grayWeight);
    ctx.fillStyle = `rgba(${blendR},${blendG},${blendB},${alpha.toFixed(3)})`;
    ctx.beginPath();
    for (let row = 0; row < L.numRows; row++) {
      for (let j = 0; j <= row; j++) {
        const x = pegX(L, row, j);
        const y = pegY(L, row);
        ctx.moveTo(x + L.pegRadius, y);
        ctx.arc(x, y, L.pegRadius, 0, PI2);
      }
    }
    ctx.fill();
  }

  drawParticles(
    ctx: CanvasRenderingContext2D,
    L: Layout,
    particles: Particle[],
  ): void {
    if (particles.length === 0) return;
    const r = L.grainRadius;

    ctx.fillStyle = this.grainGlowFill;
    ctx.beginPath();
    for (const p of particles) {
      ctx.moveTo(p.x + r * GRAIN_GLOW_SCALE, p.y);
      ctx.arc(p.x, p.y, r * GRAIN_GLOW_SCALE, 0, PI2);
    }
    ctx.fill();

    ctx.fillStyle = this.grainCoreFill;
    ctx.beginPath();
    for (const p of particles) {
      ctx.moveTo(p.x + r, p.y);
      ctx.arc(p.x, p.y, r, 0, PI2);
    }
    ctx.fill();
  }

  drawRainParticles(
    ctx: CanvasRenderingContext2D,
    L: Layout,
    rain: { x: number; y: number; alpha: number }[],
    theme: ClockTheme,
  ): void {
    const r = L.miniGrainR;
    const [gr, gg, gb] = theme.grainRGB;
    for (const p of rain) {
      ctx.globalAlpha = p.alpha * (GRAIN_GLOW_ALPHA / GRAIN_ALPHA);
      ctx.fillStyle = `rgb(${gr},${gg},${gb})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r * GRAIN_GLOW_SCALE, 0, PI2);
      ctx.fill();

      ctx.globalAlpha = p.alpha;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, PI2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // ── Purge drain animation ──

  beginPurge(L: Layout): void {
    const numBins = L.numRows + 1;
    this.purgeOffsets = new Array(numBins).fill(0);
    this.purgeVelocities = new Array(numBins).fill(0);
    this.purgeDelays = [];
    this.purgeAlphas = new Array(numBins).fill(1);
    for (let i = 0; i < numBins; i++) {
      const hash = ((i * 2654435761) >>> 0) & 0x7fffffff;
      this.purgeDelays.push((hash % 1000) / 1000 * 0.2);
    }
    this.purging = true;
  }

  /**
   * Drain animation: each bin's grains fall with gravity.
   * Returns true when fully drained.
   */
  purgeStacks(L: Layout, dt: number, theme: ClockTheme): boolean {
    this.sCtx.clearRect(0, 0, L.width, L.height);

    if (!this.purging) {
      this.binCounts.fill(0);
      return true;
    }

    const mr = L.miniGrainR;
    const d = mr * 2.1;
    const rowH = L.stackRowH;
    const maxJitterX = Math.min(4, mr * 2.5);
    const maxJitterY = rowH * 0.18;
    const gravity = 1500;
    let allDone = true;

    // Update physics per-bin
    for (let bin = 0; bin <= L.numRows; bin++) {
      if (this.binCounts[bin] === 0) continue;
      if (this.purgeDelays[bin] > 0) {
        this.purgeDelays[bin] -= dt;
        allDone = false;
        continue;
      }
      this.purgeVelocities[bin] += gravity * dt;
      this.purgeOffsets[bin] += this.purgeVelocities[bin] * dt;
      this.purgeAlphas[bin] = Math.max(0, 1 - this.purgeOffsets[bin] / (L.height * 0.6));
      if (this.purgeAlphas[bin] > 0) {
        allDone = false;
      }
    }

    if (allDone) {
      this.binCounts.fill(0);
      this.purging = false;
      return true;
    }

    // Draw falling grains
    const [gr, gg, gb] = theme.grainRGB;
    // Glow pass
    this.sCtx.beginPath();
    let anyGlow = false;
    for (let bin = 0; bin <= L.numRows; bin++) {
      const alpha = this.purgeAlphas[bin];
      if (alpha <= 0 || this.binCounts[bin] === 0) continue;
      const offset = this.purgeOffsets[bin];
      const binX = pegX(L, L.numRows - 1, bin);
      for (let k = 0; k < this.binCounts[bin]; k++) {
        const kk = k + 1;
        const hexOff = (kk % 2 === 0) ? d * 0.5 : 0;
        const jx = stackJitterX(bin, kk, maxJitterX);
        const jy = stackJitterY(bin, kk, maxJitterY);
        const gx = binX + hexOff + jx;
        const gy = L.accBottom - (k + 0.5) * rowH + jy + offset;
        if (gy > L.height + mr * 3) continue;
        if (!anyGlow) {
          anyGlow = true;
        }
        this.sCtx.moveTo(gx + mr * GRAIN_GLOW_SCALE, gy);
        this.sCtx.arc(gx, gy, mr * GRAIN_GLOW_SCALE, 0, PI2);
      }
    }
    if (anyGlow) {
      this.sCtx.fillStyle = `rgba(${gr},${gg},${gb},${GRAIN_GLOW_ALPHA})`;
      this.sCtx.fill();
    }

    // Core pass — need per-bin alpha, so draw per-bin
    for (let bin = 0; bin <= L.numRows; bin++) {
      const alpha = this.purgeAlphas[bin];
      if (alpha <= 0 || this.binCounts[bin] === 0) continue;
      const offset = this.purgeOffsets[bin];
      const binX = pegX(L, L.numRows - 1, bin);
      this.sCtx.fillStyle = `rgba(${gr},${gg},${gb},${(GRAIN_ALPHA * alpha).toFixed(3)})`;
      this.sCtx.beginPath();
      for (let k = 0; k < this.binCounts[bin]; k++) {
        const kk = k + 1;
        const hexOff = (kk % 2 === 0) ? d * 0.5 : 0;
        const jx = stackJitterX(bin, kk, maxJitterX);
        const jy = stackJitterY(bin, kk, maxJitterY);
        const gx = binX + hexOff + jx;
        const gy = L.accBottom - (k + 0.5) * rowH + jy + offset;
        if (gy > L.height + mr) continue;
        this.sCtx.moveTo(gx + mr, gy);
        this.sCtx.arc(gx, gy, mr, 0, PI2);
      }
      this.sCtx.fill();
    }

    return false;
  }

  clearStatic(L: Layout): void {
    this.binCounts.fill(0);
    this.sCtx.clearRect(0, 0, L.width, L.height);
    this.purging = false;
  }

  // ── Hopper fade helpers ──

  beginHopperFade(): void {
    this.hopperFadeAlpha = 1;
  }

  setHopperFadeAlpha(a: number): void {
    this.hopperFadeAlpha = a;
  }

  resetHopperFade(): void {
    this.hopperFadeAlpha = 1;
  }

  /** Fill stacks with binomial distribution (for stop→idle). */
  fillStacks(L: Layout, numRows: number, totalParticles: number, theme: ClockTheme): void {
    // Compute binomial expected counts: C(n,k) / 2^n * total
    const n = numRows;
    const numBins = n + 1;
    this.binCounts = new Array(numBins).fill(0);

    // Use log-space to avoid overflow for large n
    // ln(C(n,k)) = ln(n!) - ln(k!) - ln((n-k)!)
    const lnFact: number[] = new Array(n + 1);
    lnFact[0] = 0;
    for (let i = 1; i <= n; i++) {
      lnFact[i] = lnFact[i - 1] + Math.log(i);
    }

    let placed = 0;
    const probs: number[] = new Array(numBins);
    for (let k = 0; k < numBins; k++) {
      probs[k] = Math.exp(lnFact[n] - lnFact[k] - lnFact[n - k] - n * Math.LN2);
    }

    // Distribute particles proportionally
    for (let k = 0; k < numBins; k++) {
      this.binCounts[k] = Math.round(probs[k] * totalParticles);
      placed += this.binCounts[k];
    }
    // Fix rounding errors by adjusting the center bin
    const centerBin = Math.floor(numBins / 2);
    this.binCounts[centerBin] += totalParticles - placed;

    this.rebakeStatic(L, theme);
  }

  /** Ground height based on nearest bin's grain count. */
  getGroundY(L: Layout, x: number): number {
    const numBins = L.numRows + 1;
    let nearestBin = 0;
    let minDist = Infinity;
    for (let b = 0; b < numBins; b++) {
      const bx = pegX(L, L.numRows - 1, b);
      const dist = Math.abs(x - bx);
      if (dist < minDist) {
        minDist = dist;
        nearestBin = b;
      }
    }
    return L.accBottom - this.binCounts[nearestBin] * L.stackRowH;
  }
}
