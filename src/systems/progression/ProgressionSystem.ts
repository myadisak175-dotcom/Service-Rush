import type { DayConfig } from '../../content/types';
import { upgrades } from '../../content/upgrades';
import type { SaveData } from '../../core/save/SaveSchema';

export interface ShiftResult {
  dayId: string;
  score: number;
  shiftCoins: number;
  stars: number;
  previousBestStars: number;
  rewardCoins: number;
  nextDayUnlocked: number;
}

export interface CompletionResult {
  save: SaveData;
  result: ShiftResult;
}

export interface PurchaseResult {
  save: SaveData;
  success: boolean;
  reason?: 'owned' | 'missing' | 'insufficient-coins';
}

export function completeShift(
  current: SaveData,
  config: DayConfig,
  score: number,
  shiftCoins: number,
): CompletionResult {
  const stars = starsForScore(config, score);
  const previousBestStars = current.starsByDay[config.id] ?? 0;
  const dayNumber = numberFromDayId(config.id);
  const rewardCoins = Math.max(45, 48 + dayNumber * 7 + Math.floor(score / 12) + shiftCoins);
  const nextDayUnlocked = Math.max(current.highestUnlockedDay, dayNumber + 1);

  const save: SaveData = {
    ...current,
    coins: current.coins + rewardCoins,
    highestUnlockedDay: nextDayUnlocked,
    starsByDay: {
      ...current.starsByDay,
      [config.id]: Math.max(previousBestStars, stars),
    },
    unlockedRecipes: [...new Set([...current.unlockedRecipes, ...config.recipeIds])],
  };

  return {
    save,
    result: {
      dayId: config.id,
      score,
      shiftCoins,
      stars,
      previousBestStars,
      rewardCoins,
      nextDayUnlocked,
    },
  };
}

export function purchaseUpgrade(current: SaveData, upgradeId: string): PurchaseResult {
  if (current.unlockedUpgrades.includes(upgradeId)) {
    return { save: current, success: false, reason: 'owned' };
  }

  const upgrade = upgrades.find((entry) => entry.id === upgradeId);
  if (!upgrade) return { save: current, success: false, reason: 'missing' };
  if (current.coins < upgrade.cost) {
    return { save: current, success: false, reason: 'insufficient-coins' };
  }

  return {
    success: true,
    save: {
      ...current,
      coins: current.coins - upgrade.cost,
      unlockedUpgrades: [...current.unlockedUpgrades, upgrade.id],
    },
  };
}

export function starsForScore(config: DayConfig, score: number): number {
  const [one, two, three] = config.starThresholds;
  if (score >= three) return 3;
  if (score >= two) return 2;
  if (score >= one) return 1;
  return 0;
}

export function totalStars(save: SaveData): number {
  return Object.values(save.starsByDay).reduce((sum, value) => sum + value, 0);
}

export function numberFromDayId(dayId: string): number {
  const value = Number.parseInt(dayId.replace(/\D/g, ''), 10);
  return Number.isFinite(value) && value > 0 ? value : 1;
}

export function dayIdFromNumber(day: number): string {
  return `day-${String(day).padStart(2, '0')}`;
}
