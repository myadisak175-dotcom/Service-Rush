export type GameplayFeature =
  | 'seating'
  | 'menu'
  | 'take-order'
  | 'memory'
  | 'pos'
  | 'kitchen'
  | 'serving'
  | 'payment'
  | 'service-ratings'
  | 'streak';

export interface DayConfig {
  id: string;
  title: string;
  features: readonly GameplayFeature[];
  tableCount: number;
  waitingGroupLimit: number;
  kitchenCapacity: number;
  serviceWindowSeconds: number;
  recipeIds: readonly string[];
}

export interface RecipeDefinition {
  id: string;
  label: string;
  icon: string;
  cookMs: number;
  basePrice: number;
}
