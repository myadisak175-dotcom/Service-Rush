const MAX_FRAME_DELTA_MS = 250;

/** Single authoritative gameplay clock. No gameplay system owns its own wall-clock timer. */
export class GameClock {
  private elapsedMs = 0;
  private paused = false;

  get now(): number {
    return this.elapsedMs;
  }

  get isPaused(): boolean {
    return this.paused;
  }

  tick(realDeltaMs: number): number {
    if (this.paused) return 0;

    const delta = Math.max(0, Math.min(realDeltaMs, MAX_FRAME_DELTA_MS));
    this.elapsedMs += delta;
    return delta;
  }

  pause(): void {
    this.paused = true;
  }

  resume(): void {
    this.paused = false;
  }

  reset(): void {
    this.elapsedMs = 0;
    this.paused = false;
  }
}
