import { numberFromDayId } from '../systems/progression/ProgressionSystem';

export interface RegularCustomerDefinition {
  id: string;
  name: string;
  icon: string;
  firstDay: number;
  groupSize: number;
  favoriteRecipeId: string;
  scoreBonus: number;
  coinBonus: number;
  line: string;
}

/**
 * Regulars are recurring faces, not a second customer simulation.
 * Their mechanical differences stay intentionally small so the service loop remains readable.
 */
export const regularCustomers: readonly RegularCustomerDefinition[] = [
  {
    id: 'mina',
    name: 'Mina',
    icon: '🌿',
    firstDay: 3,
    groupSize: 1,
    favoriteRecipeId: 'tea',
    scoreBonus: 60,
    coinBonus: 12,
    line: 'The tea regular. She always notices when service is smooth.',
  },
  {
    id: 'kai',
    name: 'Kai',
    icon: '🥟',
    firstDay: 5,
    groupSize: 2,
    favoriteRecipeId: 'gyoza',
    scoreBonus: 80,
    coinBonus: 18,
    line: 'Drops in after work and usually brings a friend.',
  },
];

export function getRegularCustomer(id: string): RegularCustomerDefinition | undefined {
  return regularCustomers.find((customer) => customer.id === id);
}

export function regularsAvailableOnDay(dayId: string): readonly RegularCustomerDefinition[] {
  const dayNumber = numberFromDayId(dayId);
  return regularCustomers.filter((customer) => customer.firstDay <= dayNumber);
}

export function regularsKnownByProgress(highestUnlockedDay: number): readonly RegularCustomerDefinition[] {
  return regularCustomers.filter((customer) => customer.firstDay < highestUnlockedDay);
}
