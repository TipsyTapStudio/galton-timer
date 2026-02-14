/**
 * Buzzer-Beater Timer.
 *
 * Controls the emission schedule: N particles are spread evenly over T seconds.
 * The LAST particle is emitted exactly when the countdown hits 00:00.
 */

export class Timer {
  readonly totalTimeSec: number;
  private startedAt: number | null = null;

  constructor(totalTimeSec: number) {
    this.totalTimeSec = totalTimeSec;
  }

  start(now: number): void {
    this.startedAt = now;
  }

  /** Elapsed time in ms since start. */
  elapsedMs(now: number): number {
    if (this.startedAt === null) return 0;
    return now - this.startedAt;
  }

  /** Remaining seconds on the countdown (clamped to 0). */
  remainingSec(now: number): number {
    return Math.max(0, this.totalTimeSec - this.elapsedMs(now) / 1000);
  }

  /** True when countdown has reached 0 (all particles should have been emitted). */
  expired(now: number): boolean {
    return this.remainingSec(now) <= 0;
  }
}
