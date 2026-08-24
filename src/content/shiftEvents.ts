export type ShiftEventEffect =
  | { kind: 'arrival-rush'; spawnIntervalMultiplier: number; extraWaitingGroups: number }
  | { kind: 'kitchen-boost'; kitchenSpeedMultiplier: number }
  | { kind: 'happy-hour'; paymentMultiplier: number };

export interface ShiftEventDefinition {
  id: string;
  icon: string;
  label: string;
  detail: string;
  firstDay: number;
  lastDay?: number;
  startAfterMs: number;
  durationMs: number;
  effect: ShiftEventEffect;
}

/** One lightweight surprise per eligible shift keeps repetition down without stacking chaos. */
export const shiftEvents: readonly ShiftEventDefinition[] = [
  {
    id: 'rain-rush',
    icon: '🌧️',
    label: 'RAIN RUSH',
    detail: 'Walk-ins arrive faster for a moment.',
    firstDay: 4,
    lastDay: 6,
    startAfterMs: 18_000,
    durationMs: 14_000,
    effect: { kind: 'arrival-rush', spawnIntervalMultiplier: 0.52, extraWaitingGroups: 1 },
  },
  {
    id: 'chef-in-zone',
    icon: '⚡',
    label: 'CHEF IN THE ZONE',
    detail: 'The kitchen cooks faster for a short burst.',
    firstDay: 4,
    lastDay: 6,
    startAfterMs: 24_000,
    durationMs: 14_000,
    effect: { kind: 'kitchen-boost', kitchenSpeedMultiplier: 1.65 },
  },
  {
    id: 'happy-hour',
    icon: '🪙',
    label: 'HAPPY HOUR',
    detail: 'Payments collected now earn a bigger tip.',
    firstDay: 5,
    lastDay: 6,
    startAfterMs: 30_000,
    durationMs: 15_000,
    effect: { kind: 'happy-hour', paymentMultiplier: 1.35 },
  },
];

export function eventsAvailableOnDay(dayNumber: number): readonly ShiftEventDefinition[] {
  return shiftEvents.filter((event) =>
    event.firstDay <= dayNumber && (event.lastDay === undefined || dayNumber <= event.lastDay));
}
