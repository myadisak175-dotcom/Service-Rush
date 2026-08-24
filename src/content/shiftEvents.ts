export type ShiftEventEffect =
  | { kind: 'arrival-rush'; extraWaitingGroups: number; serviceWindowDeltaSeconds: number }
  | { kind: 'kitchen-boost'; extraKitchenCapacity: number }
  | { kind: 'service-breeze'; serviceWindowBonusSeconds: number };

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
    detail: 'More guests can queue and new service windows are a little tighter.',
    firstDay: 4,
    lastDay: 6,
    startAfterMs: 18_000,
    durationMs: 16_000,
    effect: { kind: 'arrival-rush', extraWaitingGroups: 1, serviceWindowDeltaSeconds: -2 },
  },
  {
    id: 'chef-in-zone',
    icon: '⚡',
    label: 'CHEF IN THE ZONE',
    detail: 'The kitchen can handle one extra order at once.',
    firstDay: 4,
    lastDay: 6,
    startAfterMs: 24_000,
    durationMs: 16_000,
    effect: { kind: 'kitchen-boost', extraKitchenCapacity: 1 },
  },
  {
    id: 'friendly-crowd',
    icon: '💛',
    label: 'FRIENDLY CROWD',
    detail: 'Guests give you a little more time on new service windows.',
    firstDay: 5,
    lastDay: 6,
    startAfterMs: 30_000,
    durationMs: 16_000,
    effect: { kind: 'service-breeze', serviceWindowBonusSeconds: 4 },
  },
];

export function eventsAvailableOnDay(dayNumber: number): readonly ShiftEventDefinition[] {
  return shiftEvents.filter((event) =>
    event.firstDay <= dayNumber && (event.lastDay === undefined || dayNumber <= event.lastDay));
}
