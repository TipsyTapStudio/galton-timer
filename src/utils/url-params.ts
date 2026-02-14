/**
 * URL parameter serialization / deserialization.
 * Format: ?t=60&n=2000&s=42&rows=12
 */

export interface AppParams {
  /** Timer duration in seconds */
  t: number;
  /** Total number of particles */
  n: number;
  /** PRNG seed */
  s: number;
  /** Number of peg rows */
  rows: number;
}

const DEFAULTS: AppParams = {
  t: 60,
  n: 2000,
  s: 0,       // 0 means "generate from timestamp"
  rows: 12,
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

  return {
    t: Math.max(1, raw('t', DEFAULTS.t)),
    n: Math.max(10, raw('n', DEFAULTS.n)),
    s: seed,
    rows: Math.max(2, Math.min(64, raw('rows', DEFAULTS.rows))),
  };
}

export function writeParams(cfg: AppParams): void {
  const sp = new URLSearchParams();
  sp.set('t', String(cfg.t));
  sp.set('n', String(cfg.n));
  sp.set('s', String(cfg.s));
  sp.set('rows', String(cfg.rows));
  const url = `${window.location.pathname}?${sp.toString()}`;
  window.history.replaceState(null, '', url);
}
