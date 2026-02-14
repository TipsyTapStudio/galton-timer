/**
 * Two-layer Canvas renderer with Static Baking.
 *
 * - staticCanvas : settled particles baked once, never redrawn.
 * - dynamicCanvas: moving particles, pegs, reservoir, UI — cleared each frame.
 *
 * v3 — "The Solemn Update"
 *   1. Zen Margins        (20 % H / 10 % V)
 *   2. Mountain Reservoir  (bezier sand-mound that contracts)
 *   3. Natural Accumulation (height-map, particles keep their x)
 *   4. Pause icon
 */

import type { Particle, BoardGeom } from './simulation';
import { maxBinProbability } from './simulation';

const PI2 = Math.PI * 2;

// ── Layout ──────────────────────────────────────────────────────────

export interface Layout {
  width: number;
  height: number;
  dpr: number;
  centerX: number;

  // Content box (after margins)
  contentLeft: number;
  contentTop: number;
  contentW: number;
  contentH: number;

  // Reservoir
  reservoirTop: number;
  reservoirBottom: number;
  reservoirTopHW: number;
  reservoirBottomHW: number;

  // Board
  emitY: number;
  boardTop: number;
  boardBottom: number;

  // Accumulation
  accTop: number;
  accBottom: number;

  // Sizing
  pegSpacing: number;
  numRows: number;
  pegRadius: number;
  particleRadius: number;
  settledDiameter: number;
  settledRadius: number;
}

function computeLayout(
  w: number,
  h: number,
  dpr: number,
  numRows: number,
  totalParticles: number,
): Layout {
  const centerX = w / 2;

  // ── Zen margins ──
  const marginX = w * 0.20;
  const marginY = h * 0.10;
  const contentLeft = marginX;
  const contentTop = marginY;
  const contentW = w - marginX * 2;
  const contentH = h - marginY * 2;

  // ── Reservoir ──
  const reservoirTop = contentTop;
  const reservoirBottom = contentTop + contentH * 0.07;
  const reservoirTopHW = contentW * 0.38;
  const reservoirBottomHW = Math.max(2, contentW * 0.006);

  // ── Board ──
  const emitY = contentTop + contentH * 0.095;
  const boardTop = contentTop + contentH * 0.125;
  const boardBottom = contentTop + contentH * 0.46;

  // ── Accumulation ──
  const accTop = contentTop + contentH * 0.48;
  const accBottom = contentTop + contentH;

  // ── Sizing ──
  const pegSpacing = contentW / numRows;
  const pegRadius = Math.max(0.4, Math.min(2.0, pegSpacing * 0.055));
  const particleRadius = Math.max(1.0, Math.min(2.5, pegSpacing * 0.042));

  // Settled particle — fit tallest expected bin in 90 % of accHeight
  const accHeight = accBottom - accTop;
  const maxBinCount = maxBinProbability(numRows) * totalParticles * 1.15;
  let settledDiameter = 4.0;
  for (; settledDiameter >= 1.2; settledDiameter -= 0.2) {
    // single-column stacking (natural accumulation)
    if (maxBinCount * settledDiameter <= accHeight * 0.90) break;
  }
  settledDiameter = Math.max(1.2, settledDiameter);

  return {
    width: w,
    height: h,
    dpr,
    centerX,
    contentLeft,
    contentTop,
    contentW,
    contentH,
    reservoirTop,
    reservoirBottom,
    reservoirTopHW,
    reservoirBottomHW,
    emitY,
    boardTop,
    boardBottom,
    accTop,
    accBottom,
    pegSpacing,
    numRows,
    pegRadius,
    particleRadius,
    settledDiameter,
    settledRadius: settledDiameter / 2,
  };
}

// ── Renderer ────────────────────────────────────────────────────────

export class Renderer {
  private staticCanvas: HTMLCanvasElement;
  private dynamicCanvas: HTMLCanvasElement;
  private sCtx: CanvasRenderingContext2D;
  private dCtx: CanvasRenderingContext2D;

  layout!: Layout;
  private totalParticles: number;

  /** Per-pixel-column accumulated height for natural stacking. */
  private accHeightMap!: Float32Array;

  /** Bin counts for density glow. */
  private binCounts: number[];

  constructor(
    container: HTMLElement,
    numRows: number,
    totalParticles: number,
    _seed: number,
  ) {
    this.totalParticles = totalParticles;
    this.binCounts = new Array(numRows + 1).fill(0);

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

    this.resize(numRows);
  }

  resize(numRows: number): void {
    const dpr = window.devicePixelRatio || 1;
    const w = window.innerWidth;
    const h = window.innerHeight;

    for (const c of [this.staticCanvas, this.dynamicCanvas]) {
      c.width = w * dpr;
      c.height = h * dpr;
      c.style.width = w + 'px';
      c.style.height = h + 'px';
    }
    this.sCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.dCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

    this.layout = computeLayout(w, h, dpr, numRows, this.totalParticles);
    this.accHeightMap = new Float32Array(Math.ceil(w) + 1);
    this.sCtx.clearRect(0, 0, w, h);
  }

  // ── Geometry for simulation ──

  pegX(row: number, index: number): number {
    return this.layout.centerX + (index - row / 2) * this.layout.pegSpacing;
  }

  pegY(row: number): number {
    const L = this.layout;
    if (L.numRows <= 1) return L.boardTop;
    return L.boardTop + (row / (L.numRows - 1)) * (L.boardBottom - L.boardTop);
  }

  getGeom(): BoardGeom {
    return {
      emitX: this.layout.centerX,
      emitY: this.layout.emitY,
      pegX: (r, i) => this.pegX(r, i),
      pegY: (r) => this.pegY(r),
      pegSpacing: this.layout.pegSpacing,
      numRows: this.layout.numRows,
      accBottom: this.layout.accBottom,
    };
  }

  /** Ground level at pixel-x (for simulation settling check). */
  getGroundY(x: number): number {
    const col = Math.round(x);
    if (col < 0 || col >= this.accHeightMap.length) return this.layout.accBottom;
    return this.layout.accBottom - this.accHeightMap[col];
  }

  // ── Baking (natural accumulation) ──

  bakeParticle(p: Particle): void {
    const L = this.layout;
    const r = L.settledRadius;
    const x = p.x;
    const col = Math.round(x);

    // Current height under particle footprint
    const spread = Math.max(1, Math.round(r));
    const left = Math.max(0, col - spread);
    const right = Math.min(this.accHeightMap.length - 1, col + spread);
    let maxH = 0;
    for (let c = left; c <= right; c++) {
      if (this.accHeightMap[c] > maxH) maxH = this.accHeightMap[c];
    }

    const settleY = L.accBottom - maxH - r;

    // Update height map
    const newH = maxH + L.settledDiameter;
    for (let c = left; c <= right; c++) {
      this.accHeightMap[c] = Math.max(this.accHeightMap[c], newH);
    }

    // Density glow
    this.binCounts[p.bin] = (this.binCounts[p.bin] || 0) + 1;
    const maxCount = maxBinProbability(L.numRows) * this.totalParticles;
    const density = Math.min(1, this.binCounts[p.bin] / maxCount);

    const ctx = this.sCtx;

    // Glow
    ctx.fillStyle = `rgba(255,255,255,${(0.03 + 0.08 * density).toFixed(3)})`;
    ctx.beginPath();
    ctx.arc(x, settleY, r * 2.8, 0, PI2);
    ctx.fill();

    // Core
    ctx.fillStyle = `rgba(255,255,255,${(0.60 + 0.40 * density).toFixed(3)})`;
    ctx.beginPath();
    ctx.arc(x, settleY, r, 0, PI2);
    ctx.fill();
  }

  // ── Frame drawing ──

  drawFrame(
    particles: Particle[],
    remainingSec: number,
    totalParticles: number,
    emittedCount: number,
    paused: boolean,
  ): void {
    const L = this.layout;
    const ctx = this.dCtx;
    ctx.clearRect(0, 0, L.width, L.height);

    this.drawCountdown(ctx, remainingSec);
    this.drawReservoir(ctx, emittedCount, totalParticles);
    this.drawPegs(ctx);
    this.drawParticles(ctx, particles);
    this.drawHUD(ctx, emittedCount, totalParticles, paused);
  }

  // ── Sub-draws ──

  private drawCountdown(ctx: CanvasRenderingContext2D, sec: number): void {
    const L = this.layout;
    const mm = Math.floor(sec / 60);
    const ss = Math.floor(sec % 60);
    const text = `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;

    ctx.save();
    ctx.font = `bold ${L.contentH * 0.32}px "JetBrains Mono", monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(255,255,255,0.04)';
    ctx.fillText(text, L.centerX, L.contentTop + L.contentH * 0.48);
    ctx.restore();
  }

  private drawReservoir(
    ctx: CanvasRenderingContext2D,
    emitted: number,
    total: number,
  ): void {
    const L = this.layout;
    const remaining = 1 - emitted / total;
    if (remaining <= 0.001) return;

    const cx = L.centerX;
    const baseY = L.reservoirBottom;
    const fullH = (L.reservoirBottom - L.reservoirTop) * 0.88;

    // Contraction: width shrinks faster (sucking inward)
    const widthF = remaining * remaining;
    const heightF = Math.pow(remaining, 0.6);
    const peakH = fullH * heightF;
    const baseHW = L.reservoirTopHW * Math.max(widthF, 0.02);
    const peakY = baseY - peakH;

    if (peakH < 1) return;

    ctx.save();

    // ── Mountain shape (bezier) ──
    ctx.beginPath();
    ctx.moveTo(cx - baseHW, baseY);
    ctx.bezierCurveTo(
      cx - baseHW * 0.55, baseY - peakH * 0.25,
      cx - baseHW * 0.12, peakY + peakH * 0.04,
      cx, peakY,
    );
    ctx.bezierCurveTo(
      cx + baseHW * 0.12, peakY + peakH * 0.04,
      cx + baseHW * 0.55, baseY - peakH * 0.25,
      cx + baseHW, baseY,
    );
    ctx.closePath();

    const grad = ctx.createLinearGradient(0, peakY, 0, baseY);
    grad.addColorStop(0, 'rgba(255,255,255,0.12)');
    grad.addColorStop(0.6, 'rgba(255,255,255,0.30)');
    grad.addColorStop(1, 'rgba(255,255,255,0.42)');
    ctx.fillStyle = grad;
    ctx.fill();

    // ── Stream from neck to emission ──
    if (emitted < total) {
      const now = performance.now();
      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < 4; i++) {
        const phase = ((now * 0.003 + i * 0.25) % 1);
        const sy = baseY + (L.emitY - baseY) * phase;
        ctx.globalAlpha = 0.4 * (1 - phase * 0.8);
        ctx.beginPath();
        ctx.arc(cx, sy, 0.9, 0, PI2);
        ctx.fill();
      }
    }

    ctx.restore();
  }

  private drawPegs(ctx: CanvasRenderingContext2D): void {
    const L = this.layout;
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.beginPath();
    for (let row = 0; row < L.numRows; row++) {
      for (let j = 0; j <= row; j++) {
        const x = this.pegX(row, j);
        const y = this.pegY(row);
        ctx.moveTo(x + L.pegRadius, y);
        ctx.arc(x, y, L.pegRadius, 0, PI2);
      }
    }
    ctx.fill();
  }

  private drawParticles(
    ctx: CanvasRenderingContext2D,
    particles: Particle[],
  ): void {
    if (particles.length === 0) return;
    const r = this.layout.particleRadius;

    // Glow pass
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.beginPath();
    for (const p of particles) {
      ctx.moveTo(p.x + r * 3, p.y);
      ctx.arc(p.x, p.y, r * 3, 0, PI2);
    }
    ctx.fill();

    // Core pass
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    for (const p of particles) {
      ctx.moveTo(p.x + r, p.y);
      ctx.arc(p.x, p.y, r, 0, PI2);
    }
    ctx.fill();
  }

  private drawHUD(
    ctx: CanvasRenderingContext2D,
    emitted: number,
    total: number,
    paused: boolean,
  ): void {
    const L = this.layout;
    ctx.save();
    ctx.font = `11px "JetBrains Mono", monospace`;
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(255,255,255,0.20)';
    ctx.fillText(`n=${emitted}/${total}`, L.width - 20, L.height - 16);

    // Pause / Play icon
    const ix = L.width - 24;
    const iy = L.height - 38;
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    if (paused) {
      // ▶
      ctx.beginPath();
      ctx.moveTo(ix - 4, iy - 6);
      ctx.lineTo(ix + 6, iy);
      ctx.lineTo(ix - 4, iy + 6);
      ctx.closePath();
      ctx.fill();
    } else {
      // ⏸
      ctx.fillRect(ix - 4, iy - 5, 3, 10);
      ctx.fillRect(ix + 2, iy - 5, 3, 10);
    }

    ctx.restore();
  }
}
