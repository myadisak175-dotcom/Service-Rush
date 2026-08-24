import { campaignDays } from '../../content/campaignDays';
import type { DayConfig } from '../../content/types';
import { upgrades, type UpgradeDefinition } from '../../content/upgrades';
import type { SaveData } from '../../core/save/SaveSchema';

export interface ShiftResult {
  dayId: string;
  score: number;
  shiftCoins: number;
  stars: number;
  previousBestStars: number;
  rewardCoins: number;
  nextDayUnlocked: number;
  achievementUnlocked?: string;
}

export interface CompletionResult {
  save: SaveData;
  result: ShiftResult;
}

export interface PurchaseResult {
  save: SaveData;
  success: boolean;
  reason?: 'owned' | 'missing' | 'locked' | 'insufficient-coins';
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
  const campaign = campaignDays[config.id];
  const achievementUnlocked = campaign?.achievementId
    && stars >= (campaign.achievementStars ?? 1)
    && !current.achievements.includes(campaign.achievementId)
      ? campaign.achievementId
      : undefined;

  const save: SaveData = {
    ...current,
    coins: current.coins + rewardCoins,
    highestUnlockedDay: nextDayUnlocked,
    starsByDay: {
      ...current.starsByDay,
      [config.id]: Math.max(previousBestStars, stars),
    },
    unlockedRecipes: [...new Set([...current.unlockedRecipes, ...config.recipeIds])],
    achievements: achievementUnlocked
      ? [...current.achievements, achievementUnlocked]
      : current.achievements,
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
      achievementUnlocked,
    },
  };
}

export function purchaseUpgrade(current: SaveData, upgradeId: string): PurchaseResult {
  if (current.unlockedUpgrades.includes(upgradeId)) {
    return { save: current, success: false, reason: 'owned' };
  }

  const upgrade = upgrades.find((entry) => entry.id === upgradeId);
  if (!upgrade) return { save: current, success: false, reason: 'missing' };
  if (upgrade.unlockDay > current.highestUnlockedDay) {
    return { save: current, success: false, reason: 'locked' };
  }
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

export function shopUpgrades(save: SaveData, limit = 3): readonly UpgradeDefinition[] {
  const eligible = upgrades.filter((upgrade) => upgrade.unlockDay <= save.highestUnlockedDay);
  const owned = new Set(save.unlockedUpgrades);

  const unowned = eligible
    .filter((upgrade) => !owned.has(upgrade.id))
    .sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === 'service' ? -1 : 1;
      if (a.unlockDay !== b.unlockDay) return b.unlockDay - a.unlockDay;
      return a.cost - b.cost;
    });
  const alreadyOwned = eligible.filter((upgrade) => owned.has(upgrade.id));

  return [...unowned, ...alreadyOwned].slice(0, Math.max(1, limit));
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

export function restaurantLevel(save: SaveData): number {
  const criticBonus = save.achievements.includes('critic-approved') ? 3 : 0;
  const progressPoints = totalStars(save) + save.unlockedUpgrades.length * 2 + criticBonus;
  return 1 + Math.min(4, Math.floor(progressPoints / 6));
}

export function numberFromDayId(dayId: string): number {
  const value = Number.parseInt(dayId.replace(/\D/g, ''), 10);
  return Number.isFinite(value) && value > 0 ? value : 1;
}

export function dayIdFromNumber(day: number): string {
  return `day-${String(day).padStart(2, '0')}`;
}
