export type UpgradeKind = 'decor' | 'service';

export interface UpgradeEffect {
  serviceWindowSeconds?: number;
  kitchenCapacity?: number;
  waitingGroupLimit?: number;
}

export interface UpgradeDefinition {
  id: string;
  title: string;
  description: string;
  icon: string;
  cost: number;
  kind: UpgradeKind;
  unlockDay: number;
  benefitLabel?: string;
  effect?: UpgradeEffect;
}

/**
 * Upgrades never automate the memory/POS/serving loop. Service upgrades only
 * create a little more breathing room or throughput while the player still
 * performs every core action themselves.
 */
export const upgrades: readonly UpgradeDefinition[] = [
  {
    id: 'window-plants',
    title: 'Window Plants',
    description: 'Add leafy plants around the dining room.',
    icon: '🪴',
    cost: 70,
    kind: 'decor',
    unlockDay: 1,
  },
  {
    id: 'warm-lights',
    title: 'Warm Lights',
    description: 'Give the restaurant a warmer evening glow.',
    icon: '✨',
    cost: 95,
    kind: 'decor',
    unlockDay: 1,
  },
  {
    id: 'chef-board',
    title: 'Chef Board',
    description: 'Put today’s specials proudly on display.',
    icon: '📋',
    cost: 120,
    kind: 'decor',
    unlockDay: 2,
  },
  {
    id: 'service-training',
    title: 'Service Training',
    description: 'A calmer routine gives every service action a little more time.',
    icon: '🧑‍🍳',
    cost: 145,
    kind: 'service',
    unlockDay: 3,
    benefitLabel: '+3s service windows',
    effect: { serviceWindowSeconds: 3 },
  },
  {
    id: 'prep-station',
    title: 'Prep Station',
    description: 'A better prep line lets the kitchen work on one more order at once.',
    icon: '🔪',
    cost: 175,
    kind: 'service',
    unlockDay: 4,
    benefitLabel: '+1 kitchen capacity',
    effect: { kitchenCapacity: 1 },
  },
  {
    id: 'waiting-bench',
    title: 'Waiting Bench',
    description: 'More guests can wait inside instead of walking past a busy restaurant.',
    icon: '🛋️',
    cost: 205,
    kind: 'service',
    unlockDay: 5,
    benefitLabel: '+1 waiting group',
    effect: { waitingGroupLimit: 1 },
  },
];

export function getUpgrade(id: string): UpgradeDefinition | undefined {
  return upgrades.find((upgrade) => upgrade.id === id);
}
