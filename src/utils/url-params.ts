/**
 * URL parameter serialization / deserialization.
 * Format: ?app=timer&t=3600&n=3600&s=42&rows=24&mode=standard&clock=true&theme=nixie&friction=1.0
 */

export type AppMode = 'timer' | 'clock';

export interface AppParams {
  /** App mode: timer or clock */
  app: AppMode;
  /** Timer duration in seconds */
  t: number;
  /** Total number of particles */
  n: number;
  /** PRNG seed */
  s: number;
  /** Number of peg rows */
  rows: number;
  /** Physics mode preset name */
  mode: string;
  /** Clock display enabled */
  clock: boolean;
  /** Color theme name */
  theme: string;
  /** Centiseconds display enabled */
  cs: boolean;
  /** Friction multiplier for drag values */
  friction: number;
}

const VALID_MODES = ['standard', 'heavy sand', 'techno', 'moon gravity', 'super ball'];
const VALID_THEMES = ['nixie', 'system', 'studio', 'cyber'];
const VALID_APP_MODES: AppMode[] = ['timer', 'clock'];

const DEFAULTS: AppParams = {
  app: 'timer',
  t: 3600,
  n: 3600,
  s: 0,       // 0 means "generate from timestamp"
  rows: 24,
  mode: 'standard',
  clock: false,
  theme: 'nixie',
  cs: true,
  friction: 1.0,
};

export function readParams(): AppParams {
  const sp = new URLSearchParams(window.location.search);
  const raw = (key: string, fallback: number): number => {
    const v = sp.get(key);
    if (v === null) return fallback;
    const num = parseInt(v, 10);
    return Number.isFinite(num) ? num : fallback;
  };

  let seed = raw('s', DEFAULTS.s);
  if (seed === 0) {
    seed = (Date.now() % 1_000_000) | 1;
  }

  const appRaw = (sp.get('app') || DEFAULTS.app).toLowerCase().trim() as AppMode;
  const app = VALID_APP_MODES.includes(appRaw) ? appRaw : DEFAULTS.app;

  const modeRaw = (sp.get('mode') || DEFAULTS.mode).toLowerCase().trim();
  const mode = VALID_MODES.includes(modeRaw) ? modeRaw : DEFAULTS.mode;

  const clockRaw = sp.get('clock');
  const clock = clockRaw === null ? DEFAULTS.clock : clockRaw !== 'false' && clockRaw !== '0';

  const themeRaw = (sp.get('theme') || DEFAULTS.theme).toLowerCase().trim();
  const theme = VALID_THEMES.includes(themeRaw) ? themeRaw : DEFAULTS.theme;

  const csRaw = sp.get('cs');
  const cs = csRaw === null ? DEFAULTS.cs : csRaw !== 'false' && csRaw !== '0';

  const frictionRaw = sp.get('friction');
  const friction = frictionRaw !== null
    ? Math.max(0.5, Math.min(3.0, parseFloat(frictionRaw) || DEFAULTS.friction))
    : DEFAULTS.friction;

  return {
    app,
    t: Math.max(1, raw('t', DEFAULTS.t)),
    n: Math.max(10, Math.min(3600, raw('n', DEFAULTS.n))),
    s: seed,
    rows: Math.max(4, Math.min(64, raw('rows', DEFAULTS.rows))),
    mode,
    clock,
    theme,
    cs,
    friction,
  };
}

export function writeParams(cfg: AppParams): void {
  const sp = new URLSearchParams();
  sp.set('app', cfg.app);
  sp.set('t', String(cfg.t));
  sp.set('n', String(cfg.n));
  sp.set('s', String(cfg.s));
  sp.set('rows', String(cfg.rows));
  sp.set('mode', cfg.mode);
  sp.set('clock', String(cfg.clock));
  sp.set('theme', cfg.theme);
  sp.set('cs', String(cfg.cs));
  sp.set('friction', String(cfg.friction));
  const url = `${window.location.pathname}?${sp.toString()}`;
  window.history.replaceState(null, '', url);
}
