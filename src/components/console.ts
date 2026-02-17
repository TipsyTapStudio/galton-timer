/**
 * Control Console — Tipsy Tap Studio Pro Edition.
 *
 * Refined instrument panel: glassmorphism drawer, digital-gauge aesthetics,
 * generous breathing room. Minimal on-screen controls auto-hide after 5s.
 */

import { PRESETS, PHYSICS, PhysicsParams } from '../engine/simulation';
import { CLOCK_THEMES } from '../engine/seven-seg';
import type { AppMode } from '../utils/url-params';

// ── Types ──

export type SignalStatus = 'ready' | 'running' | 'ending' | 'idle' | 'alarm';

export interface ConsoleController {
  el: HTMLElement;
  show(): void;
  hide(): void;
  setTime(remainingMs: number): void;
  setStatus(status: SignalStatus): void;
  onModeChange: ((mode: string) => void) | null;
  onPause: (() => void) | null;
  onStart: (() => void) | null;
  onStop: (() => void) | null;
  onThemeChange: ((themeName: string) => void) | null;
  onDurationChange: ((sec: number) => void) | null;
  onParticlesChange: ((n: number) => void) | null;
  onRowsChange: ((rows: number) => void) | null;
  onCentisecondsToggle: ((enabled: boolean) => void) | null;
  onResetDefaults: (() => void) | null;
  onShareURL: (() => void) | null;
  onAppModeChange: ((mode: AppMode) => void) | null;
  onGravityChange: ((value: number) => void) | null;
  onBouncinessChange: ((value: number) => void) | null;
  onFrictionChange: ((value: number) => void) | null;
  setPaused(paused: boolean): void;
  setThemeName(name: string): void;
  setAccentColor(rgb: [number, number, number]): void;
  setConfigEnabled(enabled: boolean): void;
  setDuration(sec: number): void;
  setParticles(n: number): void;
  setRows(rows: number): void;
  setSeed(seed: number): void;
  closeDrawer(): void;
}

// ── Styles ──

function injectStyles(): void {
  if (document.getElementById('gt-console-style')) return;
  const style = document.createElement('style');
  style.id = 'gt-console-style';
  style.textContent = `
    /* ── On-screen controls ── */
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

    /* ── Side Drawer (Glassmorphism) ── */
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

    /* ── Section headings ── */
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

    /* ── Field rows ── */
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

    /* ── Theme strip ── */
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

    /* ── Sliders ── */
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

    /* ── Duration control ── */
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

    /* ── System buttons ── */
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

    /* ── Duration preset buttons ── */
    .gt-preset-row {
      display: flex;
      gap: 6px;
      margin-bottom: 8px;
    }
    .gt-preset-btn {
      flex: 1;
      padding: 6px 0;
      border: 1px solid #555;
      border-radius: 4px;
      background: transparent;
      color: #aaa;
      font-size: 11px;
      font-family: monospace;
      cursor: pointer;
      min-height: 32px;
    }
    .gt-preset-btn:hover { border-color: #888; color: #fff; }
    .gt-preset-btn.active { border-color: currentColor; color: currentColor; background: rgba(255,255,255,0.05); }
    .gt-preset-btn:disabled { opacity: 0.3; cursor: default; }

    /* ── Duration disabled hint ── */
    .gt-dur-hint {
      font-size: 10px;
      color: rgba(255,160,60,0.7);
      letter-spacing: 0.5px;
      margin-left: auto;
      animation: gt-hint-pulse 2s ease-in-out infinite;
    }
    @keyframes gt-hint-pulse {
      0%, 100% { opacity: 0.7; }
      50% { opacity: 1.0; }
    }

    /* ── Fixed credits ── */
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

// ── Helpers ──

function fmtMmSs(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function parseMmSs(str: string): number | null {
  const parts = str.split(':');
  if (parts.length === 2) {
    const m = parseInt(parts[0], 10);
    const s = parseInt(parts[1], 10);
    if (Number.isFinite(m) && Number.isFinite(s)) return m * 60 + s;
  }
  const v = parseInt(str, 10);
  return Number.isFinite(v) ? v : null;
}

// ── Console creation ──

export function createConsole(
  initialMode: string,
  initialTheme = 'Nixie',
  initialDurationSec = 3600,
  initialCs = true,
  initialAppMode: AppMode = 'timer',
  initialFriction = 1.0,
  initialParticles = 3600,
  initialRows = 24,
  initialSeed = 0,
): ConsoleController {
  injectStyles();

  let isPaused = false;
  let currentDuration = Math.min(initialDurationSec, 3600);
  let currentParticles = Math.max(10, Math.min(3600, initialParticles));
  let currentRows = Math.max(4, Math.min(64, initialRows));
  let currentSeed = initialSeed;

  // ═══════════════════════════════════════════════════════════════════
  // FIXED CREDITS
  // ═══════════════════════════════════════════════════════════════════
  const creditsEl = document.createElement('div');
  creditsEl.className = 'gt-credits';
  creditsEl.textContent = 'Crafted by Tipsy Tap Studio';
  document.body.appendChild(creditsEl);

  // ═══════════════════════════════════════════════════════════════════
  // ON-SCREEN CONTROLS
  // ═══════════════════════════════════════════════════════════════════

  const controls = document.createElement('div');
  controls.className = 'gt-controls';

  function makeBtn(svg: string, title: string): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.className = 'gt-ctrl-btn';
    btn.innerHTML = svg;
    btn.title = title;
    return btn;
  }

  const startBtn = makeBtn(
    '<svg viewBox="0 0 24 24"><polygon points="6,4 20,12 6,20"/></svg>',
    'Start',
  );
  const pauseBtn = makeBtn(
    '<svg viewBox="0 0 24 24"><rect x="5" y="4" width="4" height="16"/><rect x="15" y="4" width="4" height="16"/></svg>',
    'Pause',
  );
  const stopBtn = makeBtn(
    '<svg viewBox="0 0 24 24"><rect x="5" y="5" width="14" height="14" rx="2"/></svg>',
    'Stop',
  );
  const settingsBtn = makeBtn(
    '<svg viewBox="0 0 24 24"><path d="M12 15.5A3.5 3.5 0 1 0 12 8.5a3.5 3.5 0 0 0 0 7z" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>',
    'Settings',
  );

  startBtn.addEventListener('click', () => ctrl.onStart?.());
  pauseBtn.addEventListener('click', () => ctrl.onPause?.());
  stopBtn.addEventListener('click', () => ctrl.onStop?.());
  settingsBtn.addEventListener('click', () => toggleDrawer());

  controls.appendChild(startBtn);
  controls.appendChild(pauseBtn);
  controls.appendChild(stopBtn);
  controls.appendChild(settingsBtn);
  document.body.appendChild(controls);

  // ═══════════════════════════════════════════════════════════════════
  // SIDE DRAWER
  // ═══════════════════════════════════════════════════════════════════

  const overlay = document.createElement('div');
  overlay.className = 'gt-drawer-overlay';
  overlay.addEventListener('click', () => closeDrawer());

  const drawer = document.createElement('div');
  drawer.className = 'gt-drawer';

  const drawerContent = document.createElement('div');
  drawerContent.className = 'gt-drawer-content';

  // ── TIMER section ──
  const timerSection = document.createElement('div');
  timerSection.className = 'gt-section';
  timerSection.innerHTML = '<div class="gt-section-title">Timer</div>';

  // App mode
  const appRow = document.createElement('div');
  appRow.className = 'gt-field-row';
  appRow.innerHTML = '<span class="gt-field-label">App</span>';
  const appSelect = document.createElement('select');
  appSelect.className = 'gt-field-select';
  for (const [val, label] of [['timer', 'Timer'], ['clock', 'Clock']] as const) {
    const opt = document.createElement('option');
    opt.value = val;
    opt.textContent = label;
    if (val === initialAppMode) opt.selected = true;
    appSelect.appendChild(opt);
  }
  appSelect.addEventListener('change', () => {
    ctrl.onAppModeChange?.(appSelect.value as AppMode);
    updateClockModeVisibility();
  });
  appRow.appendChild(appSelect);
  timerSection.appendChild(appRow);

  // Duration (hidden in clock mode)
  const durLabel = document.createElement('div');
  durLabel.className = 'gt-field-row';
  durLabel.innerHTML = '<span class="gt-field-label">Duration</span>';
  durLabel.style.marginBottom = '0';

  const durRow = document.createElement('div');
  durRow.className = 'gt-dur-row';

  const durMinusBtn = document.createElement('button');
  durMinusBtn.className = 'gt-dur-btn';
  durMinusBtn.textContent = '\u2212';

  const durSlider = document.createElement('input');
  durSlider.type = 'range';
  durSlider.className = 'gt-slider-input';
  durSlider.min = '1';
  durSlider.max = '3600';
  durSlider.step = '1';
  durSlider.value = String(currentDuration);
  durSlider.style.flex = '1';

  const durDisplay = document.createElement('input');
  durDisplay.className = 'gt-dur-display';
  durDisplay.type = 'text';
  durDisplay.value = fmtMmSs(currentDuration);

  const durPlusBtn = document.createElement('button');
  durPlusBtn.className = 'gt-dur-btn';
  durPlusBtn.textContent = '+';

  function setDuration(sec: number): void {
    sec = Math.max(1, Math.min(3600, sec));
    currentDuration = sec;
    durSlider.value = String(sec);
    durDisplay.value = fmtMmSs(sec);
    ctrl.onDurationChange?.(sec);
  }

  durSlider.addEventListener('input', () => {
    const v = parseInt(durSlider.value, 10);
    currentDuration = v;
    durDisplay.value = fmtMmSs(v);
    presetBtns.forEach(b => b.classList.remove('active'));
    ctrl.onDurationChange?.(v);
  });

  durDisplay.addEventListener('change', () => {
    const parsed = parseMmSs(durDisplay.value);
    if (parsed !== null) {
      setDuration(parsed);
    } else {
      durDisplay.value = fmtMmSs(currentDuration);
    }
  });

  // +/- hold acceleration helper
  function makeHold(setter: (d: number) => void) {
    let iv: ReturnType<typeof setInterval> | null = null;
    return {
      start(d: number) { setter(d); iv = setInterval(() => setter(d), 80); },
      stop() { if (iv) { clearInterval(iv); iv = null; } },
    };
  }

  const durHold = makeHold((d) => setDuration(currentDuration + d));
  durMinusBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); durHold.start(-1); });
  durMinusBtn.addEventListener('pointerup', () => durHold.stop());
  durMinusBtn.addEventListener('pointerleave', () => durHold.stop());
  durPlusBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); durHold.start(1); });
  durPlusBtn.addEventListener('pointerup', () => durHold.stop());
  durPlusBtn.addEventListener('pointerleave', () => durHold.stop());

  durRow.appendChild(durMinusBtn);
  durRow.appendChild(durSlider);
  durRow.appendChild(durDisplay);
  durRow.appendChild(durPlusBtn);

  // "Stop to change" hint (hidden by default)
  const durHint = document.createElement('span');
  durHint.className = 'gt-dur-hint';
  durHint.textContent = 'Stop to change';
  durHint.style.display = 'none';
  durLabel.appendChild(durHint);

  // Duration preset buttons
  const presetRow = document.createElement('div');
  presetRow.className = 'gt-preset-row';
  const PRESETS_DUR = [
    { label: '3m', sec: 180 },
    { label: '5m', sec: 300 },
    { label: '10m', sec: 600 },
    { label: '30m', sec: 1800 },
    { label: '60m', sec: 3600 },
  ];
  const presetBtns: HTMLButtonElement[] = [];
  for (const p of PRESETS_DUR) {
    const btn = document.createElement('button');
    btn.className = 'gt-preset-btn';
    btn.textContent = p.label;
    if (p.sec === currentDuration) btn.classList.add('active');
    btn.addEventListener('click', () => {
      setDuration(p.sec);
      presetBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
    presetRow.appendChild(btn);
    presetBtns.push(btn);
  }

  timerSection.appendChild(durLabel);
  timerSection.appendChild(presetRow);
  timerSection.appendChild(durRow);

  // ── Particles control ──
  const partLabel = document.createElement('div');
  partLabel.className = 'gt-field-row';
  partLabel.innerHTML = '<span class="gt-field-label">Particles</span>';
  partLabel.style.marginBottom = '0';

  const partHint = document.createElement('span');
  partHint.className = 'gt-dur-hint';
  partHint.textContent = 'Stop to change';
  partHint.style.display = 'none';
  partLabel.appendChild(partHint);

  const partPresetRow = document.createElement('div');
  partPresetRow.className = 'gt-preset-row';
  const PRESETS_PART = [
    { label: '60', val: 60 },
    { label: '300', val: 300 },
    { label: '600', val: 600 },
    { label: '1800', val: 1800 },
    { label: '3600', val: 3600 },
  ];
  const partPresetBtns: HTMLButtonElement[] = [];
  for (const p of PRESETS_PART) {
    const btn = document.createElement('button');
    btn.className = 'gt-preset-btn';
    btn.textContent = p.label;
    if (p.val === currentParticles) btn.classList.add('active');
    btn.addEventListener('click', () => {
      setParticlesVal(p.val);
      partPresetBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
    partPresetRow.appendChild(btn);
    partPresetBtns.push(btn);
  }

  const partRow = document.createElement('div');
  partRow.className = 'gt-dur-row';
  const partMinusBtn = document.createElement('button');
  partMinusBtn.className = 'gt-dur-btn';
  partMinusBtn.textContent = '\u2212';
  const partSlider = document.createElement('input');
  partSlider.type = 'range';
  partSlider.className = 'gt-slider-input';
  partSlider.min = '10';
  partSlider.max = '3600';
  partSlider.step = '1';
  partSlider.value = String(currentParticles);
  partSlider.style.flex = '1';
  const partDisplay = document.createElement('input');
  partDisplay.className = 'gt-dur-display';
  partDisplay.type = 'text';
  partDisplay.value = String(currentParticles);
  const partPlusBtn = document.createElement('button');
  partPlusBtn.className = 'gt-dur-btn';
  partPlusBtn.textContent = '+';

  function setParticlesVal(n: number): void {
    n = Math.max(10, Math.min(3600, n));
    currentParticles = n;
    partSlider.value = String(n);
    partDisplay.value = String(n);
    ctrl.onParticlesChange?.(n);
  }

  partSlider.addEventListener('input', () => {
    const v = parseInt(partSlider.value, 10);
    currentParticles = v;
    partDisplay.value = String(v);
    partPresetBtns.forEach(b => b.classList.remove('active'));
    ctrl.onParticlesChange?.(v);
  });
  partDisplay.addEventListener('change', () => {
    const v = parseInt(partDisplay.value, 10);
    if (Number.isFinite(v)) {
      setParticlesVal(v);
    } else {
      partDisplay.value = String(currentParticles);
    }
  });

  const partHold = makeHold((d) => setParticlesVal(currentParticles + d));
  partMinusBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); partHold.start(-1); });
  partMinusBtn.addEventListener('pointerup', () => partHold.stop());
  partMinusBtn.addEventListener('pointerleave', () => partHold.stop());
  partPlusBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); partHold.start(1); });
  partPlusBtn.addEventListener('pointerup', () => partHold.stop());
  partPlusBtn.addEventListener('pointerleave', () => partHold.stop());

  partRow.appendChild(partMinusBtn);
  partRow.appendChild(partSlider);
  partRow.appendChild(partDisplay);
  partRow.appendChild(partPlusBtn);

  timerSection.appendChild(partLabel);
  timerSection.appendChild(partPresetRow);
  timerSection.appendChild(partRow);

  // ── Rows control ──
  const rowsLabel = document.createElement('div');
  rowsLabel.className = 'gt-field-row';
  rowsLabel.innerHTML = '<span class="gt-field-label">Rows</span>';
  rowsLabel.style.marginBottom = '0';

  const rowsHint = document.createElement('span');
  rowsHint.className = 'gt-dur-hint';
  rowsHint.textContent = 'Stop to change';
  rowsHint.style.display = 'none';
  rowsLabel.appendChild(rowsHint);

  const rowsPresetRow = document.createElement('div');
  rowsPresetRow.className = 'gt-preset-row';
  const PRESETS_ROWS = [
    { label: '8', val: 8 },
    { label: '16', val: 16 },
    { label: '24', val: 24 },
    { label: '32', val: 32 },
    { label: '48', val: 48 },
  ];
  const rowsPresetBtns: HTMLButtonElement[] = [];
  for (const p of PRESETS_ROWS) {
    const btn = document.createElement('button');
    btn.className = 'gt-preset-btn';
    btn.textContent = p.label;
    if (p.val === currentRows) btn.classList.add('active');
    btn.addEventListener('click', () => {
      setRowsVal(p.val);
      rowsPresetBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
    rowsPresetRow.appendChild(btn);
    rowsPresetBtns.push(btn);
  }

  const rowsRow = document.createElement('div');
  rowsRow.className = 'gt-dur-row';
  const rowsMinusBtn = document.createElement('button');
  rowsMinusBtn.className = 'gt-dur-btn';
  rowsMinusBtn.textContent = '\u2212';
  const rowsSlider = document.createElement('input');
  rowsSlider.type = 'range';
  rowsSlider.className = 'gt-slider-input';
  rowsSlider.min = '4';
  rowsSlider.max = '64';
  rowsSlider.step = '1';
  rowsSlider.value = String(currentRows);
  rowsSlider.style.flex = '1';
  const rowsDisplay = document.createElement('input');
  rowsDisplay.className = 'gt-dur-display';
  rowsDisplay.type = 'text';
  rowsDisplay.value = String(currentRows);
  const rowsPlusBtn = document.createElement('button');
  rowsPlusBtn.className = 'gt-dur-btn';
  rowsPlusBtn.textContent = '+';

  function setRowsVal(r: number): void {
    r = Math.max(4, Math.min(64, r));
    currentRows = r;
    rowsSlider.value = String(r);
    rowsDisplay.value = String(r);
    ctrl.onRowsChange?.(r);
  }

  rowsSlider.addEventListener('input', () => {
    const v = parseInt(rowsSlider.value, 10);
    currentRows = v;
    rowsDisplay.value = String(v);
    rowsPresetBtns.forEach(b => b.classList.remove('active'));
    ctrl.onRowsChange?.(v);
  });
  rowsDisplay.addEventListener('change', () => {
    const v = parseInt(rowsDisplay.value, 10);
    if (Number.isFinite(v)) {
      setRowsVal(v);
    } else {
      rowsDisplay.value = String(currentRows);
    }
  });

  const rowsHold = makeHold((d) => setRowsVal(currentRows + d));
  rowsMinusBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); rowsHold.start(-1); });
  rowsMinusBtn.addEventListener('pointerup', () => rowsHold.stop());
  rowsMinusBtn.addEventListener('pointerleave', () => rowsHold.stop());
  rowsPlusBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); rowsHold.start(1); });
  rowsPlusBtn.addEventListener('pointerup', () => rowsHold.stop());
  rowsPlusBtn.addEventListener('pointerleave', () => rowsHold.stop());

  rowsRow.appendChild(rowsMinusBtn);
  rowsRow.appendChild(rowsSlider);
  rowsRow.appendChild(rowsDisplay);
  rowsRow.appendChild(rowsPlusBtn);

  timerSection.appendChild(rowsLabel);
  timerSection.appendChild(rowsPresetRow);
  timerSection.appendChild(rowsRow);

  // Centiseconds (hidden in clock mode)
  const csRow = document.createElement('div');
  csRow.className = 'gt-field-row';
  csRow.innerHTML = '<span class="gt-field-label">Centiseconds</span>';
  const csSelect = document.createElement('select');
  csSelect.className = 'gt-field-select';
  csSelect.innerHTML = '<option value="on">ON</option><option value="off">OFF</option>';
  csSelect.value = initialCs ? 'on' : 'off';
  csSelect.addEventListener('change', () => {
    ctrl.onCentisecondsToggle?.(csSelect.value === 'on');
  });
  csRow.appendChild(csSelect);
  timerSection.appendChild(csRow);

  // Preset
  const physModeRow = document.createElement('div');
  physModeRow.className = 'gt-field-row';
  physModeRow.innerHTML = '<span class="gt-field-label">Preset</span>';
  const physModeSelect = document.createElement('select');
  physModeSelect.className = 'gt-field-select';
  for (const name of Object.keys(PRESETS)) {
    const opt = document.createElement('option');
    opt.value = name.toLowerCase();
    opt.textContent = name;
    if (name.toLowerCase() === initialMode.toLowerCase()) opt.selected = true;
    physModeSelect.appendChild(opt);
  }
  physModeSelect.addEventListener('change', () => {
    ctrl.onModeChange?.(physModeSelect.value);
    updateBaseFromPreset();
    syncPhysicsSliders();
  });
  physModeRow.appendChild(physModeSelect);
  timerSection.appendChild(physModeRow);

  // Clock mode visibility
  function updateClockModeVisibility(): void {
    const isClock = appSelect.value === 'clock';
    durLabel.style.display = isClock ? 'none' : '';
    presetRow.style.display = isClock ? 'none' : '';
    durRow.style.display = isClock ? 'none' : '';
    partLabel.style.display = isClock ? 'none' : '';
    partPresetRow.style.display = isClock ? 'none' : '';
    partRow.style.display = isClock ? 'none' : '';
    rowsLabel.style.display = isClock ? 'none' : '';
    rowsPresetRow.style.display = isClock ? 'none' : '';
    rowsRow.style.display = isClock ? 'none' : '';
    csRow.style.display = isClock ? 'none' : '';
  }
  updateClockModeVisibility();

  drawerContent.appendChild(timerSection);

  // ── THEME section ──
  const themeSection = document.createElement('div');
  themeSection.className = 'gt-section';
  themeSection.innerHTML = '<div class="gt-section-title">Theme</div>';

  const themeStrip = document.createElement('div');
  themeStrip.className = 'gt-theme-strip';
  const themeChips: HTMLButtonElement[] = [];

  const LED_COLORS: Record<string, string> = {
    nixie:  '#FF8C00',
    system: '#00FF41',
    studio: '#FFFFFF',
    cyber:  '#00D1FF',
  };

  for (const t of CLOCK_THEMES) {
    const chip = document.createElement('button');
    chip.className = 'gt-theme-chip';
    const tc = LED_COLORS[t.name.toLowerCase()] || '#fff';
    chip.style.setProperty('--tc', tc);
    if (t.name.toLowerCase() === initialTheme.toLowerCase()) chip.classList.add('active');

    const led = document.createElement('span');
    led.className = 'gt-led';
    led.style.background = tc;
    chip.appendChild(led);

    const label = document.createElement('span');
    label.textContent = t.name;
    chip.appendChild(label);

    chip.addEventListener('click', () => {
      themeChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      ctrl.onThemeChange?.(t.name);
    });
    themeStrip.appendChild(chip);
    themeChips.push(chip);
  }
  themeSection.appendChild(themeStrip);
  drawerContent.appendChild(themeSection);

  // ── PHYSICS section ──
  const physSection = document.createElement('div');
  physSection.className = 'gt-section';
  physSection.innerHTML = '<div class="gt-section-title">Physics</div>';

  // Base drag values for friction multiplier
  let baseDragX = PHYSICS.dragX;
  let baseDragY = PHYSICS.dragY;
  let baseDragXSettle = PHYSICS.dragXSettle;
  let baseDragYSettle = PHYSICS.dragYSettle;
  let currentFriction = initialFriction;

  function updateBaseFromPreset(): void {
    baseDragX = PHYSICS.dragX;
    baseDragY = PHYSICS.dragY;
    baseDragXSettle = PHYSICS.dragXSettle;
    baseDragYSettle = PHYSICS.dragYSettle;
  }

  function applyFriction(f: number): void {
    currentFriction = f;
    PHYSICS.dragX = baseDragX * f;
    PHYSICS.dragY = baseDragY * f;
    PHYSICS.dragXSettle = baseDragXSettle * f;
    PHYSICS.dragYSettle = baseDragYSettle * f;
  }

  if (initialFriction !== 1.0) {
    applyFriction(initialFriction);
  }

  // Gravity
  const gravRow = document.createElement('div');
  gravRow.className = 'gt-slider-row';
  const gravLabel = document.createElement('span');
  gravLabel.className = 'gt-slider-label';
  gravLabel.textContent = 'Gravity';
  const gravInput = document.createElement('input');
  gravInput.type = 'range';
  gravInput.className = 'gt-slider-input';
  gravInput.min = '50';
  gravInput.max = '3000';
  gravInput.step = '10';
  gravInput.value = String(PHYSICS.gravity);
  const gravVal = document.createElement('span');
  gravVal.className = 'gt-slider-val';
  gravVal.textContent = String(Math.round(PHYSICS.gravity));
  gravInput.addEventListener('input', () => {
    const v = parseFloat(gravInput.value);
    PHYSICS.gravity = v;
    gravVal.textContent = String(Math.round(v));
    ctrl.onGravityChange?.(v);
  });
  gravRow.appendChild(gravLabel);
  gravRow.appendChild(gravInput);
  gravRow.appendChild(gravVal);
  physSection.appendChild(gravRow);

  // Bounce (restitution)
  const bounceRow = document.createElement('div');
  bounceRow.className = 'gt-slider-row';
  const bounceLabel = document.createElement('span');
  bounceLabel.className = 'gt-slider-label';
  bounceLabel.textContent = 'Bounce';
  const bounceInput = document.createElement('input');
  bounceInput.type = 'range';
  bounceInput.className = 'gt-slider-input';
  bounceInput.min = '0';
  bounceInput.max = '1.0';
  bounceInput.step = '0.01';
  bounceInput.value = String(PHYSICS.restitution);
  const bounceVal = document.createElement('span');
  bounceVal.className = 'gt-slider-val';
  bounceVal.textContent = PHYSICS.restitution.toFixed(2);
  bounceInput.addEventListener('input', () => {
    const v = parseFloat(bounceInput.value);
    PHYSICS.restitution = v;
    bounceVal.textContent = v.toFixed(2);
    ctrl.onBouncinessChange?.(v);
  });
  bounceRow.appendChild(bounceLabel);
  bounceRow.appendChild(bounceInput);
  bounceRow.appendChild(bounceVal);
  physSection.appendChild(bounceRow);

  // Flow (friction multiplier)
  const fricRow = document.createElement('div');
  fricRow.className = 'gt-slider-row';
  const fricLabel = document.createElement('span');
  fricLabel.className = 'gt-slider-label';
  fricLabel.textContent = 'Flow';
  const fricInput = document.createElement('input');
  fricInput.type = 'range';
  fricInput.className = 'gt-slider-input';
  fricInput.min = '0.5';
  fricInput.max = '3.0';
  fricInput.step = '0.05';
  fricInput.value = String(currentFriction);
  const fricVal = document.createElement('span');
  fricVal.className = 'gt-slider-val';
  fricVal.textContent = `\u00D7${currentFriction.toFixed(2)}`;
  fricInput.addEventListener('input', () => {
    const v = parseFloat(fricInput.value);
    applyFriction(v);
    fricVal.textContent = `\u00D7${v.toFixed(2)}`;
    ctrl.onFrictionChange?.(v);
  });
  fricRow.appendChild(fricLabel);
  fricRow.appendChild(fricInput);
  fricRow.appendChild(fricVal);
  physSection.appendChild(fricRow);

  // Reset
  const physResetBtn = document.createElement('button');
  physResetBtn.className = 'gt-sys-btn';
  physResetBtn.textContent = 'Reset Physics';
  physResetBtn.style.marginTop = '12px';
  physResetBtn.addEventListener('click', () => {
    applyPreset(physModeSelect.value);
    updateBaseFromPreset();
    currentFriction = 1.0;
    applyFriction(1.0);
    syncPhysicsSliders();
  });
  physSection.appendChild(physResetBtn);

  function syncPhysicsSliders(): void {
    gravInput.value = String(PHYSICS.gravity);
    gravVal.textContent = String(Math.round(PHYSICS.gravity));
    bounceInput.value = String(PHYSICS.restitution);
    bounceVal.textContent = PHYSICS.restitution.toFixed(2);
    fricInput.value = String(currentFriction);
    fricVal.textContent = `\u00D7${currentFriction.toFixed(2)}`;
  }

  drawerContent.appendChild(physSection);

  // ── SYSTEM section ──
  const sysSection = document.createElement('div');
  sysSection.className = 'gt-section';
  sysSection.innerHTML = `<div class="gt-section-title">System</div>`;

  const seedRow = document.createElement('div');
  seedRow.className = 'gt-field-row';
  seedRow.innerHTML = '<span class="gt-field-label">Seed</span>';
  const seedVal = document.createElement('span');
  seedVal.className = 'gt-slider-val';
  seedVal.style.width = 'auto';
  seedVal.textContent = String(currentSeed);
  seedRow.appendChild(seedVal);
  sysSection.appendChild(seedRow);

  const shareBtn = document.createElement('button');
  shareBtn.className = 'gt-sys-btn';
  shareBtn.textContent = 'Share URL';
  shareBtn.addEventListener('click', () => {
    ctrl.onShareURL?.();
    shareBtn.textContent = 'Copied!';
    setTimeout(() => { shareBtn.textContent = 'Share URL'; }, 1500);
  });
  sysSection.appendChild(shareBtn);

  const resetBtn = document.createElement('button');
  resetBtn.className = 'gt-sys-btn';
  resetBtn.textContent = 'Reset to Default';
  resetBtn.addEventListener('click', () => ctrl.onResetDefaults?.());
  sysSection.appendChild(resetBtn);

  drawerContent.appendChild(sysSection);

  drawer.appendChild(drawerContent);
  document.body.appendChild(overlay);
  document.body.appendChild(drawer);

  // ── Drawer toggle ──
  let drawerOpen = false;

  function toggleDrawer(): void {
    drawerOpen = !drawerOpen;
    drawer.classList.toggle('open', drawerOpen);
    overlay.classList.toggle('open', drawerOpen);
    if (drawerOpen) { syncPhysicsSliders(); }
  }

  function closeDrawer(): void {
    drawerOpen = false;
    drawer.classList.remove('open');
    overlay.classList.remove('open');
  }

  // ── Controller ──
  const ctrl: ConsoleController = {
    el: controls,
    show() { controls.classList.remove('hidden'); },
    hide() {
      controls.classList.add('hidden');
      if (drawerOpen) closeDrawer();
    },
    setTime(_remainingMs: number) {},
    setStatus(_status: SignalStatus) {},
    onModeChange: null,
    onPause: null,
    onStart: null,
    onStop: null,
    onThemeChange: null,
    onDurationChange: null,
    onParticlesChange: null,
    onRowsChange: null,
    onCentisecondsToggle: null,
    onResetDefaults: null,
    onShareURL: null,
    onAppModeChange: null,
    onGravityChange: null,
    onBouncinessChange: null,
    onFrictionChange: null,
    setPaused(p: boolean) {
      isPaused = p;
      startBtn.style.display = p ? '' : 'none';
      pauseBtn.style.display = p ? 'none' : '';
    },
    setThemeName(name: string) {
      themeChips.forEach(c => {
        c.classList.toggle('active', c.textContent?.toLowerCase() === name.toLowerCase());
      });
    },
    setAccentColor(rgb: [number, number, number]) {
      const [r, g, b] = rgb;
      const accentBorder = `rgba(${r},${g},${b},0.30)`;
      const accentColor = `rgba(${r},${g},${b},0.70)`;
      for (const btn of [startBtn, pauseBtn, stopBtn, settingsBtn]) {
        btn.style.borderColor = accentBorder;
        btn.style.color = accentColor;
      }
      // Section titles in drawer
      const titles = drawer.querySelectorAll<HTMLElement>('.gt-section-title');
      for (const t of titles) {
        t.style.color = `rgba(${r},${g},${b},0.35)`;
      }
    },
    setConfigEnabled(enabled: boolean) {
      // Duration
      durSlider.disabled = !enabled;
      durDisplay.disabled = !enabled;
      durMinusBtn.disabled = !enabled;
      durPlusBtn.disabled = !enabled;
      for (const btn of presetBtns) btn.disabled = !enabled;
      durHint.style.display = enabled ? 'none' : '';
      // Particles
      partSlider.disabled = !enabled;
      partDisplay.disabled = !enabled;
      partMinusBtn.disabled = !enabled;
      partPlusBtn.disabled = !enabled;
      for (const btn of partPresetBtns) btn.disabled = !enabled;
      partHint.style.display = enabled ? 'none' : '';
      // Rows
      rowsSlider.disabled = !enabled;
      rowsDisplay.disabled = !enabled;
      rowsMinusBtn.disabled = !enabled;
      rowsPlusBtn.disabled = !enabled;
      for (const btn of rowsPresetBtns) btn.disabled = !enabled;
      rowsHint.style.display = enabled ? 'none' : '';
    },
    setDuration(sec: number) {
      currentDuration = sec;
      durSlider.value = String(sec);
      durDisplay.value = fmtMmSs(sec);
    },
    setParticles(n: number) {
      currentParticles = n;
      partSlider.value = String(n);
      partDisplay.value = String(n);
    },
    setRows(rows: number) {
      currentRows = rows;
      rowsSlider.value = String(rows);
      rowsDisplay.value = String(rows);
    },
    setSeed(seed: number) {
      currentSeed = seed;
      seedVal.textContent = String(seed);
    },
    closeDrawer,
  };

  startBtn.style.display = 'none';
  return ctrl;
}

export function applyPreset(modeName: string): void {
  const key = Object.keys(PRESETS).find(
    k => k.toLowerCase() === modeName.toLowerCase()
  );
  if (!key) return;
  const preset = PRESETS[key];
  for (const k of Object.keys(preset) as (keyof PhysicsParams)[]) {
    (PHYSICS as any)[k] = preset[k];
  }
}
