import { regularsAvailableOnDay, type RegularCustomerDefinition } from './regularCustomers';
import { numberFromDayId } from '../systems/progression/ProgressionSystem';

/**
 * Picks one familiar face per shift once regulars have been introduced.
 * The rotation is deterministic by day so replaying a day remains learnable.
 * Day 7 is reserved for the food critic event.
 */
export function regularForDay(dayId: string): RegularCustomerDefinition | undefined {
  const dayNumber = numberFromDayId(dayId);
  if (dayNumber >= 7) return undefined;
  const available = regularsAvailableOnDay(dayId);
  if (!available.length) return undefined;
  return available[(dayNumber - 3) % available.length];
}
