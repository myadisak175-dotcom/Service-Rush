export type ServiceRating = 'perfect' | 'great' | 'ok' | 'late';

export interface ServiceWindowConfig {
  durationMs: number;
  perfectRatio?: number;
  greatRatio?: number;
}

/** Pure timing rule. Rendering of bars/labels belongs to UI. */
export class ServiceWindow {
  readonly startedAt: number;
  readonly durationMs: number;
  private readonly perfectRatio: number;
  private readonly greatRatio: number;

  constructor(startedAt: number, config: ServiceWindowConfig) {
    this.startedAt = startedAt;
    this.durationMs = Math.max(1, config.durationMs);
    this.perfectRatio = config.perfectRatio ?? 0.65;
    this.greatRatio = config.greatRatio ?? 0.3;
  }

  remainingMs(now: number): number {
    return Math.max(0, this.durationMs - Math.max(0, now - this.startedAt));
  }

  progress(now: number): number {
    return this.remainingMs(now) / this.durationMs;
  }

  resolve(now: number): ServiceRating {
    const ratio = this.progress(now);
    if (ratio <= 0) return 'late';
    if (ratio >= this.perfectRatio) return 'perfect';
    if (ratio >= this.greatRatio) return 'great';
    return 'ok';
  }
}
