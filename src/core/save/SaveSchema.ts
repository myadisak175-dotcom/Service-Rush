export const SAVE_VERSION = 1;

export interface SaveData {
  saveVersion: number;
  highestUnlockedDay: number;
  coins: number;
  starsByDay: Record<string, number>;
  unlockedRecipes: string[];
  unlockedUpgrades: string[];
  achievements: string[];
}

export function createDefaultSave(): SaveData {
  return {
    saveVersion: SAVE_VERSION,
    highestUnlockedDay: 1,
    coins: 0,
    starsByDay: {},
    unlockedRecipes: ['ramen', 'tea'],
    unlockedUpgrades: [],
    achievements: [],
  };
}
