/**
 * Pure geometry — no canvas, no DOM.
 * Layout computation, peg coordinates, hopper grain positions, stack jitter.
 */

import { maxBinProbability } from './simulation';

export const SQRT3_2 = Math.sqrt(3) / 2;

// ── Layout ──────────────────────────────────────────────────────────

export interface Layout {
  width: number;
  height: number;
  dpr: number;
  centerX: number;
  contentW: number;

  // Hopper (funnel: rect top + trapezoid bottom)
  hopperTop: number;
  hopperJunction: number;  // rect→trapezoid seam
  hopperBottom: number;    // nozzle exit
  hopperRectHW: number;    // half-width of rect section
  hopperTopHW: number;     // alias for hopperRectHW
  nozzleHW: number;        // half-width at nozzle (= gridTopHW)
  hopperSigma: number;     // sigma in peg-spacing units for Gaussian envelope

  // Board
  emitY: number;
  boardTop: number;
  boardBottom: number;

  // Accumulation
  accTop: number;
  accBottom: number;
  accHeight: number;

  // Inline timer
  inlineTimerY: number;

  // Sizing
  pegSpacing: number;
  rowSpacingY: number;
  numRows: number;
  pegRadius: number;
  grainRadius: number;
  settledDiameter: number;
  settledRadius: number;
  stackScale: number;
  stackRowH: number;     // rendering row height for stacks (normalized)
  miniGrainR: number;    // tiny dot radius for hopper + stack texture
}

export function computeLayout(
  w: number,
  h: number,
  dpr: number,
  numRows: number,
  totalParticles: number,
): Layout {
  const centerX = w / 2;
  const marginX = w * 0.15;
  const contentW = w - marginX * 2;

  // ── Safe zones ──
  // topMargin and bottomMargin are INVIOLABLE — stacks never cross bottomMargin.
  const topMargin = h * 0.05;
  const bottomMargin = h * 0.15;
  const safeH = h - topMargin - bottomMargin;

  // ── Grid sizing ──
  const dxFromWidth = contentW / (numRows + 2);

  const inlineTimerH = h * 0.06;
  const gapBudget = h * 0.03;
  const availableForSystem = safeH - inlineTimerH - gapBudget;

  const boardH_target = availableForSystem * 3 / 5;
  const dxFromRatio = numRows > 1
    ? boardH_target / ((numRows - 1) * SQRT3_2)
    : dxFromWidth;

  const pegSpacing = Math.min(dxFromWidth, dxFromRatio);
  const rowSpacingY = pegSpacing * SQRT3_2;
  const boardH = numRows > 1 ? (numRows - 1) * rowSpacingY : 0;

  // ── Universal grain radius ──
  const grainRadius = Math.max(1.2, Math.min(3.5, pegSpacing * 0.09));
  const pegRadius = Math.max(1.5, Math.min(5.0, pegSpacing * 0.12));

  // ── Hopper dimensions ──
  const nozzleHW = pegSpacing * 0.8;
  const gridHW = (numRows * pegSpacing) / 2;
  const hopperTopHW = Math.max(pegSpacing * 4, gridHW * 1.3);
  const hopperRectHW = hopperTopHW;

  const taperH = Math.max(boardH / 3, pegSpacing * 2.5);

  // ── Gaps ──
  const hopperToGrid = Math.max(pegSpacing * 0.6, h * 0.012);
  const gridToAcc = Math.max(pegSpacing * 0.7, h * 0.015);

  // ── Accumulation: bottom-anchored ──
  // accBottom is FIXED at the UI buffer line. Stacks grow upward from here.
  const accBottom = h - bottomMargin;

  // Compute how much space the hopper + grid consume above stacks
  const aboveAccH = inlineTimerH + taperH + hopperToGrid + boardH + gridToAcc;

  // accHeight gets whatever remains, capped at boardH/2 to keep proportions sane
  const accHeight_available = safeH - aboveAccH;
  const accHeight = Math.max(pegSpacing * 2, Math.min(accHeight_available, boardH / 2));

  // ── Accumulation grain sizing ──
  const maxProb = maxBinProbability(numRows);
  const maxBinCount = maxProb * totalParticles * 1.15;

  // ── Position everything bottom-up from the anchor ──
  const accTop = accBottom - accHeight;
  const boardBottom = accTop - gridToAcc;
  const boardTopY = boardBottom - boardH;
  const hopperBottom = boardTopY - hopperToGrid;
  const hopperTop = hopperBottom - taperH;
  const hopperJunction = hopperTop;
  const emitY = hopperBottom + hopperToGrid * 0.55;
  // Inline timer sits above hopper; clamp so it never overlaps or goes off-screen
  const inlineTimerY = Math.max(topMargin + inlineTimerH * 0.5, hopperTop - inlineTimerH * 0.6);

  const stackScale = (accHeight * 0.85) / (maxProb * totalParticles);

  // Stack rendering: row height normalized so peak bin ≤ accHeight * 0.95
  const d_natural = grainRadius * 1.6;
  const rowH_natural = d_natural * SQRT3_2;
  const peakCeiling = accHeight * 0.95;
  const stackRowH = maxBinCount > 0
    ? Math.min(rowH_natural, peakCeiling / maxBinCount)
    : rowH_natural;

  // Mini-grain radius: smaller than falling particles, used for hopper + stack texture
  const miniGrainR = Math.max(0.8, grainRadius * 0.55);

  // ── Vertical centering ──
  let finalHopperTop = hopperTop;
  let finalHopperJunction = hopperJunction;
  let finalHopperBottom = hopperBottom;
  let finalEmitY = emitY;
  let finalBoardTop = boardTopY;
  let finalBoardBottom = boardBottom;
  let finalAccTop = accTop;
  let finalAccBottom = accBottom;
  let finalInlineTimerY = inlineTimerY;

  const contentTop = finalInlineTimerY - inlineTimerH * 0.5;
  const contentBottom = finalAccBottom;
  const totalContentH = contentBottom - contentTop;

  const idealOffsetY = (h - totalContentH) / 2 - contentTop;

  const uiSafeBottom = h * 0.12;
  const maxOffset = (h - uiSafeBottom) - finalAccBottom;
  const minOffset = topMargin - contentTop;
  const offsetY = Math.max(minOffset, Math.min(idealOffsetY, maxOffset));

  finalHopperTop += offsetY;
  finalHopperJunction += offsetY;
  finalHopperBottom += offsetY;
  finalEmitY += offsetY;
  finalBoardTop += offsetY;
  finalBoardBottom += offsetY;
  finalAccTop += offsetY;
  finalAccBottom += offsetY;
  finalInlineTimerY += offsetY;

  return {
    width: w, height: h, dpr, centerX, contentW,
    hopperTop: finalHopperTop,
    hopperJunction: finalHopperJunction,
    hopperBottom: finalHopperBottom,
    hopperRectHW, hopperTopHW: hopperRectHW, nozzleHW,
    hopperSigma: taperH * 0.47 / pegSpacing,
    emitY: finalEmitY,
    boardTop: finalBoardTop, boardBottom: finalBoardBottom,
    accTop: finalAccTop, accBottom: finalAccBottom, accHeight,
    inlineTimerY: finalInlineTimerY,
    pegSpacing, rowSpacingY, numRows, pegRadius,
    grainRadius, settledDiameter: stackRowH,
    settledRadius: stackRowH / 2,
    stackScale,
    stackRowH,
    miniGrainR,
  };
}

// ── Peg coordinates (pure functions) ──

export function pegX(L: Layout, row: number, index: number): number {
  return L.centerX + (index - row / 2) * L.pegSpacing;
}

export function pegY(L: Layout, row: number): number {
  return L.boardTop + row * L.rowSpacingY;
}

// ── Gaussian half-width for inverted bell-curve hopper ──

export function gaussianHW(y: number, L: Layout): number {
  const totalH = L.hopperBottom - L.hopperTop;
  if (totalH <= 0) return L.nozzleHW;
  const t = Math.max(0, Math.min(1, (L.hopperBottom - y) / totalH)); // 0=bottom, 1=top
  const sigPx = L.hopperSigma * L.pegSpacing;
  const d = t * totalH;
  const gaussVal = 1 - Math.exp(-(d * d) / (2 * sigPx * sigPx));
  return L.nozzleHW + (L.hopperTopHW - L.nozzleHW) * gaussVal;
}

// ── Hopper grain positions (hex-packed, bottom-up) ──

export interface HopperGrain {
  x: number;
  y: number;
}

export function computeHopperGrains(
  L: Layout,
  totalCount: number,
  grainR: number,
): HopperGrain[] {
  const grains: HopperGrain[] = [];
  const d = grainR * 2.1;
  const rowH = d * SQRT3_2;
  const cx = L.centerX;
  const trapH = L.hopperBottom - L.hopperJunction;

  let row = 0;
  let y = L.hopperBottom - grainR * 1.5;

  while (grains.length < totalCount) {
    const hw = gaussianHW(y, L);

    const usableW = hw * 0.88;
    const xOff = (row % 2 === 1) ? d * 0.5 : 0;
    const nCols = Math.max(1, Math.floor((usableW * 2) / d));

    for (let c = 0; c < nCols && grains.length < totalCount; c++) {
      const gx = cx - usableW + xOff + c * d + grainR;
      const seed = (row * 1009 + c * 7919 + 31337) & 0x7fffffff;
      const jx = ((seed % 1000) / 1000 - 0.5) * grainR * 0.5;
      const jy = (((seed * 1103515245 + 12345) & 0x7fffffff) % 1000 / 1000 - 0.5) * grainR * 0.4;
      grains.push({ x: gx + jx, y: y + jy });
    }

    y -= rowH;
    row++;
  }

  // Sort by distance from outlet center (descending).
  // Grains nearest the outlet are at the END of the array, so they
  // disappear first as `visibleCount` shrinks — creating a V-shaped funnel.
  const outletX = cx;
  const outletY = L.hopperBottom;
  grains.sort((a, b) => {
    const da = (a.x - outletX) ** 2 + (a.y - outletY) ** 2;
    const db = (b.x - outletX) ** 2 + (b.y - outletY) ** 2;
    return db - da; // farthest first
  });

  return grains;
}

// ── Deterministic jitter for stack grains ──

export function stackJitterX(bin: number, k: number, maxJitter: number): number {
  const hash = ((bin * 2654435761 + k * 340573321) >>> 0) & 0x7fffffff;
  return (hash % 10000 / 10000 - 0.5) * 2 * maxJitter;
}

export function stackJitterY(bin: number, k: number, maxJitter: number): number {
  const hash = ((bin * 1103515245 + k * 1299709) >>> 0) & 0x7fffffff;
  return (hash % 10000 / 10000 - 0.5) * 2 * maxJitter;
}
