/**
 * Minimal settings overlay & URL sync.
 * For MVP: a thin top-bar showing seed + link to share.
 */

import type { AppParams } from '../utils/url-params';

export function createSettingsBar(params: AppParams): HTMLElement {
  const bar = document.createElement('div');
  bar.id = 'settings-bar';
  Object.assign(bar.style, {
    position: 'fixed',
    top: '0',
    left: '0',
    width: '100%',
    padding: '6px 16px',
    boxSizing: 'border-box',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontFamily: '"JetBrains Mono", monospace',
    fontSize: '11px',
    color: 'rgba(255,255,255,0.20)',
    zIndex: '10',
    pointerEvents: 'none',
    userSelect: 'none',
  } as CSSStyleDeclaration);

  bar.innerHTML =
    `<span>GALTON-TIMER</span>` +
    `<span>seed:${params.s} | rows:${params.rows} | t:${params.t}s | n:${params.n}</span>`;

  return bar;
}
