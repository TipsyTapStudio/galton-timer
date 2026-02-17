"use strict";
(() => {
  // src/utils/url-params.ts
  var VALID_MODES = ["standard", "heavy sand", "techno", "moon gravity", "super ball"];
  var VALID_THEMES = ["nixie", "system", "studio", "cyber"];
  var VALID_TIMER_MODES = ["classic", "strict", "seconds", "off"];
  var VALID_APP_MODES = ["timer", "clock"];
  var DEFAULTS = {
    app: "timer",
    t: 3600,
    n: 3600,
    s: 0,
    // 0 means "generate from timestamp"
    rows: 24,
    mode: "standard",
    clock: false,
    theme: "nixie",
    timerMode: "classic",
    glow: 1,
    cs: true,
    friction: 1
  };
  function readParams() {
    const sp = new URLSearchParams(window.location.search);
    const raw = (key, fallback) => {
      const v = sp.get(key);
      if (v === null) return fallback;
      const num = parseInt(v, 10);
      return Number.isFinite(num) ? num : fallback;
    };
    let seed = raw("s", DEFAULTS.s);
    if (seed === 0) {
      seed = Date.now() % 1e6 | 1;
    }
    const appRaw = (sp.get("app") || DEFAULTS.app).toLowerCase().trim();
    const app = VALID_APP_MODES.includes(appRaw) ? appRaw : DEFAULTS.app;
    const modeRaw = (sp.get("mode") || DEFAULTS.mode).toLowerCase().trim();
    const mode = VALID_MODES.includes(modeRaw) ? modeRaw : DEFAULTS.mode;
    const clockRaw = sp.get("clock");
    const clock = clockRaw === null ? DEFAULTS.clock : clockRaw !== "false" && clockRaw !== "0";
    const themeRaw = (sp.get("theme") || DEFAULTS.theme).toLowerCase().trim();
    const theme = VALID_THEMES.includes(themeRaw) ? themeRaw : DEFAULTS.theme;
    const timerModeRaw = (sp.get("timerMode") || DEFAULTS.timerMode).toLowerCase().trim();
    const timerMode = VALID_TIMER_MODES.includes(timerModeRaw) ? timerModeRaw : DEFAULTS.timerMode;
    const glowRaw = sp.get("glow");
    const glow = glowRaw !== null ? Math.max(0, Math.min(2, parseFloat(glowRaw) || DEFAULTS.glow)) : DEFAULTS.glow;
    const csRaw = sp.get("cs");
    const cs = csRaw === null ? DEFAULTS.cs : csRaw !== "false" && csRaw !== "0";
    const frictionRaw = sp.get("friction");
    const friction = frictionRaw !== null ? Math.max(0.5, Math.min(3, parseFloat(frictionRaw) || DEFAULTS.friction)) : DEFAULTS.friction;
    return {
      app,
      t: Math.max(1, raw("t", DEFAULTS.t)),
      n: Math.max(10, Math.min(3600, raw("n", DEFAULTS.n))),
      s: seed,
      rows: Math.max(4, Math.min(64, raw("rows", DEFAULTS.rows))),
      mode,
      clock,
      theme,
      timerMode,
      glow,
      cs,
      friction
    };
  }
  function writeParams(cfg) {
    const sp = new URLSearchParams();
    sp.set("app", cfg.app);
    sp.set("t", String(cfg.t));
    sp.set("n", String(cfg.n));
    sp.set("s", String(cfg.s));
    sp.set("rows", String(cfg.rows));
    sp.set("mode", cfg.mode);
    sp.set("clock", String(cfg.clock));
    sp.set("theme", cfg.theme);
    sp.set("timerMode", cfg.timerMode);
    sp.set("glow", String(cfg.glow));
    sp.set("cs", String(cfg.cs));
    sp.set("friction", String(cfg.friction));
    const url = `${window.location.pathname}?${sp.toString()}`;
    window.history.replaceState(null, "", url);
  }

  // src/utils/seed.ts
  function createPRNG(seed) {
    let s = seed | 0;
    return () => {
      s |= 0;
      s = s + 1831565813 | 0;
      let t = Math.imul(s ^ s >>> 15, 1 | s);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  // src/engine/simulation.ts
  var PRESETS = {
    "Standard": {
      restitution: 0.2,
      restitutionRange: 0.08,
      nudge: 0.08,
      dragX: 3,
      dragY: 1.5,
      dragXSettle: 6,
      dragYSettle: 3,
      gravity: 800
    },
    "Heavy Sand": {
      restitution: 0.01,
      restitutionRange: 0.02,
      nudge: 0.1,
      dragX: 6,
      dragY: 2,
      dragXSettle: 14,
      dragYSettle: 7,
      gravity: 1400
    },
    "Techno": {
      restitution: 0,
      restitutionRange: 0,
      nudge: 0.15,
      dragX: 10,
      dragY: 1,
      dragXSettle: 18,
      dragYSettle: 4,
      gravity: 1600
    },
    "Moon Gravity": {
      restitution: 0.08,
      restitutionRange: 0.03,
      nudge: 0.12,
      dragX: 2,
      dragY: 0.08,
      dragXSettle: 3,
      dragYSettle: 0.8,
      gravity: 50
    },
    "Super Ball": {
      restitution: 0.7,
      restitutionRange: 0.15,
      nudge: 0.04,
      dragX: 0.8,
      dragY: 0.4,
      dragXSettle: 2.5,
      dragYSettle: 1.2,
      gravity: 800
    }
  };
  var PHYSICS = { ...PRESETS["Standard"] };
  function fract(x) {
    return x - Math.floor(x);
  }
  function timeToHit(y, vy, g, targetY) {
    const dy = targetY - y;
    if (dy <= 0) return 0;
    if (Math.abs(g) < 1e-6) {
      return vy > 1e-9 ? dy / vy : Infinity;
    }
    const disc = vy * vy + 2 * g * dy;
    if (disc < 0) return Infinity;
    const sqrtDisc = Math.sqrt(disc);
    const t1 = (-vy + sqrtDisc) / g;
    const t2 = (-vy - sqrtDisc) / g;
    let t = Infinity;
    if (t1 > 1e-9) t = t1;
    if (t2 > 1e-9 && t2 < t) t = t2;
    return t;
  }
  function maxBinProbability(numRows) {
    const k = Math.floor(numRows / 2);
    let logC = 0;
    for (let i = 1; i <= numRows; i++) logC += Math.log(i);
    for (let i = 1; i <= k; i++) logC -= Math.log(i);
    for (let i = 1; i <= numRows - k; i++) logC -= Math.log(i);
    return Math.exp(logC - numRows * Math.LN2);
  }
  var PEG_COLLISION_FRAC = 0.3;
  var Simulation = class {
    constructor(cfg) {
      this.activeParticles = [];
      this.emittedCount = 0;
      this.elapsedMs = 0;
      this.allEmitted = false;
      this.allSettled = false;
      this.numRows = cfg.numRows;
      this.totalParticles = cfg.totalParticles;
      this.totalTimeMs = cfg.totalTimeSec * 1e3;
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
    update(dtMs, geom, getGroundY) {
      const dt = Math.min(dtMs, 100) / 1e3;
      const settled = [];
      if (!this.allEmitted) {
        const expectedEmitted = Math.min(
          this.totalParticles,
          Math.floor(this.elapsedMs / this.emitIntervalMs)
        );
        const toEmit = expectedEmitted - this.emittedCount;
        for (let i = 0; i < toEmit; i++) {
          this.activeParticles.push(this.createParticle(geom));
        }
        if (this.emittedCount >= this.totalParticles) this.allEmitted = true;
      }
      const alive = [];
      const halfBoard = geom.pegSpacing * (this.numRows / 2 + 1.5);
      const pegR = geom.pegSpacing * PEG_COLLISION_FRAC;
      for (const p of this.activeParticles) {
        const g = PHYSICS.gravity;
        const settling = p.pegIndex >= this.numRows;
        const dxCoeff = settling ? PHYSICS.dragXSettle : PHYSICS.dragX;
        const dyCoeff = settling ? PHYSICS.dragYSettle : PHYSICS.dragY;
        p.vx *= Math.exp(-dxCoeff * dt);
        p.vy *= Math.exp(-dyCoeff * dt);
        let remainDt = dt;
        let didSettle = false;
        const MAX_CCD_ITER = this.numRows + 2;
        for (let iter = 0; iter < MAX_CCD_ITER && remainDt > 0; iter++) {
          if (p.pegIndex < this.numRows) {
            const pegRowY = geom.pegY(p.pegIndex);
            const tHit = timeToHit(p.y, p.vy, g, pegRowY);
            if (tHit > remainDt) {
              p.x += p.vx * remainDt;
              p.y += p.vy * remainDt + 0.5 * g * remainDt * remainDt;
              p.vy += g * remainDt;
              remainDt = 0;
              break;
            }
            p.x += p.vx * tHit;
            p.vy += g * tHit;
            p.y = pegRowY;
            remainDt -= tHit;
            const dir = p.path[p.pegIndex];
            const bj = fract(p.jitter * 997 + p.pegIndex * 7.31);
            let hIdx = 0;
            for (let i = 0; i < p.pegIndex; i++) hIdx += p.path[i];
            const pegCX = geom.pegX(p.pegIndex, hIdx);
            const nudge = PHYSICS.nudge;
            p.x = p.x * (1 - nudge) + pegCX * nudge;
            let dx = p.x - pegCX;
            const minOff = pegR * (0.1 + 0.12 * bj);
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
            const groundY = getGroundY(p.x);
            const tGround = timeToHit(p.y, p.vy, g, groundY);
            if (tGround > remainDt) {
              p.x += p.vx * remainDt;
              p.y += p.vy * remainDt + 0.5 * g * remainDt * remainDt;
              p.vy += g * remainDt;
              remainDt = 0;
              break;
            }
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
    getRemainingTimeSec() {
      return Math.max(0, (this.totalTimeMs - this.elapsedMs) / 1e3);
    }
    /**
     * Set elapsed time from Worker tick.
     * This is the SOLE source of truth for elapsed time.
     */
    setElapsedMs(ms) {
      this.elapsedMs = ms;
    }
    /** Add time to total duration and recalculate emission interval. */
    addTime(ms) {
      this.totalTimeMs += ms;
      this.emitIntervalMs = this.totalTimeMs / this.totalParticles;
    }
    /**
     * Instant-snap: emit all particles that SHOULD have been emitted by now
     * (based on current elapsedMs) but weren't. Skip physics; settle immediately.
     * Used after tab-hidden restore when elapsedMs has advanced but update() didn't run.
     */
    instantSnap(geom) {
      const expectedEmitted = Math.min(
        this.totalParticles,
        Math.floor(this.elapsedMs / this.emitIntervalMs)
      );
      const toEmit = expectedEmitted - this.emittedCount;
      if (toEmit <= 0) return [];
      const settled = [];
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
    forceSettleActive() {
      const settled = [];
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
    reset() {
      this.activeParticles = [];
      this.binCounts.fill(0);
      this.emittedCount = 0;
      this.elapsedMs = 0;
      this.allEmitted = false;
      this.allSettled = false;
    }
    createParticle(geom) {
      const path = [];
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
        jitter: this.rng()
      };
    }
  };

  // src/engine/seven-seg.ts
  var DIGIT_SEGMENTS = [
    [true, true, true, true, true, true, false],
    // 0
    [false, true, true, false, false, false, false],
    // 1
    [true, true, false, true, true, false, true],
    // 2
    [true, true, true, true, false, false, true],
    // 3
    [false, true, true, false, false, true, true],
    // 4
    [true, false, true, true, false, true, true],
    // 5
    [true, false, true, true, true, true, true],
    // 6
    [true, true, true, false, false, false, false],
    // 7
    [true, true, true, true, true, true, true],
    // 8
    [true, true, true, true, false, true, true]
    // 9
  ];
  var CLOCK_THEMES = [
    { name: "Nixie", segmentRGB: [255, 147, 41], grainRGB: [255, 180, 100], glowIntensity: 1.2 },
    { name: "System", segmentRGB: [0, 255, 65], grainRGB: [120, 255, 140], glowIntensity: 0.8 },
    { name: "Studio", segmentRGB: [220, 220, 230], grainRGB: [230, 230, 240], glowIntensity: 1 },
    { name: "Cyber", segmentRGB: [0, 150, 255], grainRGB: [80, 180, 255], glowIntensity: 1 }
  ];
  function getThemeByName(name) {
    const lower = name.toLowerCase();
    return CLOCK_THEMES.find((t) => t.name.toLowerCase() === lower) || CLOCK_THEMES[0];
  }
  function drawSegmentPath(ctx, x, y, w, h, segIndex, thickness) {
    const ht = thickness / 2;
    const margin = thickness * 0.3;
    let sx, sy, len, horizontal;
    switch (segIndex) {
      case 0:
        sx = x + margin;
        sy = y;
        len = w - margin * 2;
        horizontal = true;
        break;
      case 1:
        sx = x + w;
        sy = y + margin;
        len = h / 2 - margin * 2;
        horizontal = false;
        break;
      case 2:
        sx = x + w;
        sy = y + h / 2 + margin;
        len = h / 2 - margin * 2;
        horizontal = false;
        break;
      case 3:
        sx = x + margin;
        sy = y + h;
        len = w - margin * 2;
        horizontal = true;
        break;
      case 4:
        sx = x;
        sy = y + h / 2 + margin;
        len = h / 2 - margin * 2;
        horizontal = false;
        break;
      case 5:
        sx = x;
        sy = y + margin;
        len = h / 2 - margin * 2;
        horizontal = false;
        break;
      case 6:
        sx = x + margin;
        sy = y + h / 2;
        len = w - margin * 2;
        horizontal = true;
        break;
      default:
        return;
    }
    if (horizontal) {
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx + ht, sy - ht);
      ctx.lineTo(sx + len - ht, sy - ht);
      ctx.lineTo(sx + len, sy);
      ctx.lineTo(sx + len - ht, sy + ht);
      ctx.lineTo(sx + ht, sy + ht);
      ctx.closePath();
    } else {
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx - ht, sy + ht);
      ctx.lineTo(sx - ht, sy + len - ht);
      ctx.lineTo(sx, sy + len);
      ctx.lineTo(sx + ht, sy + len - ht);
      ctx.lineTo(sx + ht, sy + ht);
      ctx.closePath();
    }
  }
  function drawDigit(ctx, x, y, w, h, segments, rgb, glowIntensity) {
    const thickness = Math.max(1.2, w * 0.07);
    const glowScales = [5.5, 4.5, 3.5, 2.8, 2.2, 1.8];
    const glowAlphaFactors = [0.5, 0.7, 1, 1, 1.2, 1.2];
    for (let s = 0; s < 7; s++) {
      if (segments[s]) {
        const glowAlpha = 0.09 * glowIntensity;
        for (let pass = 0; pass < 6; pass++) {
          ctx.fillStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${(glowAlpha * glowAlphaFactors[pass]).toFixed(4)})`;
          ctx.beginPath();
          drawSegmentPath(ctx, x, y, w, h, s, thickness * glowScales[pass]);
          ctx.fill();
        }
        ctx.fillStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0.85)`;
        ctx.beginPath();
        drawSegmentPath(ctx, x, y, w, h, s, thickness);
        ctx.fill();
      } else {
        ctx.fillStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0.02)`;
        ctx.beginPath();
        drawSegmentPath(ctx, x, y, w, h, s, thickness);
        ctx.fill();
      }
    }
  }
  function drawColon(ctx, x, y, dotR, rgb, glowIntensity, digitH) {
    const topY = y - digitH * 0.2;
    const botY = y + digitH * 0.2;
    const alpha = 0.4;
    const glowAlpha = 0.09 * glowIntensity;
    for (const dy of [topY, botY]) {
      for (let pass = 0; pass < 3; pass++) {
        const scale = [3, 2.2, 1.6][pass];
        const factor = [0.6, 0.9, 1.1][pass];
        ctx.fillStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${(glowAlpha * factor).toFixed(4)})`;
        ctx.beginPath();
        ctx.arc(x, dy, dotR * scale, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha})`;
      ctx.beginPath();
      ctx.arc(x, dy, dotR, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  function drawClock(ctx, totalSec, cx, cy, digitH, theme, centiseconds) {
    const hh = Math.floor(totalSec / 3600);
    const mm = Math.floor(totalSec % 3600 / 60);
    const ss = Math.floor(totalSec % 60);
    const digitW = digitH * 0.5;
    const pairGap = digitW * 0.35;
    const groupGap = digitW * 1.3;
    const rgb = theme.segmentRGB;
    const glow = theme.glowIntensity;
    let groups;
    if (centiseconds !== void 0) {
      groups = [
        [Math.floor(mm / 10), mm % 10],
        [Math.floor(ss / 10), ss % 10],
        [Math.floor(centiseconds / 10), centiseconds % 10]
      ];
    } else if (hh > 0) {
      groups = [
        [Math.floor(hh / 10), hh % 10],
        [Math.floor(mm / 10), mm % 10],
        [Math.floor(ss / 10), ss % 10]
      ];
    } else {
      groups = [
        [Math.floor(mm / 10), mm % 10],
        [Math.floor(ss / 10), ss % 10]
      ];
    }
    const numGroups = groups.length;
    const pairW = digitW * 2 + pairGap;
    const totalW = pairW * numGroups + groupGap * (numGroups - 1);
    const startX = cx - totalW / 2;
    const startY = cy - digitH / 2;
    let dx = startX;
    const dotR = Math.max(1.2, digitW * 0.08);
    for (let g = 0; g < numGroups; g++) {
      const [d1, d2] = groups[g];
      drawDigit(ctx, dx, startY, digitW, digitH, DIGIT_SEGMENTS[d1], rgb, glow);
      dx += digitW + pairGap;
      drawDigit(ctx, dx, startY, digitW, digitH, DIGIT_SEGMENTS[d2], rgb, glow);
      dx += digitW;
      if (g < numGroups - 1) {
        const colonX = dx + groupGap / 2;
        drawColon(ctx, colonX, cy, dotR, rgb, glow, digitH);
        dx += groupGap;
      }
    }
  }

  // src/engine/layout.ts
  var SQRT3_2 = Math.sqrt(3) / 2;
  function computeLayout(w, h, dpr, numRows, totalParticles) {
    const centerX = w / 2;
    const marginX = w * 0.15;
    const contentW = w - marginX * 2;
    const topMargin = h * 0.05;
    const bottomMargin = h * 0.15;
    const safeH = h - topMargin - bottomMargin;
    const dxFromWidth = contentW / (numRows + 2);
    const inlineTimerH = h * 0.06;
    const gapBudget = h * 0.03;
    const availableForSystem = safeH - inlineTimerH - gapBudget;
    const boardH_target = availableForSystem * 3 / 5;
    const dxFromRatio = numRows > 1 ? boardH_target / ((numRows - 1) * SQRT3_2) : dxFromWidth;
    const pegSpacing = Math.min(dxFromWidth, dxFromRatio);
    const rowSpacingY = pegSpacing * SQRT3_2;
    const boardH = numRows > 1 ? (numRows - 1) * rowSpacingY : 0;
    const grainRadius = Math.max(1.2, Math.min(3.5, pegSpacing * 0.09));
    const pegRadius = Math.max(1.5, Math.min(5, pegSpacing * 0.12));
    const nozzleHW = pegSpacing * 0.8;
    const gridHW = numRows * pegSpacing / 2;
    const hopperTopHW = Math.max(pegSpacing * 4, gridHW * 1.3);
    const hopperRectHW = hopperTopHW;
    const taperH = Math.max(boardH / 3, pegSpacing * 2.5);
    const hopperToGrid = Math.max(pegSpacing * 0.6, h * 0.012);
    const gridToAcc = Math.max(pegSpacing * 0.7, h * 0.015);
    const accBottom = h - bottomMargin;
    const aboveAccH = inlineTimerH + taperH + hopperToGrid + boardH + gridToAcc;
    const accHeight_available = safeH - aboveAccH;
    const accHeight = Math.max(pegSpacing * 2, Math.min(accHeight_available, boardH / 2));
    const maxProb = maxBinProbability(numRows);
    const maxBinCount = maxProb * totalParticles * 1.15;
    const accTop = accBottom - accHeight;
    const boardBottom = accTop - gridToAcc;
    const boardTopY = boardBottom - boardH;
    const hopperBottom = boardTopY - hopperToGrid;
    const hopperTop = hopperBottom - taperH;
    const hopperJunction = hopperTop;
    const emitY = hopperBottom + hopperToGrid * 0.55;
    const inlineTimerY = Math.max(topMargin + inlineTimerH * 0.5, hopperTop - inlineTimerH * 0.6);
    const stackScale = accHeight * 0.85 / (maxProb * totalParticles);
    const d_natural = grainRadius * 1.6;
    const rowH_natural = d_natural * SQRT3_2;
    const peakCeiling = accHeight * 0.95;
    const stackRowH = maxBinCount > 0 ? Math.min(rowH_natural, peakCeiling / maxBinCount) : rowH_natural;
    const miniGrainR = Math.max(0.8, grainRadius * 0.55);
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
    const maxOffset = h - uiSafeBottom - finalAccBottom;
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
      width: w,
      height: h,
      dpr,
      centerX,
      contentW,
      hopperTop: finalHopperTop,
      hopperJunction: finalHopperJunction,
      hopperBottom: finalHopperBottom,
      hopperRectHW,
      hopperTopHW: hopperRectHW,
      nozzleHW,
      hopperSigma: taperH * 0.47 / pegSpacing,
      emitY: finalEmitY,
      boardTop: finalBoardTop,
      boardBottom: finalBoardBottom,
      accTop: finalAccTop,
      accBottom: finalAccBottom,
      accHeight,
      inlineTimerY: finalInlineTimerY,
      pegSpacing,
      rowSpacingY,
      numRows,
      pegRadius,
      grainRadius,
      settledDiameter: stackRowH,
      settledRadius: stackRowH / 2,
      stackScale,
      stackRowH,
      miniGrainR
    };
  }
  function pegX(L, row, index) {
    return L.centerX + (index - row / 2) * L.pegSpacing;
  }
  function pegY(L, row) {
    return L.boardTop + row * L.rowSpacingY;
  }
  function gaussianHW(y, L) {
    const totalH = L.hopperBottom - L.hopperTop;
    if (totalH <= 0) return L.nozzleHW;
    const t = Math.max(0, Math.min(1, (L.hopperBottom - y) / totalH));
    const sigPx = L.hopperSigma * L.pegSpacing;
    const d = t * totalH;
    const gaussVal = 1 - Math.exp(-(d * d) / (2 * sigPx * sigPx));
    return L.nozzleHW + (L.hopperTopHW - L.nozzleHW) * gaussVal;
  }
  function computeHopperGrains(L, totalCount, grainR) {
    const grains = [];
    const d = grainR * 2.1;
    const rowH = d * SQRT3_2;
    const cx = L.centerX;
    const trapH = L.hopperBottom - L.hopperJunction;
    let row = 0;
    let y = L.hopperBottom - grainR * 1.5;
    while (grains.length < totalCount) {
      const hw = gaussianHW(y, L);
      const usableW = hw * 0.88;
      const xOff = row % 2 === 1 ? d * 0.5 : 0;
      const nCols = Math.max(1, Math.floor(usableW * 2 / d));
      for (let c = 0; c < nCols && grains.length < totalCount; c++) {
        const gx = cx - usableW + xOff + c * d + grainR;
        const seed = row * 1009 + c * 7919 + 31337 & 2147483647;
        const jx = (seed % 1e3 / 1e3 - 0.5) * grainR * 0.5;
        const jy = ((seed * 1103515245 + 12345 & 2147483647) % 1e3 / 1e3 - 0.5) * grainR * 0.4;
        grains.push({ x: gx + jx, y: y + jy });
      }
      y -= rowH;
      row++;
    }
    const totalH = L.hopperBottom - L.hopperTop || 1;
    const bowlDepth = 0.35;
    grains.sort((a, b) => {
      const hA = (L.hopperBottom - a.y) / totalH;
      const hB = (L.hopperBottom - b.y) / totalH;
      const hwA = gaussianHW(a.y, L) || 1;
      const hwB = gaussianHW(b.y, L) || 1;
      const offA = Math.abs(a.x - cx) / hwA;
      const offB = Math.abs(b.x - cx) / hwB;
      const bowlA = (1 - offA * offA) * bowlDepth;
      const bowlB = (1 - offB * offB) * bowlDepth;
      const nA = ((Math.round(a.x * 73) ^ Math.round(a.y * 137)) & 32767) / 32767 * 0.06;
      const nB = ((Math.round(b.x * 73) ^ Math.round(b.y * 137)) & 32767) / 32767 * 0.06;
      return hA + bowlA + nA - (hB + bowlB + nB);
    });
    return grains;
  }
  function stackJitterX(bin, k, maxJitter) {
    const hash = bin * 2654435761 + k * 340573321 >>> 0 & 2147483647;
    return (hash % 1e4 / 1e4 - 0.5) * 2 * maxJitter;
  }
  function stackJitterY(bin, k, maxJitter) {
    const hash = bin * 1103515245 + k * 1299709 >>> 0 & 2147483647;
    return (hash % 1e4 / 1e4 - 0.5) * 2 * maxJitter;
  }

  // src/engine/grain-renderer.ts
  var PI2 = Math.PI * 2;
  var GRAIN_ALPHA = 0.85;
  var GRAIN_GLOW_ALPHA = 0.06;
  var GRAIN_GLOW_SCALE = 2.5;
  var STATIC_GRAIN_ALPHA = 1;
  var GrainRenderer = class {
    // opaque — for baked stack grains
    constructor(container2) {
      /** Hopper grain positions (pre-computed). */
      this.hopperGrainCache = [];
      // ── Purge drain animation ──
      this.purgeOffsets = [];
      this.purgeVelocities = [];
      this.purgeDelays = [];
      this.purgeAlphas = [];
      this.purging = false;
      // ── Grain colors ──
      this.grainCoreFill = "";
      this.grainGlowFill = "";
      this.staticGrainFill = "";
      this.staticCanvas = document.createElement("canvas");
      this.dynamicCanvas = document.createElement("canvas");
      for (const c of [this.staticCanvas, this.dynamicCanvas]) {
        c.style.position = "absolute";
        c.style.top = "0";
        c.style.left = "0";
        container2.appendChild(c);
      }
      this.sCtx = this.staticCanvas.getContext("2d");
      this.dCtx = this.dynamicCanvas.getContext("2d");
      this.binCounts = [];
    }
    updateGrainColors(theme) {
      const [r, g, b] = theme.grainRGB;
      this.grainCoreFill = `rgba(${r},${g},${b},${GRAIN_ALPHA})`;
      this.grainGlowFill = `rgba(${r},${g},${b},${GRAIN_GLOW_ALPHA})`;
      this.staticGrainFill = `rgba(${r},${g},${b},${STATIC_GRAIN_ALPHA})`;
    }
    applyLayout(L, totalParticles) {
      const w = L.width;
      const h = L.height;
      const dpr = L.dpr;
      for (const c of [this.staticCanvas, this.dynamicCanvas]) {
        c.width = w * dpr;
        c.height = h * dpr;
        c.style.width = w + "px";
        c.style.height = h + "px";
      }
      this.sCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.dCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.binCounts = new Array(L.numRows + 1).fill(0);
      this.sCtx.clearRect(0, 0, w, h);
      this.hopperGrainCache = computeHopperGrains(L, totalParticles, L.miniGrainR);
    }
    getBinCounts() {
      return this.binCounts;
    }
    // ── Baking — grain with slot-width X jitter ──
    bakeParticle(L, p) {
      const bin = p.bin;
      this.binCounts[bin]++;
      const count = this.binCounts[bin];
      const binX = pegX(L, L.numRows - 1, bin);
      const mr = L.miniGrainR;
      const d = mr * 2.1;
      const rowH = L.stackRowH;
      const maxJitterX = Math.min(4, mr * 2.5);
      const maxJitterY = rowH * 0.18;
      const hexOff = count % 2 === 0 ? d * 0.5 : 0;
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
    rebakeStatic(L, _theme) {
      if (!L) return;
      this.sCtx.clearRect(0, 0, L.width, L.height);
      const mr = L.miniGrainR;
      const d = mr * 2.1;
      const rowH = L.stackRowH;
      const maxJitterX = Math.min(4, mr * 2.5);
      const maxJitterY = rowH * 0.18;
      this.sCtx.fillStyle = this.staticGrainFill;
      this.sCtx.beginPath();
      for (let bin = 0; bin <= L.numRows; bin++) {
        const binX = pegX(L, L.numRows - 1, bin);
        for (let k = 1; k <= this.binCounts[bin]; k++) {
          const hexOff = k % 2 === 0 ? d * 0.5 : 0;
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
    drawHopper(ctx, L, emitted, total) {
      const cx = L.centerX;
      ctx.save();
      const visTop = Math.max(0, L.hopperTop);
      ctx.strokeStyle = "rgba(255,255,255,0.08)";
      ctx.lineWidth = 0.5;
      const nSamples = 40;
      ctx.beginPath();
      for (let i = 0; i <= nSamples; i++) {
        const y = visTop + (L.hopperBottom - visTop) * (i / nSamples);
        const hw = gaussianHW(y, L);
        if (i === 0) ctx.moveTo(cx + hw, y);
        else ctx.lineTo(cx + hw, y);
      }
      for (let i = nSamples; i >= 0; i--) {
        const y = visTop + (L.hopperBottom - visTop) * (i / nSamples);
        const hw = gaussianHW(y, L);
        ctx.lineTo(cx - hw, y);
      }
      ctx.closePath();
      ctx.stroke();
      const remaining = Math.max(0, total - emitted);
      const visibleCount = Math.min(remaining, this.hopperGrainCache.length);
      if (visibleCount > 0) {
        const r = L.miniGrainR;
        ctx.fillStyle = this.grainGlowFill;
        ctx.beginPath();
        for (let i = 0; i < visibleCount; i++) {
          const g = this.hopperGrainCache[i];
          if (g.y < -r * 3) continue;
          ctx.moveTo(g.x + r * GRAIN_GLOW_SCALE, g.y);
          ctx.arc(g.x, g.y, r * GRAIN_GLOW_SCALE, 0, PI2);
        }
        ctx.fill();
        ctx.fillStyle = this.grainCoreFill;
        ctx.beginPath();
        for (let i = 0; i < visibleCount; i++) {
          const g = this.hopperGrainCache[i];
          if (g.y < -r) continue;
          ctx.moveTo(g.x + r, g.y);
          ctx.arc(g.x, g.y, r, 0, PI2);
        }
        ctx.fill();
      }
      if (remaining > 0) {
        const now = performance.now();
        const r = L.miniGrainR;
        const streamCount = remaining < 10 ? Math.max(1, Math.ceil(remaining / 3)) : 4;
        for (let i = 0; i < streamCount; i++) {
          const phase = (now * 3e-3 + i * 0.25) % 1;
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
    drawPegs(ctx, L, theme, pegAlphaOverride) {
      const [pr, pg, pb] = theme.segmentRGB;
      const alpha = pegAlphaOverride !== void 0 ? pegAlphaOverride : 0.15;
      const themeWeight = pegAlphaOverride !== void 0 && pegAlphaOverride > 0.5 ? 0.6 : 0.3;
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
    drawParticles(ctx, L, particles) {
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
    drawRainParticles(ctx, L, rain, theme) {
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
    beginPurge(L) {
      const numBins = L.numRows + 1;
      this.purgeOffsets = new Array(numBins).fill(0);
      this.purgeVelocities = new Array(numBins).fill(0);
      this.purgeDelays = [];
      this.purgeAlphas = new Array(numBins).fill(1);
      for (let i = 0; i < numBins; i++) {
        const hash = i * 2654435761 >>> 0 & 2147483647;
        this.purgeDelays.push(hash % 1e3 / 1e3 * 0.2);
      }
      this.purging = true;
    }
    /**
     * Drain animation: each bin's grains fall with gravity.
     * Returns true when fully drained.
     */
    purgeStacks(L, dt, theme) {
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
      const [gr, gg, gb] = theme.grainRGB;
      this.sCtx.beginPath();
      let anyGlow = false;
      for (let bin = 0; bin <= L.numRows; bin++) {
        const alpha = this.purgeAlphas[bin];
        if (alpha <= 0 || this.binCounts[bin] === 0) continue;
        const offset = this.purgeOffsets[bin];
        const binX = pegX(L, L.numRows - 1, bin);
        for (let k = 0; k < this.binCounts[bin]; k++) {
          const kk = k + 1;
          const hexOff = kk % 2 === 0 ? d * 0.5 : 0;
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
      for (let bin = 0; bin <= L.numRows; bin++) {
        const alpha = this.purgeAlphas[bin];
        if (alpha <= 0 || this.binCounts[bin] === 0) continue;
        const offset = this.purgeOffsets[bin];
        const binX = pegX(L, L.numRows - 1, bin);
        this.sCtx.fillStyle = `rgba(${gr},${gg},${gb},${(GRAIN_ALPHA * alpha).toFixed(3)})`;
        this.sCtx.beginPath();
        for (let k = 0; k < this.binCounts[bin]; k++) {
          const kk = k + 1;
          const hexOff = kk % 2 === 0 ? d * 0.5 : 0;
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
    clearStatic(L) {
      this.binCounts.fill(0);
      this.sCtx.clearRect(0, 0, L.width, L.height);
      this.purging = false;
    }
    /** Ground height based on nearest bin's grain count. */
    getGroundY(L, x) {
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
  };

  // src/engine/renderer.ts
  var Renderer = class {
    constructor(container2, numRows, totalParticles, _seed) {
      // ── Theme & clock ──
      this.clockEnabled = true;
      this.currentTheme = CLOCK_THEMES[0];
      // ── Alarm ──
      this.alarmActive = false;
      this.alarmFlashStart = 0;
      this.alarmHighlight = false;
      this.totalParticles = totalParticles;
      this.gr = new GrainRenderer(container2);
      this.gr.updateGrainColors(this.currentTheme);
      this.resize(numRows);
    }
    setClockEnabled(v) {
      this.clockEnabled = v;
    }
    setTheme(theme) {
      this.currentTheme = theme;
      this.gr.updateGrainColors(theme);
      const [r, g, b] = theme.segmentRGB;
      document.documentElement.style.setProperty(
        "--bg",
        `rgb(${Math.round(r * 0.02)},${Math.round(g * 0.02)},${Math.round(b * 0.02)})`
      );
      this.gr.rebakeStatic(this.layout, theme);
    }
    setThemeByName(name) {
      this.setTheme(getThemeByName(name));
    }
    setGlowIntensity(v) {
      this.currentTheme = { ...this.currentTheme, glowIntensity: v };
    }
    getTheme() {
      return this.currentTheme;
    }
    resize(numRows) {
      const dpr = window.devicePixelRatio || 1;
      const w = window.innerWidth;
      const h = window.innerHeight;
      this.layout = computeLayout(w, h, dpr, numRows, this.totalParticles);
      this.gr.applyLayout(this.layout, this.totalParticles);
    }
    // ── Geometry for simulation ──
    pegX(row, index) {
      return pegX(this.layout, row, index);
    }
    pegY(row) {
      return pegY(this.layout, row);
    }
    getGeom() {
      return {
        emitX: this.layout.centerX,
        emitY: this.layout.emitY,
        pegX: (r, i) => this.pegX(r, i),
        pegY: (r) => this.pegY(r),
        pegSpacing: this.layout.pegSpacing,
        numRows: this.layout.numRows,
        accBottom: this.layout.accBottom
      };
    }
    /** Ground height based on nearest bin's grain count. */
    getGroundY(x) {
      return this.gr.getGroundY(this.layout, x);
    }
    // ── Baking ──
    bakeParticle(p) {
      this.gr.bakeParticle(this.layout, p);
    }
    // ── Frame drawing ──
    drawFrame(particles, remainingSec, totalParticles, emittedCount, _paused, totalMs, rain, centiseconds, wallClockSec) {
      const L = this.layout;
      const ctx = this.gr.dCtx;
      ctx.clearRect(0, 0, L.width, L.height);
      if (totalMs !== void 0 && totalMs > 0) {
        this.drawProgressBar(ctx, remainingSec * 1e3, totalMs);
      }
      if (this.clockEnabled) {
        if (wallClockSec !== void 0) {
          this.drawSevenSegClock(ctx, wallClockSec, void 0);
        } else {
          this.drawSevenSegClock(ctx, remainingSec, centiseconds);
        }
      }
      if (wallClockSec !== void 0) {
        this.drawInlineTimer(ctx, wallClockSec, void 0);
      } else {
        this.drawInlineTimer(ctx, remainingSec, centiseconds);
      }
      this.gr.drawHopper(ctx, L, emittedCount, totalParticles);
      let pegAlpha;
      if (this.alarmActive) {
        const elapsed = performance.now() - this.alarmFlashStart;
        const flashDuration = 200;
        const totalFlashes = 10;
        const flashIndex = elapsed / flashDuration;
        if (flashIndex < totalFlashes) {
          const phase = flashIndex % 1;
          const wave = Math.sin(phase * Math.PI);
          pegAlpha = 0.15 + 0.7 * wave;
        } else {
          pegAlpha = 0.55;
          this.alarmHighlight = true;
        }
      }
      this.gr.drawPegs(ctx, L, this.currentTheme, pegAlpha);
      this.gr.drawParticles(ctx, L, particles);
      if (rain && rain.length > 0) {
        this.gr.drawRainParticles(ctx, L, rain, this.currentTheme);
      }
    }
    drawProgressBar(ctx, remainingMs, totalMs) {
      const progress = Math.max(0, Math.min(1, 1 - remainingMs / totalMs));
      const [r, g, b] = this.currentTheme.segmentRGB;
      ctx.fillStyle = `rgba(${r},${g},${b},0.60)`;
      ctx.fillRect(0, 0, this.layout.width * progress, 2);
    }
    drawSevenSegClock(ctx, sec, centiseconds) {
      const L = this.layout;
      const digitH = Math.min(L.width * 0.22, L.height * 0.25);
      drawClock(ctx, Math.floor(sec), L.centerX, L.height / 2, digitH, this.currentTheme, centiseconds);
    }
    drawInlineTimer(ctx, sec, centiseconds) {
      if (sec <= 0) return;
      const L = this.layout;
      const digitH = L.height * 0.04;
      drawClock(ctx, Math.floor(sec), L.centerX, L.inlineTimerY, digitH, this.currentTheme, centiseconds);
    }
    // ── Rain particles (refill — identical grain rendering) ──
    drawRainParticles(ctx, rainParticles2) {
      this.gr.drawRainParticles(ctx, this.layout, rainParticles2, this.currentTheme);
    }
    // ── Purge ──
    beginPurge() {
      this.gr.beginPurge(this.layout);
    }
    purgeStacks(dt) {
      return this.gr.purgeStacks(this.layout, dt, this.currentTheme);
    }
    // ── Alarm ──
    startAlarm() {
      this.alarmActive = true;
      this.alarmFlashStart = performance.now();
      this.alarmHighlight = false;
    }
    stopAlarm() {
      this.alarmActive = false;
      this.alarmHighlight = false;
    }
    /** Clear baked grains and reset all state. */
    clearStatic() {
      this.gr.clearStatic(this.layout);
    }
  };

  // src/engine/timer-bridge.ts
  var TimerBridge = class {
    constructor() {
      this.onTick = null;
      this.onDone = null;
      this.worker = new Worker("dist/timer-worker.js");
      this.worker.onmessage = (e) => {
        const msg = e.data;
        if (msg.type === "TICK") {
          this.onTick?.(msg.remainingMs, msg.elapsedMs);
        } else if (msg.type === "DONE") {
          this.onDone?.();
        }
      };
    }
    start(totalMs) {
      this.worker.postMessage({
        type: "START",
        totalMs,
        startAbsMs: performance.now()
      });
    }
    addTime(addMs) {
      this.worker.postMessage({ type: "ADD_TIME", addMs });
    }
    pause() {
      this.worker.postMessage({ type: "PAUSE" });
    }
    resume() {
      this.worker.postMessage({
        type: "RESUME",
        resumeAbsMs: performance.now()
      });
    }
    reset() {
      this.worker.postMessage({ type: "RESET" });
    }
  };

  // src/utils/qr-svg.ts
  var GF_EXP = new Uint8Array(512);
  var GF_LOG = new Uint8Array(256);
  (function initGF() {
    let x = 1;
    for (let i = 0; i < 255; i++) {
      GF_EXP[i] = x;
      GF_LOG[x] = i;
      x <<= 1;
      if (x & 256) x ^= 285;
      x &= 255;
    }
    for (let i = 255; i < 512; i++) GF_EXP[i] = GF_EXP[i - 255];
  })();
  function gfMul(a, b) {
    if (a === 0 || b === 0) return 0;
    return GF_EXP[GF_LOG[a] + GF_LOG[b]];
  }
  function gfPolyMul(p, q) {
    const r = new Array(p.length + q.length - 1).fill(0);
    for (let i = 0; i < p.length; i++)
      for (let j = 0; j < q.length; j++)
        r[i + j] ^= gfMul(p[i], q[j]);
    return r;
  }
  function rsGenerator(n) {
    let g = [1];
    for (let i = 0; i < n; i++)
      g = gfPolyMul(g, [1, GF_EXP[i]]);
    return g;
  }
  function rsEncode(data, ecCount) {
    const gen = rsGenerator(ecCount);
    const msg = new Uint8Array(data.length + ecCount);
    msg.set(data);
    for (let i = 0; i < data.length; i++) {
      const c = msg[i];
      if (c !== 0)
        for (let j = 0; j < gen.length; j++)
          msg[i + j] ^= gfMul(gen[j], c);
    }
    return msg.slice(data.length);
  }
  var EC_M = {
    1: { total: 16, ecPerBlock: 10, blocks: [[1, 16]] },
    2: { total: 28, ecPerBlock: 16, blocks: [[1, 28]] },
    3: { total: 44, ecPerBlock: 26, blocks: [[1, 44]] },
    4: { total: 64, ecPerBlock: 18, blocks: [[2, 32]] },
    5: { total: 86, ecPerBlock: 24, blocks: [[2, 43]] },
    6: { total: 108, ecPerBlock: 16, blocks: [[4, 27]] },
    7: { total: 124, ecPerBlock: 18, blocks: [[4, 31]] },
    8: { total: 154, ecPerBlock: 22, blocks: [[2, 38], [2, 39]] },
    9: { total: 182, ecPerBlock: 22, blocks: [[3, 36], [2, 37]] },
    10: { total: 216, ecPerBlock: 26, blocks: [[4, 43], [1, 44]] }
  };
  var BYTE_CAPACITY = {
    1: 14,
    2: 26,
    3: 42,
    4: 62,
    5: 84,
    6: 106,
    7: 122,
    8: 152,
    9: 180,
    10: 213
  };
  var ALIGN_POS = {
    1: [],
    2: [6, 18],
    3: [6, 22],
    4: [6, 26],
    5: [6, 30],
    6: [6, 34],
    7: [6, 22, 38],
    8: [6, 24, 42],
    9: [6, 26, 46],
    10: [6, 28, 50]
  };
  var FORMAT_STRINGS = [
    21522,
    20773,
    24188,
    23371,
    17913,
    16590,
    20375,
    19104
  ];
  var BitBuffer = class {
    constructor() {
      this.buf = [];
      this.len = 0;
    }
    put(val, bits) {
      for (let i = bits - 1; i >= 0; i--) {
        this.buf.push(val >> i & 1);
        this.len++;
      }
    }
    get length() {
      return this.len;
    }
    getBit(i) {
      return this.buf[i];
    }
    toBytes() {
      const bytes = new Uint8Array(Math.ceil(this.len / 8));
      for (let i = 0; i < this.len; i++) {
        if (this.buf[i]) bytes[i >> 3] |= 128 >> (i & 7);
      }
      return bytes;
    }
  };
  function makeMatrix(size) {
    return Array.from({ length: size }, () => new Uint8Array(size));
  }
  function setModule(m, r, c, v) {
    if (r >= 0 && r < m.length && c >= 0 && c < m.length) m[r][c] = v;
  }
  function placeFinder(m, row, col) {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const pr = row + r, pc = col + c;
        if (pr < 0 || pr >= m.length || pc < 0 || pc >= m.length) continue;
        const inOuter = r >= 0 && r <= 6 && c >= 0 && c <= 6;
        const ring = r === 0 || r === 6 || c === 0 || c === 6;
        const inner = r >= 2 && r <= 4 && c >= 2 && c <= 4;
        m[pr][pc] = inOuter ? ring || inner ? 1 : 0 : 0;
      }
    }
  }
  function placeAlignment(m, r, c) {
    for (let dr = -2; dr <= 2; dr++) {
      for (let dc = -2; dc <= 2; dc++) {
        const ring = Math.abs(dr) === 2 || Math.abs(dc) === 2;
        const center = dr === 0 && dc === 0;
        m[r + dr][c + dc] = ring || center ? 1 : 0;
      }
    }
  }
  function reserveFormat(m, size) {
    for (let i = 0; i <= 8; i++) {
      setModule(m, 8, i, 2);
      setModule(m, i, 8, 2);
    }
    setModule(m, 8, 8, 2);
    for (let i = 0; i < 8; i++) {
      setModule(m, size - 1 - i, 8, 2);
      setModule(m, 8, size - 1 - i, 2);
    }
    m[size - 8][8] = 1;
  }
  function writeFormat(m, size, maskId) {
    const fmt = FORMAT_STRINGS[maskId];
    const bits = [];
    for (let i = 14; i >= 0; i--) bits.push(fmt >> i & 1);
    let bi = 0;
    for (let i = 0; i <= 5; i++) m[8][i] = bits[bi++];
    m[8][7] = bits[bi++];
    m[8][8] = bits[bi++];
    m[7][8] = bits[bi++];
    for (let i = 5; i >= 0; i--) m[i][8] = bits[bi++];
    bi = 0;
    for (let i = 0; i < 8; i++) m[size - 1 - i][8] = bits[bi++];
    for (let i = 0; i < 7; i++) m[8][size - 7 + i] = bits[bi++];
  }
  function buildStructural(version) {
    const size = version * 4 + 17;
    const m = makeMatrix(size);
    const fm = makeMatrix(size);
    placeFinder(m, 0, 0);
    placeFinder(m, 0, size - 7);
    placeFinder(m, size - 7, 0);
    for (let r = 0; r <= 8; r++) for (let c = 0; c <= 8; c++) fm[r][c] = 1;
    for (let r = 0; r <= 8; r++) for (let c = size - 8; c < size; c++) fm[r][c] = 1;
    for (let r = size - 8; r < size; r++) for (let c = 0; c <= 8; c++) fm[r][c] = 1;
    for (let i = 8; i < size - 8; i++) {
      const v = i % 2 === 0 ? 1 : 0;
      m[6][i] = v;
      fm[6][i] = 1;
      m[i][6] = v;
      fm[i][6] = 1;
    }
    const ap = ALIGN_POS[version] ?? [];
    for (const r of ap) {
      for (const c of ap) {
        if (fm[r][c]) continue;
        placeAlignment(m, r, c);
        for (let dr = -2; dr <= 2; dr++)
          for (let dc = -2; dc <= 2; dc++)
            fm[r + dr][c + dc] = 1;
      }
    }
    reserveFormat(m, size);
    for (let i = 0; i <= 8; i++) {
      fm[8][i] = 1;
      fm[i][8] = 1;
    }
    for (let i = 0; i < 8; i++) {
      fm[size - 1 - i][8] = 1;
      fm[8][size - 1 - i] = 1;
    }
    fm[size - 8][8] = 1;
    return [m, fm];
  }
  function embedData(m, fm, bits) {
    const size = m.length;
    let idx = 0;
    let up = true;
    for (let right = size - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5;
      for (let cnt = 0; cnt < size; cnt++) {
        const row = up ? size - 1 - cnt : cnt;
        for (let dc = 0; dc < 2; dc++) {
          const col = right - dc;
          if (!fm[row][col]) {
            m[row][col] = idx < bits.length ? bits[idx++] : 0;
          }
        }
      }
      up = !up;
    }
  }
  function applyMask(m, fm, maskId) {
    const size = m.length;
    const masked = makeMatrix(size);
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        masked[r][c] = m[r][c];
        if (!fm[r][c]) {
          let flip = false;
          switch (maskId) {
            case 0:
              flip = (r + c) % 2 === 0;
              break;
            case 1:
              flip = r % 2 === 0;
              break;
            case 2:
              flip = c % 3 === 0;
              break;
            case 3:
              flip = (r + c) % 3 === 0;
              break;
            case 4:
              flip = (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0;
              break;
            case 5:
              flip = r * c % 2 + r * c % 3 === 0;
              break;
            case 6:
              flip = (r * c % 2 + r * c % 3) % 2 === 0;
              break;
            case 7:
              flip = ((r + c) % 2 + r * c % 3) % 2 === 0;
              break;
          }
          if (flip) masked[r][c] ^= 1;
        }
      }
    }
    return masked;
  }
  function penaltyScore(m) {
    const size = m.length;
    let score = 0;
    for (let r = 0; r < size; r++) {
      for (let isRow of [true, false]) {
        let run = 1;
        for (let i = 1; i < size; i++) {
          const cur = isRow ? m[r][i] : m[i][r];
          const prev = isRow ? m[r][i - 1] : m[i - 1][r];
          if (cur === prev) {
            run++;
            if (run === 5) score += 3;
            else if (run > 5) score++;
          } else run = 1;
        }
      }
    }
    for (let r = 0; r < size - 1; r++)
      for (let c = 0; c < size - 1; c++)
        if (m[r][c] === m[r][c + 1] && m[r][c] === m[r + 1][c] && m[r][c] === m[r + 1][c + 1])
          score += 3;
    const pat1 = [1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 0];
    const pat2 = [0, 0, 0, 0, 1, 0, 1, 1, 1, 0, 1];
    for (let r = 0; r < size; r++) {
      for (let c = 0; c <= size - 11; c++) {
        let m1 = true, m2 = true;
        for (let k2 = 0; k2 < 11; k2++) {
          if (m[r][c + k2] !== pat1[k2]) m1 = false;
          if (m[r][c + k2] !== pat2[k2]) m2 = false;
        }
        if (m1 || m2) score += 40;
      }
    }
    for (let c = 0; c < size; c++) {
      for (let r = 0; r <= size - 11; r++) {
        let m1 = true, m2 = true;
        for (let k2 = 0; k2 < 11; k2++) {
          if (m[r + k2][c] !== pat1[k2]) m1 = false;
          if (m[r + k2][c] !== pat2[k2]) m2 = false;
        }
        if (m1 || m2) score += 40;
      }
    }
    let dark = 0;
    for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) dark += m[r][c];
    const pct = dark / (size * size) * 100;
    const k = Math.floor(Math.abs(pct - 50) / 5);
    score += k * 10;
    return score;
  }
  function toUtf8(text) {
    const out = [];
    for (let i = 0; i < text.length; ) {
      const cp = text.codePointAt(i);
      if (cp < 128) {
        out.push(cp);
        i += 1;
      } else if (cp < 2048) {
        out.push(192 | cp >> 6, 128 | cp & 63);
        i += 1;
      } else if (cp < 65536) {
        out.push(224 | cp >> 12, 128 | cp >> 6 & 63, 128 | cp & 63);
        i += 1;
      } else {
        out.push(240 | cp >> 18, 128 | cp >> 12 & 63, 128 | cp >> 6 & 63, 128 | cp & 63);
        i += 2;
      }
    }
    return new Uint8Array(out);
  }
  function buildCodewords(version, data) {
    const info = EC_M[version];
    if (!info) throw new Error(`Unsupported version ${version}`);
    const bb = new BitBuffer();
    bb.put(4, 4);
    bb.put(data.length, 8);
    for (const byte of data) bb.put(byte, 8);
    bb.put(0, 4);
    while (bb.length % 8 !== 0) bb.put(0, 1);
    const padBytes = [236, 17];
    let pi = 0;
    const totalBits = info.total * 8;
    while (bb.length < totalBits) {
      bb.put(padBytes[pi & 1], 8);
      pi++;
    }
    const msgBytes = bb.toBytes();
    const dataBlocks = [];
    const ecBlocks = [];
    let offset = 0;
    for (const [count, blockLen] of info.blocks) {
      for (let b = 0; b < count; b++) {
        const block = msgBytes.slice(offset, offset + blockLen);
        dataBlocks.push(block);
        ecBlocks.push(rsEncode(block, info.ecPerBlock));
        offset += blockLen;
      }
    }
    const result = [];
    const maxDataLen = Math.max(...dataBlocks.map((b) => b.length));
    for (let i = 0; i < maxDataLen; i++)
      for (const block of dataBlocks)
        if (i < block.length) result.push(block[i]);
    for (let i = 0; i < info.ecPerBlock; i++)
      for (const ec of ecBlocks)
        result.push(ec[i]);
    return result;
  }
  function generateQRSvg(url, size, quiet = 4) {
    const utf8 = toUtf8(url);
    let version = 1;
    while (version <= 10 && BYTE_CAPACITY[version] < utf8.length) version++;
    if (version > 10) throw new Error("Input too long for version 1-10 QR code");
    const codewords = buildCodewords(version, utf8);
    const bits = [];
    for (const cw of codewords) for (let i = 7; i >= 0; i--) bits.push(cw >> i & 1);
    const remBits = [0, 7, 7, 7, 7, 7, 0, 0, 0, 0, 0];
    for (let i = 0; i < (remBits[version] ?? 0); i++) bits.push(0);
    const [baseM, fm] = buildStructural(version);
    embedData(baseM, fm, bits);
    let bestMask = 0;
    let bestScore = Infinity;
    for (let mask = 0; mask < 8; mask++) {
      const candidate = applyMask(baseM, fm, mask);
      writeFormat(candidate, candidate.length, mask);
      const s = penaltyScore(candidate);
      if (s < bestScore) {
        bestScore = s;
        bestMask = mask;
      }
    }
    const finalM = applyMask(baseM, fm, bestMask);
    writeFormat(finalM, finalM.length, bestMask);
    const qSize = finalM.length;
    const totalModules = qSize + quiet * 2;
    const moduleSize = size / totalModules;
    const rects = [];
    for (let r = 0; r < qSize; r++) {
      for (let c = 0; c < qSize; c++) {
        if (finalM[r][c] === 1) {
          const x = ((c + quiet) * moduleSize).toFixed(2);
          const y = ((r + quiet) * moduleSize).toFixed(2);
          const w = (moduleSize + 0.5).toFixed(2);
          rects.push(`<rect x="${x}" y="${y}" width="${w}" height="${w}"/>`);
        }
      }
    }
    return [
      `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">`,
      `<rect width="${size}" height="${size}" fill="white"/>`,
      `<g fill="black">`,
      ...rects,
      `</g>`,
      `</svg>`
    ].join("");
  }

  // src/components/console.ts
  function injectStyles() {
    if (document.getElementById("gt-console-style")) return;
    const style = document.createElement("style");
    style.id = "gt-console-style";
    style.textContent = `
    /* \u2500\u2500 On-screen controls \u2500\u2500 */
    .gt-controls {
      position: fixed;
      bottom: 28px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 1000;
      display: flex;
      gap: 20px;
      align-items: center;
      user-select: none;
      transition: opacity 0.4s ease;
    }
    .gt-controls.hidden {
      opacity: 0;
      pointer-events: none;
    }
    .gt-ctrl-btn {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      border: 1.5px solid rgba(255,255,255,0.12);
      background: transparent;
      color: rgba(255,255,255,0.45);
      font-size: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: background 0.2s, color 0.2s, border-color 0.2s;
      padding: 0;
      line-height: 1;
    }
    .gt-ctrl-btn:hover {
      background: rgba(255,255,255,0.04);
      color: rgba(255,255,255,0.80);
      border-color: rgba(255,255,255,0.25);
    }
    .gt-ctrl-btn:active {
      background: rgba(255,255,255,0.14);
    }
    .gt-ctrl-btn svg {
      width: 18px;
      height: 18px;
      fill: currentColor;
    }

    /* \u2500\u2500 Side Drawer (Glassmorphism) \u2500\u2500 */
    .gt-drawer-overlay {
      position: fixed;
      inset: 0;
      z-index: 600;
      background: rgba(0,0,0,0.35);
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.3s ease;
    }
    .gt-drawer-overlay.open {
      opacity: 1;
      pointer-events: auto;
    }
    .gt-drawer {
      position: fixed;
      top: 0;
      right: 0;
      bottom: 0;
      width: 300px;
      max-width: 82vw;
      z-index: 601;
      background: rgba(8,8,12,0.72);
      border-left: 1px solid rgba(255,255,255,0.05);
      backdrop-filter: blur(32px) saturate(1.4);
      -webkit-backdrop-filter: blur(32px) saturate(1.4);
      transform: translateX(100%);
      transition: transform 0.35s cubic-bezier(0.4,0,0.2,1);
      display: flex;
      flex-direction: column;
      font-family: 'JetBrains Mono', 'SF Mono', 'Menlo', monospace;
      overflow-y: auto;
      scrollbar-width: thin;
      scrollbar-color: rgba(255,255,255,0.06) transparent;
    }
    .gt-drawer.open {
      transform: translateX(0);
    }
    .gt-drawer-content {
      padding: 40px 28px 32px;
      display: flex;
      flex-direction: column;
      gap: 36px;
    }

    /* \u2500\u2500 Section headings \u2500\u2500 */
    .gt-section-title {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 4px;
      text-transform: uppercase;
      color: rgba(255,255,255,0.25);
      margin-bottom: 20px;
      padding-bottom: 8px;
      border-bottom: 1px solid rgba(255,255,255,0.04);
    }
    .gt-section {
      display: flex;
      flex-direction: column;
    }

    /* \u2500\u2500 Field rows \u2500\u2500 */
    .gt-field-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      min-height: 36px;
      margin-bottom: 4px;
    }
    .gt-field-label {
      font-size: 11px;
      font-weight: 400;
      color: rgba(255,255,255,0.40);
      flex-shrink: 0;
      letter-spacing: 0.5px;
    }
    .gt-field-select {
      flex: 1;
      max-width: 150px;
      padding: 6px 10px;
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.06);
      border-radius: 6px;
      color: rgba(255,255,255,0.60);
      font-family: inherit;
      font-size: 11px;
      outline: none;
      cursor: pointer;
      transition: border-color 0.15s;
    }
    .gt-field-select:focus {
      border-color: rgba(255,255,255,0.15);
    }
    .gt-field-select option {
      background: #0c0c0e;
      color: #bbb;
    }

    /* \u2500\u2500 Theme strip \u2500\u2500 */
    .gt-theme-strip {
      display: flex;
      gap: 0;
      margin-bottom: 4px;
      border-radius: 8px;
      overflow: hidden;
      border: 1px solid rgba(255,255,255,0.05);
    }
    .gt-theme-chip {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 5px;
      padding: 10px 0;
      font-size: 8.5px;
      font-weight: 500;
      letter-spacing: 0.8px;
      text-transform: uppercase;
      font-family: inherit;
      color: rgba(255,255,255,0.30);
      background: rgba(255,255,255,0.02);
      border: none;
      border-right: 1px solid rgba(255,255,255,0.04);
      cursor: pointer;
      transition: all 0.25s;
    }
    .gt-theme-chip:last-child {
      border-right: none;
    }
    .gt-theme-chip .gt-led {
      width: 4px;
      height: 4px;
      border-radius: 50%;
      flex-shrink: 0;
      opacity: 0.45;
      transition: opacity 0.25s, box-shadow 0.25s;
    }
    .gt-theme-chip:hover {
      background: rgba(255,255,255,0.05);
      color: rgba(255,255,255,0.55);
    }
    .gt-theme-chip:hover .gt-led {
      opacity: 0.7;
    }
    .gt-theme-chip.active {
      color: rgba(255,255,255,0.85);
      background: color-mix(in srgb, var(--tc) 6%, transparent);
      box-shadow: inset 0 0 12px color-mix(in srgb, var(--tc) 8%, transparent);
    }
    .gt-theme-chip.active .gt-led {
      opacity: 1;
      box-shadow: 0 0 4px var(--tc), 0 0 8px color-mix(in srgb, var(--tc) 50%, transparent);
    }

    /* \u2500\u2500 Sliders \u2500\u2500 */
    .gt-slider-row {
      display: flex;
      align-items: center;
      gap: 10px;
      min-height: 32px;
      margin-bottom: 4px;
    }
    .gt-slider-label {
      font-size: 10px;
      font-weight: 400;
      color: rgba(255,255,255,0.30);
      width: 52px;
      flex-shrink: 0;
      text-align: right;
      letter-spacing: 0.3px;
    }
    .gt-slider-input {
      -webkit-appearance: none;
      appearance: none;
      flex: 1;
      height: 2px;
      background: rgba(255,255,255,0.08);
      border-radius: 1px;
      outline: none;
      cursor: pointer;
    }
    .gt-slider-input::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: rgba(255,255,255,0.40);
      cursor: pointer;
      transition: background 0.15s;
    }
    .gt-slider-input::-webkit-slider-thumb:hover {
      background: rgba(255,255,255,0.65);
    }
    .gt-slider-input::-moz-range-thumb {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: rgba(255,255,255,0.40);
      cursor: pointer;
      border: none;
    }
    .gt-slider-val {
      font-size: 10px;
      font-weight: 400;
      color: rgba(255,255,255,0.22);
      width: 38px;
      text-align: left;
      letter-spacing: 0.3px;
    }

    /* \u2500\u2500 Duration control \u2500\u2500 */
    .gt-dur-row {
      display: flex;
      align-items: center;
      gap: 8px;
      min-height: 36px;
      margin-bottom: 4px;
    }
    .gt-dur-btn {
      width: 30px;
      height: 30px;
      border-radius: 50%;
      border: 1px solid rgba(255,255,255,0.08);
      background: transparent;
      color: rgba(255,255,255,0.35);
      font-size: 16px;
      font-family: inherit;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      user-select: none;
      flex-shrink: 0;
      transition: all 0.15s;
    }
    .gt-dur-btn:hover {
      background: rgba(255,255,255,0.05);
      color: rgba(255,255,255,0.70);
      border-color: rgba(255,255,255,0.15);
    }
    .gt-dur-btn:active {
      background: rgba(255,255,255,0.10);
    }
    .gt-dur-display {
      width: 56px;
      padding: 0;
      background: transparent;
      border: none;
      color: rgba(255,255,255,0.70);
      font-family: inherit;
      font-size: 14px;
      font-weight: 500;
      letter-spacing: 1.5px;
      outline: none;
      text-align: center;
      flex-shrink: 0;
      caret-color: rgba(255,255,255,0.40);
    }
    .gt-dur-display:focus {
      color: rgba(255,255,255,0.90);
    }

    /* \u2500\u2500 System buttons \u2500\u2500 */
    .gt-sys-btn {
      width: 100%;
      padding: 10px 0;
      background: rgba(255,255,255,0.02);
      border: 1px solid rgba(255,255,255,0.05);
      border-radius: 8px;
      color: rgba(255,255,255,0.35);
      font-family: inherit;
      font-size: 10px;
      font-weight: 500;
      letter-spacing: 1px;
      text-transform: uppercase;
      cursor: pointer;
      transition: all 0.15s;
      margin-bottom: 8px;
    }
    .gt-sys-btn:hover {
      background: rgba(255,255,255,0.05);
      color: rgba(255,255,255,0.60);
      border-color: rgba(255,255,255,0.10);
    }
    .gt-sys-btn:active {
      background: rgba(255,255,255,0.08);
    }

    /* \u2500\u2500 Fixed credits \u2500\u2500 */
    .gt-credits {
      position: fixed;
      bottom: 8px;
      left: 50%;
      transform: translateX(-50%);
      font-size: 9px;
      color: rgba(255,255,255,0.12);
      letter-spacing: 1.5px;
      z-index: 1;
      pointer-events: none;
      font-family: 'JetBrains Mono', 'SF Mono', monospace;
    }
  `;
    document.head.appendChild(style);
  }
  function fmtMmSs(sec) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  function parseMmSs(str) {
    const parts = str.split(":");
    if (parts.length === 2) {
      const m = parseInt(parts[0], 10);
      const s = parseInt(parts[1], 10);
      if (Number.isFinite(m) && Number.isFinite(s)) return m * 60 + s;
    }
    const v = parseInt(str, 10);
    return Number.isFinite(v) ? v : null;
  }
  function createConsole(initialMode, initialTheme = "Nixie", initialDurationSec = 3600, initialCs = true, initialAppMode = "timer", initialFriction = 1) {
    injectStyles();
    let isPaused = false;
    let currentDuration = Math.min(initialDurationSec, 3600);
    const creditsEl = document.createElement("div");
    creditsEl.className = "gt-credits";
    creditsEl.textContent = "Crafted by Tipsy Tap Studio";
    document.body.appendChild(creditsEl);
    const controls = document.createElement("div");
    controls.className = "gt-controls";
    function makeBtn(svg, title) {
      const btn = document.createElement("button");
      btn.className = "gt-ctrl-btn";
      btn.innerHTML = svg;
      btn.title = title;
      return btn;
    }
    const startBtn = makeBtn(
      '<svg viewBox="0 0 24 24"><polygon points="6,4 20,12 6,20"/></svg>',
      "Start"
    );
    const pauseBtn = makeBtn(
      '<svg viewBox="0 0 24 24"><rect x="5" y="4" width="4" height="16"/><rect x="15" y="4" width="4" height="16"/></svg>',
      "Pause"
    );
    const stopBtn = makeBtn(
      '<svg viewBox="0 0 24 24"><rect x="5" y="5" width="14" height="14" rx="2"/></svg>',
      "Stop"
    );
    const settingsBtn = makeBtn(
      '<svg viewBox="0 0 24 24"><path d="M12 15.5A3.5 3.5 0 1 0 12 8.5a3.5 3.5 0 0 0 0 7z" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>',
      "Settings"
    );
    startBtn.addEventListener("click", () => ctrl.onStart?.());
    pauseBtn.addEventListener("click", () => ctrl.onPause?.());
    stopBtn.addEventListener("click", () => ctrl.onStop?.());
    settingsBtn.addEventListener("click", () => toggleDrawer());
    controls.appendChild(startBtn);
    controls.appendChild(pauseBtn);
    controls.appendChild(stopBtn);
    controls.appendChild(settingsBtn);
    document.body.appendChild(controls);
    const overlay = document.createElement("div");
    overlay.className = "gt-drawer-overlay";
    overlay.addEventListener("click", () => closeDrawer());
    const drawer = document.createElement("div");
    drawer.className = "gt-drawer";
    const drawerContent = document.createElement("div");
    drawerContent.className = "gt-drawer-content";
    const timerSection = document.createElement("div");
    timerSection.className = "gt-section";
    timerSection.innerHTML = '<div class="gt-section-title">Timer</div>';
    const appRow = document.createElement("div");
    appRow.className = "gt-field-row";
    appRow.innerHTML = '<span class="gt-field-label">App</span>';
    const appSelect = document.createElement("select");
    appSelect.className = "gt-field-select";
    for (const [val, label] of [["timer", "Timer"], ["clock", "Clock"]]) {
      const opt = document.createElement("option");
      opt.value = val;
      opt.textContent = label;
      if (val === initialAppMode) opt.selected = true;
      appSelect.appendChild(opt);
    }
    appSelect.addEventListener("change", () => {
      ctrl.onAppModeChange?.(appSelect.value);
      updateClockModeVisibility();
    });
    appRow.appendChild(appSelect);
    timerSection.appendChild(appRow);
    const durLabel = document.createElement("div");
    durLabel.className = "gt-field-row";
    durLabel.innerHTML = '<span class="gt-field-label">Duration</span>';
    durLabel.style.marginBottom = "0";
    const durRow = document.createElement("div");
    durRow.className = "gt-dur-row";
    const durMinusBtn = document.createElement("button");
    durMinusBtn.className = "gt-dur-btn";
    durMinusBtn.textContent = "\u2212";
    const durSlider = document.createElement("input");
    durSlider.type = "range";
    durSlider.className = "gt-slider-input";
    durSlider.min = "1";
    durSlider.max = "3600";
    durSlider.step = "1";
    durSlider.value = String(currentDuration);
    durSlider.style.flex = "1";
    const durDisplay = document.createElement("input");
    durDisplay.className = "gt-dur-display";
    durDisplay.type = "text";
    durDisplay.value = fmtMmSs(currentDuration);
    const durPlusBtn = document.createElement("button");
    durPlusBtn.className = "gt-dur-btn";
    durPlusBtn.textContent = "+";
    function setDuration(sec) {
      sec = Math.max(1, Math.min(3600, sec));
      currentDuration = sec;
      durSlider.value = String(sec);
      durDisplay.value = fmtMmSs(sec);
      ctrl.onDurationChange?.(sec);
    }
    durSlider.addEventListener("input", () => {
      const v = parseInt(durSlider.value, 10);
      currentDuration = v;
      durDisplay.value = fmtMmSs(v);
      ctrl.onDurationChange?.(v);
    });
    durDisplay.addEventListener("change", () => {
      const parsed = parseMmSs(durDisplay.value);
      if (parsed !== null) {
        setDuration(parsed);
      } else {
        durDisplay.value = fmtMmSs(currentDuration);
      }
    });
    let holdInterval = null;
    function startHold(delta) {
      setDuration(currentDuration + delta);
      holdInterval = setInterval(() => setDuration(currentDuration + delta), 80);
    }
    function stopHold() {
      if (holdInterval !== null) {
        clearInterval(holdInterval);
        holdInterval = null;
      }
    }
    durMinusBtn.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      startHold(-1);
    });
    durMinusBtn.addEventListener("pointerup", stopHold);
    durMinusBtn.addEventListener("pointerleave", stopHold);
    durPlusBtn.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      startHold(1);
    });
    durPlusBtn.addEventListener("pointerup", stopHold);
    durPlusBtn.addEventListener("pointerleave", stopHold);
    durRow.appendChild(durMinusBtn);
    durRow.appendChild(durSlider);
    durRow.appendChild(durDisplay);
    durRow.appendChild(durPlusBtn);
    timerSection.appendChild(durLabel);
    timerSection.appendChild(durRow);
    const csRow = document.createElement("div");
    csRow.className = "gt-field-row";
    csRow.innerHTML = '<span class="gt-field-label">Centiseconds</span>';
    const csSelect = document.createElement("select");
    csSelect.className = "gt-field-select";
    csSelect.innerHTML = '<option value="on">ON</option><option value="off">OFF</option>';
    csSelect.value = initialCs ? "on" : "off";
    csSelect.addEventListener("change", () => {
      ctrl.onCentisecondsToggle?.(csSelect.value === "on");
    });
    csRow.appendChild(csSelect);
    timerSection.appendChild(csRow);
    const physModeRow = document.createElement("div");
    physModeRow.className = "gt-field-row";
    physModeRow.innerHTML = '<span class="gt-field-label">Preset</span>';
    const physModeSelect = document.createElement("select");
    physModeSelect.className = "gt-field-select";
    for (const name of Object.keys(PRESETS)) {
      const opt = document.createElement("option");
      opt.value = name.toLowerCase();
      opt.textContent = name;
      if (name.toLowerCase() === initialMode.toLowerCase()) opt.selected = true;
      physModeSelect.appendChild(opt);
    }
    physModeSelect.addEventListener("change", () => {
      ctrl.onModeChange?.(physModeSelect.value);
      updateBaseFromPreset();
      syncPhysicsSliders();
    });
    physModeRow.appendChild(physModeSelect);
    timerSection.appendChild(physModeRow);
    function updateClockModeVisibility() {
      const isClock = appSelect.value === "clock";
      durLabel.style.display = isClock ? "none" : "";
      durRow.style.display = isClock ? "none" : "";
      csRow.style.display = isClock ? "none" : "";
    }
    updateClockModeVisibility();
    drawerContent.appendChild(timerSection);
    const themeSection = document.createElement("div");
    themeSection.className = "gt-section";
    themeSection.innerHTML = '<div class="gt-section-title">Theme</div>';
    const themeStrip = document.createElement("div");
    themeStrip.className = "gt-theme-strip";
    const themeChips = [];
    const LED_COLORS = {
      nixie: "#FF8C00",
      system: "#00FF41",
      studio: "#FFFFFF",
      cyber: "#00D1FF"
    };
    for (const t of CLOCK_THEMES) {
      const chip = document.createElement("button");
      chip.className = "gt-theme-chip";
      const tc = LED_COLORS[t.name.toLowerCase()] || "#fff";
      chip.style.setProperty("--tc", tc);
      if (t.name.toLowerCase() === initialTheme.toLowerCase()) chip.classList.add("active");
      const led = document.createElement("span");
      led.className = "gt-led";
      led.style.background = tc;
      chip.appendChild(led);
      const label = document.createElement("span");
      label.textContent = t.name;
      chip.appendChild(label);
      chip.addEventListener("click", () => {
        themeChips.forEach((c) => c.classList.remove("active"));
        chip.classList.add("active");
        ctrl.onThemeChange?.(t.name);
      });
      themeStrip.appendChild(chip);
      themeChips.push(chip);
    }
    themeSection.appendChild(themeStrip);
    drawerContent.appendChild(themeSection);
    const physSection = document.createElement("div");
    physSection.className = "gt-section";
    physSection.innerHTML = '<div class="gt-section-title">Physics</div>';
    let baseDragX = PHYSICS.dragX;
    let baseDragY = PHYSICS.dragY;
    let baseDragXSettle = PHYSICS.dragXSettle;
    let baseDragYSettle = PHYSICS.dragYSettle;
    let currentFriction = initialFriction;
    function updateBaseFromPreset() {
      baseDragX = PHYSICS.dragX;
      baseDragY = PHYSICS.dragY;
      baseDragXSettle = PHYSICS.dragXSettle;
      baseDragYSettle = PHYSICS.dragYSettle;
    }
    function applyFriction(f) {
      currentFriction = f;
      PHYSICS.dragX = baseDragX * f;
      PHYSICS.dragY = baseDragY * f;
      PHYSICS.dragXSettle = baseDragXSettle * f;
      PHYSICS.dragYSettle = baseDragYSettle * f;
    }
    if (initialFriction !== 1) {
      applyFriction(initialFriction);
    }
    const gravRow = document.createElement("div");
    gravRow.className = "gt-slider-row";
    const gravLabel = document.createElement("span");
    gravLabel.className = "gt-slider-label";
    gravLabel.textContent = "Gravity";
    const gravInput = document.createElement("input");
    gravInput.type = "range";
    gravInput.className = "gt-slider-input";
    gravInput.min = "50";
    gravInput.max = "3000";
    gravInput.step = "10";
    gravInput.value = String(PHYSICS.gravity);
    const gravVal = document.createElement("span");
    gravVal.className = "gt-slider-val";
    gravVal.textContent = String(Math.round(PHYSICS.gravity));
    gravInput.addEventListener("input", () => {
      const v = parseFloat(gravInput.value);
      PHYSICS.gravity = v;
      gravVal.textContent = String(Math.round(v));
      ctrl.onGravityChange?.(v);
    });
    gravRow.appendChild(gravLabel);
    gravRow.appendChild(gravInput);
    gravRow.appendChild(gravVal);
    physSection.appendChild(gravRow);
    const bounceRow = document.createElement("div");
    bounceRow.className = "gt-slider-row";
    const bounceLabel = document.createElement("span");
    bounceLabel.className = "gt-slider-label";
    bounceLabel.textContent = "Bounce";
    const bounceInput = document.createElement("input");
    bounceInput.type = "range";
    bounceInput.className = "gt-slider-input";
    bounceInput.min = "0";
    bounceInput.max = "1.0";
    bounceInput.step = "0.01";
    bounceInput.value = String(PHYSICS.restitution);
    const bounceVal = document.createElement("span");
    bounceVal.className = "gt-slider-val";
    bounceVal.textContent = PHYSICS.restitution.toFixed(2);
    bounceInput.addEventListener("input", () => {
      const v = parseFloat(bounceInput.value);
      PHYSICS.restitution = v;
      bounceVal.textContent = v.toFixed(2);
      ctrl.onBouncinessChange?.(v);
    });
    bounceRow.appendChild(bounceLabel);
    bounceRow.appendChild(bounceInput);
    bounceRow.appendChild(bounceVal);
    physSection.appendChild(bounceRow);
    const fricRow = document.createElement("div");
    fricRow.className = "gt-slider-row";
    const fricLabel = document.createElement("span");
    fricLabel.className = "gt-slider-label";
    fricLabel.textContent = "Flow";
    const fricInput = document.createElement("input");
    fricInput.type = "range";
    fricInput.className = "gt-slider-input";
    fricInput.min = "0.5";
    fricInput.max = "3.0";
    fricInput.step = "0.05";
    fricInput.value = String(currentFriction);
    const fricVal = document.createElement("span");
    fricVal.className = "gt-slider-val";
    fricVal.textContent = `\xD7${currentFriction.toFixed(2)}`;
    fricInput.addEventListener("input", () => {
      const v = parseFloat(fricInput.value);
      applyFriction(v);
      fricVal.textContent = `\xD7${v.toFixed(2)}`;
      ctrl.onFrictionChange?.(v);
    });
    fricRow.appendChild(fricLabel);
    fricRow.appendChild(fricInput);
    fricRow.appendChild(fricVal);
    physSection.appendChild(fricRow);
    const physResetBtn = document.createElement("button");
    physResetBtn.className = "gt-sys-btn";
    physResetBtn.textContent = "Reset Physics";
    physResetBtn.style.marginTop = "12px";
    physResetBtn.addEventListener("click", () => {
      applyPreset(physModeSelect.value);
      updateBaseFromPreset();
      currentFriction = 1;
      applyFriction(1);
      syncPhysicsSliders();
    });
    physSection.appendChild(physResetBtn);
    function syncPhysicsSliders() {
      gravInput.value = String(PHYSICS.gravity);
      gravVal.textContent = String(Math.round(PHYSICS.gravity));
      bounceInput.value = String(PHYSICS.restitution);
      bounceVal.textContent = PHYSICS.restitution.toFixed(2);
      fricInput.value = String(currentFriction);
      fricVal.textContent = `\xD7${currentFriction.toFixed(2)}`;
    }
    drawerContent.appendChild(physSection);
    const _qrSvg = generateQRSvg("https://tipsytapstudio.github.io/galton-timer/", 140);
    const sysSection = document.createElement("div");
    sysSection.className = "gt-section";
    sysSection.innerHTML = `<div class="gt-section-title">System</div>`;
    const shareBtn = document.createElement("button");
    shareBtn.className = "gt-sys-btn";
    shareBtn.textContent = "Share URL";
    shareBtn.addEventListener("click", () => {
      ctrl.onShareURL?.();
      shareBtn.textContent = "Copied!";
      setTimeout(() => {
        shareBtn.textContent = "Share URL";
      }, 1500);
    });
    sysSection.appendChild(shareBtn);
    const resetBtn = document.createElement("button");
    resetBtn.className = "gt-sys-btn";
    resetBtn.textContent = "Reset to Default";
    resetBtn.addEventListener("click", () => ctrl.onResetDefaults?.());
    sysSection.appendChild(resetBtn);
    sysSection.insertAdjacentHTML(
      "beforeend",
      `<div style="margin-top:24px;padding-top:20px;border-top:1px solid #333;display:flex;flex-direction:column;align-items:center;gap:10px"><span style="font-size:9px;color:#888;letter-spacing:1px">Scan to open (Mobile)</span><div style="width:140px;height:140px;border-radius:4px;overflow:hidden">${_qrSvg}</div></div>`
    );
    drawerContent.appendChild(sysSection);
    drawer.appendChild(drawerContent);
    document.body.appendChild(overlay);
    document.body.appendChild(drawer);
    let drawerOpen = false;
    function toggleDrawer() {
      drawerOpen = !drawerOpen;
      drawer.classList.toggle("open", drawerOpen);
      overlay.classList.toggle("open", drawerOpen);
      if (drawerOpen) {
        syncPhysicsSliders();
      }
    }
    function closeDrawer() {
      drawerOpen = false;
      drawer.classList.remove("open");
      overlay.classList.remove("open");
    }
    const ctrl = {
      el: controls,
      show() {
        controls.classList.remove("hidden");
      },
      hide() {
        controls.classList.add("hidden");
        if (drawerOpen) closeDrawer();
      },
      setTime(_remainingMs) {
      },
      setStatus(_status) {
      },
      onModeChange: null,
      onPause: null,
      onStart: null,
      onStop: null,
      onThemeChange: null,
      onDurationChange: null,
      onCentisecondsToggle: null,
      onResetDefaults: null,
      onShareURL: null,
      onAppModeChange: null,
      onGravityChange: null,
      onBouncinessChange: null,
      onFrictionChange: null,
      setPaused(p) {
        isPaused = p;
        startBtn.style.display = p ? "" : "none";
        pauseBtn.style.display = p ? "none" : "";
      },
      setThemeName(name) {
        themeChips.forEach((c) => {
          c.classList.toggle("active", c.textContent?.toLowerCase() === name.toLowerCase());
        });
      },
      setAccentColor(rgb) {
        const [r, g, b] = rgb;
        const accentBorder = `rgba(${r},${g},${b},0.30)`;
        const accentColor = `rgba(${r},${g},${b},0.70)`;
        for (const btn of [startBtn, pauseBtn, stopBtn, settingsBtn]) {
          btn.style.borderColor = accentBorder;
          btn.style.color = accentColor;
        }
      },
      closeDrawer
    };
    startBtn.style.display = "none";
    return ctrl;
  }
  function applyPreset(modeName) {
    const key = Object.keys(PRESETS).find(
      (k) => k.toLowerCase() === modeName.toLowerCase()
    );
    if (!key) return;
    const preset = PRESETS[key];
    for (const k of Object.keys(preset)) {
      PHYSICS[k] = preset[k];
    }
  }

  // src/main.ts
  var params = readParams();
  var isClockMode = params.app === "clock";
  if (isClockMode) {
    params.n = 3600;
    params.t = 3600;
  } else if (params.timerMode === "seconds") {
    params.n = params.t;
  }
  writeParams(params);
  var rng = createPRNG(params.s);
  var sim = new Simulation({
    numRows: params.rows,
    totalParticles: params.n,
    totalTimeSec: params.t,
    rng
  });
  var container = document.getElementById("app");
  var renderer = new Renderer(container, params.rows, params.n, params.s);
  renderer.setThemeByName(params.theme);
  renderer.setClockEnabled(params.clock);
  renderer.setGlowIntensity(1);
  applyPreset(params.mode);
  var timerBridge = new TimerBridge();
  var workerRemainingMs = params.t * 1e3;
  var clockElapsedOffset = 0;
  timerBridge.onTick = (remainingMs, elapsedMs) => {
    workerRemainingMs = remainingMs;
    sim.setElapsedMs(elapsedMs + clockElapsedOffset);
    consoleCtrl.setTime(remainingMs);
  };
  timerBridge.onDone = () => {
    workerRemainingMs = 0;
    consoleCtrl.setTime(0);
    if (isClockMode) {
      startTheLoop();
    } else {
      renderer.startAlarm();
      consoleCtrl.setStatus("alarm");
    }
  };
  var consoleCtrl = createConsole(
    params.mode,
    params.theme,
    params.t,
    params.cs,
    params.app,
    params.friction
  );
  consoleCtrl.setAccentColor(getThemeByName(params.theme).segmentRGB);
  var hideTimeout = null;
  function showConsole() {
    consoleCtrl.show();
    if (hideTimeout !== null) clearTimeout(hideTimeout);
    hideTimeout = setTimeout(() => consoleCtrl.hide(), 5e3);
  }
  document.addEventListener("mousemove", showConsole);
  document.addEventListener("touchstart", showConsole);
  showConsole();
  consoleCtrl.onModeChange = (modeName) => {
    applyPreset(modeName);
    params.mode = modeName;
    writeParams(params);
  };
  consoleCtrl.onThemeChange = (themeName) => {
    renderer.setThemeByName(themeName);
    consoleCtrl.setThemeName(themeName);
    consoleCtrl.setAccentColor(getThemeByName(themeName).segmentRGB);
    params.theme = themeName.toLowerCase();
    writeParams(params);
  };
  consoleCtrl.onCentisecondsToggle = (enabled) => {
    params.cs = enabled;
    writeParams(params);
  };
  consoleCtrl.onDurationChange = (sec) => {
    params.t = sec;
    writeParams(params);
  };
  consoleCtrl.onAppModeChange = (mode) => {
    params.app = mode;
    writeParams(params);
    window.location.reload();
  };
  consoleCtrl.onGravityChange = (_value) => {
  };
  consoleCtrl.onFrictionChange = (value) => {
    params.friction = value;
    writeParams(params);
  };
  consoleCtrl.onPause = () => togglePause();
  consoleCtrl.onStart = () => {
    if (paused) togglePause();
    else if (appState === "idle" || sim.allSettled) startTheLoop();
  };
  consoleCtrl.onStop = () => startTheLoop();
  consoleCtrl.onShareURL = () => {
    writeParams(params);
    navigator.clipboard.writeText(window.location.href).catch(() => {
    });
  };
  consoleCtrl.onResetDefaults = () => {
    window.location.search = "";
  };
  var appState = "idle";
  var lastTime = null;
  var paused = false;
  var rafId = 0;
  var rainParticles = [];
  var refillElapsed = 0;
  function getCs() {
    if (isClockMode) return void 0;
    if (!params.cs) return void 0;
    return Math.floor(workerRemainingMs % 1e3 / 10);
  }
  function getWallClockSec() {
    if (!isClockMode) return void 0;
    const now = /* @__PURE__ */ new Date();
    return now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
  }
  function togglePause() {
    if (appState === "purging" || appState === "refilling") return;
    if (sim.allSettled) return;
    paused = !paused;
    consoleCtrl.setPaused(paused);
    if (paused) {
      appState = "paused";
      timerBridge.pause();
      cancelAnimationFrame(rafId);
      renderer.drawFrame(
        sim.activeParticles,
        workerRemainingMs / 1e3,
        sim.totalParticles,
        sim.emittedCount,
        true,
        sim.totalTimeMs,
        void 0,
        getCs(),
        getWallClockSec()
      );
    } else {
      appState = "running";
      timerBridge.resume();
      lastTime = null;
      rafId = requestAnimationFrame(frame);
    }
  }
  function startTheLoop() {
    timerBridge.reset();
    cancelAnimationFrame(rafId);
    renderer.stopAlarm();
    renderer.beginPurge();
    appState = "purging";
    consoleCtrl.setStatus("ending");
    lastTime = null;
    rafId = requestAnimationFrame(frame);
  }
  function beginRefill() {
    appState = "refilling";
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
        bounces: 0
      });
    }
  }
  function startFresh() {
    sim.reset();
    renderer.clearStatic();
    renderer.resize(params.rows);
    workerRemainingMs = params.t * 1e3;
    paused = false;
    appState = "running";
    consoleCtrl.setPaused(false);
    consoleCtrl.setStatus("ready");
    consoleCtrl.setTime(params.t * 1e3);
    setTimeout(() => {
      if (appState === "running") {
        consoleCtrl.setStatus("running");
      }
    }, 1e3);
    if (isClockMode) {
      const now = /* @__PURE__ */ new Date();
      const min = now.getMinutes();
      const sec = now.getSeconds();
      const ms = now.getMilliseconds();
      const elapsedInHourMs = (min * 60 + sec) * 1e3 + ms;
      const remainingMs = 36e5 - elapsedInHourMs;
      clockElapsedOffset = elapsedInHourMs;
      timerBridge.start(remainingMs);
      workerRemainingMs = remainingMs;
      sim.setElapsedMs(elapsedInHourMs);
      const geom = renderer.getGeom();
      const snapped = sim.instantSnap(geom);
      for (const p of snapped) {
        renderer.bakeParticle(p);
      }
    } else {
      clockElapsedOffset = 0;
      timerBridge.start(params.t * 1e3);
    }
    lastTime = null;
    rafId = requestAnimationFrame(frame);
  }
  function bakeSettledBatch(particles) {
    for (const p of particles) {
      renderer.bakeParticle(p);
    }
  }
  window.addEventListener("resize", () => {
    renderer.resize(params.rows);
    if (paused || sim.allSettled) {
      renderer.drawFrame(
        sim.activeParticles,
        workerRemainingMs / 1e3,
        sim.totalParticles,
        sim.emittedCount,
        paused,
        sim.totalTimeMs,
        void 0,
        getCs(),
        getWallClockSec()
      );
    }
  });
  document.addEventListener("keydown", (e) => {
    if (e.code === "Space") {
      e.preventDefault();
      togglePause();
    }
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      cancelAnimationFrame(rafId);
    } else {
      if (appState !== "running") {
        if (appState === "purging" || appState === "refilling") {
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
        workerRemainingMs / 1e3,
        sim.totalParticles,
        sim.emittedCount,
        false,
        sim.totalTimeMs,
        void 0,
        getCs(),
        getWallClockSec()
      );
      lastTime = null;
      rafId = requestAnimationFrame(frame);
    }
  });
  function frame(now) {
    if (appState === "paused" || appState === "idle") return;
    if (lastTime === null) lastTime = now;
    const dtMs = Math.min(now - lastTime, 100);
    const dtSec = dtMs / 1e3;
    lastTime = now;
    if (appState === "purging") {
      const done = renderer.purgeStacks(dtSec);
      renderer.drawFrame([], 0, sim.totalParticles, sim.totalParticles, false, sim.totalTimeMs);
      if (done) {
        beginRefill();
      }
      rafId = requestAnimationFrame(frame);
      return;
    }
    if (appState === "refilling") {
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
            const e = 0.15 + Math.random() * 0.3;
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
        if (p.x > maxX) {
          p.x = maxX;
          p.vx = -Math.abs(p.vx) * 0.3;
        }
        if (p.x < minX) {
          p.x = minX;
          p.vx = Math.abs(p.vx) * 0.3;
        }
      }
      rainParticles = rainParticles.filter((p) => p.alpha > 0.01);
      renderer.drawFrame([], params.t, sim.totalParticles, 0, false, sim.totalTimeMs, rainParticles);
      if (refillElapsed >= 800) {
        startFresh();
        return;
      }
      rafId = requestAnimationFrame(frame);
      return;
    }
    const geom = renderer.getGeom();
    const settled = sim.update(dtMs, geom, (x) => renderer.getGroundY(x));
    for (const p of settled) {
      renderer.bakeParticle(p);
    }
    renderer.drawFrame(
      sim.activeParticles,
      workerRemainingMs / 1e3,
      sim.totalParticles,
      sim.emittedCount,
      false,
      sim.totalTimeMs,
      void 0,
      getCs(),
      getWallClockSec()
    );
    if (!sim.allSettled) {
      rafId = requestAnimationFrame(frame);
    } else {
      consoleCtrl.setStatus("ending");
    }
  }
  startFresh();
})();
//# sourceMappingURL=bundle.js.map
