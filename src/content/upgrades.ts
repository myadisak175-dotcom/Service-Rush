export interface UpgradeDefinition {
  id: string;
  title: string;
  description: string;
  icon: string;
  cost: number;
}

/**
 * The first upgrade set focuses on ownership: purchases visibly change the hub.
 * Mechanical upgrades can be added later without changing save/progression flow.
 */
export const upgrades: readonly UpgradeDefinition[] = [
  {
    id: 'window-plants',
    title: 'Window Plants',
    description: 'Add leafy plants around the dining room.',
    icon: '🪴',
    cost: 70,
  },
  {
    id: 'warm-lights',
    title: 'Warm Lights',
    description: 'Give the restaurant a warmer evening glow.',
    icon: '✨',
    cost: 95,
  },
  {
    id: 'chef-board',
    title: 'Chef Board',
    description: 'Put today’s specials proudly on display.',
    icon: '📋',
    cost: 120,
  },
];

export function getUpgrade(id: string): UpgradeDefinition | undefined {
  return upgrades.find((upgrade) => upgrade.id === id);
}
