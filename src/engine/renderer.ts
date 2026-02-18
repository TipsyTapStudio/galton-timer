/**
 * AppRenderer — slim orchestrator.
 * Delegates grain/canvas ops to GrainRenderer, keeps frame pipeline + UI drawing.
 */

import type { Particle, BoardGeom } from './simulation';
import { drawClock, getThemeByName, CLOCK_THEMES } from './seven-seg';
import type { ClockTheme } from './seven-seg';
import { computeLayout, pegX, pegY } from './layout';
import type { Layout } from './layout';
import { GrainRenderer } from './grain-renderer';

export class Renderer {
  layout!: Layout;
  private gr: GrainRenderer;
  private totalParticles: number;

  // ── Theme & clock ──
  clockEnabled = true;
  private currentTheme: ClockTheme = CLOCK_THEMES[0];

  // ── Alarm ──
  alarmActive = false;
  private alarmFlashStart = 0;
  private alarmHighlight = false;

  constructor(
    container: HTMLElement,
    numRows: number,
    totalParticles: number,
    _seed: number,
  ) {
    this.totalParticles = totalParticles;
    this.gr = new GrainRenderer(container);
    this.gr.updateGrainColors(this.currentTheme);
    this.resize(numRows);
  }

  setClockEnabled(v: boolean): void {
    this.clockEnabled = v;
  }

  setTheme(theme: ClockTheme): void {
    this.currentTheme = theme;
    this.gr.updateGrainColors(theme);
    // Set background tint from theme
    const [r, g, b] = theme.segmentRGB;
    document.documentElement.style.setProperty('--bg',
      `rgb(${Math.round(r * 0.02)},${Math.round(g * 0.02)},${Math.round(b * 0.02)})`);
    // Rebake static canvas with new grain color
    this.gr.rebakeStatic(this.layout, theme);
  }

  setThemeByName(name: string): void {
    this.setTheme(getThemeByName(name));
  }

  setGlowIntensity(v: number): void {
    this.currentTheme = { ...this.currentTheme, glowIntensity: v };
  }

  getTheme(): ClockTheme {
    return this.currentTheme;
  }

  resize(numRows: number, totalParticles?: number): void {
    if (totalParticles !== undefined) this.totalParticles = totalParticles;
    const dpr = window.devicePixelRatio || 1;
    const w = window.innerWidth;
    const h = window.innerHeight;

    this.layout = computeLayout(w, h, dpr, numRows, this.totalParticles);
    this.gr.applyLayout(this.layout, this.totalParticles);
  }

  // ── Geometry for simulation ──

  pegX(row: number, index: number): number {
    return pegX(this.layout, row, index);
  }

  pegY(row: number): number {
    return pegY(this.layout, row);
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

  /** Ground height based on nearest bin's grain count. */
  getGroundY(x: number): number {
    return this.gr.getGroundY(this.layout, x);
  }

  // ── Baking ──

  bakeParticle(p: Particle): void {
    this.gr.bakeParticle(this.layout, p);
  }

  // ── Frame drawing ──

  drawFrame(
    particles: Particle[],
    remainingSec: number,
    totalParticles: number,
    emittedCount: number,
    _paused: boolean,
    totalMs?: number,
    rain?: { x: number; y: number; alpha: number }[],
    centiseconds?: number,
    wallClockSec?: number,
    beatPhase: number = 0,
  ): void {
    const L = this.layout;
    const ctx = this.gr.dCtx;
    ctx.clearRect(0, 0, L.width, L.height);

    if (totalMs !== undefined && totalMs > 0) {
      this.drawProgressBar(ctx, remainingSec * 1000, totalMs);
    }

    if (this.clockEnabled) {
      if (wallClockSec !== undefined) {
        this.drawSevenSegClock(ctx, wallClockSec, undefined, true);
      } else {
        this.drawSevenSegClock(ctx, remainingSec, centiseconds);
      }
    }
    if (wallClockSec !== undefined) {
      this.drawInlineTimer(ctx, wallClockSec, undefined, true);
    } else {
      this.drawInlineTimer(ctx, remainingSec, centiseconds);
    }
    this.gr.drawHopper(ctx, L, emittedCount, totalParticles);

    // Alarm pin flash
    let pegAlpha: number | undefined;
    if (this.alarmActive) {
      const elapsed = performance.now() - this.alarmFlashStart;
      const flashDuration = 200;
      const totalFlashes = 10;
      const flashIndex = elapsed / flashDuration;
      if (flashIndex < totalFlashes) {
        const phase = flashIndex % 1;
        const wave = Math.sin(phase * Math.PI);
        pegAlpha = 0.15 + 0.70 * wave;
      } else {
        pegAlpha = 0.55;
        this.alarmHighlight = true;
      }
    }

    this.gr.drawPegs(ctx, L, this.currentTheme, pegAlpha, beatPhase);
    this.gr.drawParticles(ctx, L, particles);
    if (rain && rain.length > 0) {
      this.gr.drawRainParticles(ctx, L, rain, this.currentTheme);
    }
  }

  private drawProgressBar(ctx: CanvasRenderingContext2D, remainingMs: number, totalMs: number): void {
    const progress = Math.max(0, Math.min(1, 1 - remainingMs / totalMs));
    const [r, g, b] = this.currentTheme.segmentRGB;
    ctx.fillStyle = `rgba(${r},${g},${b},0.60)`;
    ctx.fillRect(0, 0, this.layout.width * progress, 2);
  }

  private drawSevenSegClock(ctx: CanvasRenderingContext2D, sec: number, centiseconds?: number, showHours?: boolean): void {
    const L = this.layout;
    const digitH = Math.min(L.width * 0.14, L.height * 0.16);
    const bpmY = L.hopperTop - digitH * 0.8;
    drawClock(ctx, Math.floor(sec), L.centerX, bpmY, digitH, this.currentTheme, centiseconds, showHours);
  }

  private drawInlineTimer(ctx: CanvasRenderingContext2D, sec: number, centiseconds?: number, showHours?: boolean): void {
    if (sec <= 0) return;
    const L = this.layout;
    const digitH = L.height * 0.04;
    drawClock(ctx, Math.floor(sec), L.centerX, L.inlineTimerY, digitH, this.currentTheme, centiseconds, showHours);
  }

  // ── Rain particles (refill — identical grain rendering) ──

  drawRainParticles(ctx: CanvasRenderingContext2D, rainParticles: { x: number; y: number; alpha: number }[]): void {
    this.gr.drawRainParticles(ctx, this.layout, rainParticles, this.currentTheme);
  }

  // ── Purge ──

  beginPurge(): void {
    this.gr.beginPurge(this.layout);
  }

  purgeStacks(dt: number): boolean {
    return this.gr.purgeStacks(this.layout, dt, this.currentTheme);
  }

  // ── Hopper fade ──

  beginHopperFade(): void {
    this.gr.beginHopperFade();
  }

  setHopperFadeAlpha(a: number): void {
    this.gr.setHopperFadeAlpha(a);
  }

  resetHopperFade(): void {
    this.gr.resetHopperFade();
  }

  fillStacks(numRows: number, totalParticles: number): void {
    this.gr.fillStacks(this.layout, numRows, totalParticles, this.currentTheme);
  }

  // ── Alarm ──

  startAlarm(): void {
    this.alarmActive = true;
    this.alarmFlashStart = performance.now();
    this.alarmHighlight = false;
  }

  stopAlarm(): void {
    this.alarmActive = false;
    this.alarmHighlight = false;
  }

  isAlarmFlashDone(): boolean {
    if (!this.alarmActive) return true;
    return this.alarmHighlight;
  }

  /** Clear baked grains and reset all state. */
  clearStatic(): void {
    this.gr.clearStatic(this.layout);
  }
}

export { CLOCK_THEMES, getThemeByName };
export type { ClockTheme, Layout };
