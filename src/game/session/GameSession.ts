import type { DayConfig } from '../../content/types';
import { EventBus } from '../../core/events/EventBus';
import type { GameEventMap } from '../../core/events/GameEvents';
import { GameClock } from '../../core/time/GameClock';

/**
 * Runtime boundary for one playable day/level.
 *
 * Long-lived progression belongs outside this class. Temporary customers,
 * tables, orders, kitchen jobs and timers belong inside this session.
 */
export class GameSession {
  readonly events = new EventBus<GameEventMap>();
  readonly clock = new GameClock();

  constructor(readonly config: DayConfig) {}

  update(realDeltaMs: number): void {
    this.clock.tick(realDeltaMs);
    // Gameplay systems will be updated here as the validated prototype is ported.
  }

  pause(): void {
    this.clock.pause();
  }

  resume(): void {
    this.clock.resume();
  }

  destroy(): void {
    this.events.clear();
    this.clock.reset();
  }
}
