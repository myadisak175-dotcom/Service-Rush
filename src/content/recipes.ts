import type { RecipeDefinition } from './types';

export const recipes: Readonly<Record<string, RecipeDefinition>> = {
  ramen: {
    id: 'ramen',
    label: 'Ramen',
    icon: '🍜',
    cookMs: 5000,
    basePrice: 120,
  },
  tea: {
    id: 'tea',
    label: 'Tea',
    icon: '🍵',
    cookMs: 3000,
    basePrice: 55,
  },
  gyoza: {
    id: 'gyoza',
    label: 'Gyoza',
    icon: '🥟',
    cookMs: 4000,
    basePrice: 80,
  },
};
