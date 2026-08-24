import type { ServiceRating } from '../../systems/service/ServiceWindow';

export type TablePhase =
  | 'empty'
  | 'waiting-menu'
  | 'browsing'
  | 'ready-to-order'
  | 'memory'
  | 'waiting-pos'
  | 'waiting-food'
  | 'ready-to-serve'
  | 'eating'
  | 'waiting-payment';

export type ServiceAction = 'seat' | 'menu' | 'order' | 'pos' | 'serve' | 'payment';

export interface ServiceTimerView {
  action: ServiceAction;
  remainingMs: number;
  durationMs: number;
  rating: ServiceRating;
}

export interface CustomerGroupView {
  id: string;
  size: number;
  service: ServiceTimerView;
}

export interface TableView {
  id: string;
  capacity: number;
  phase: TablePhase;
  groupSize?: number;
  service?: ServiceTimerView;
}

export interface OrderView {
  id: string;
  tableId: string;
  items: readonly string[];
  status: 'memory' | 'waiting-pos' | 'queued' | 'cooking' | 'ready' | 'done';
}

export interface DishView {
  id: string;
  orderId: string;
  tableId: string;
  recipeId: string;
}

export interface MemoryView {
  tableId: string;
  items: readonly string[];
  remainingMs: number;
}

export interface RestaurantSnapshot {
  revision: number;
  now: number;
  score: number;
  coins: number;
  streak: number;
  waitingGroups: readonly CustomerGroupView[];
  tables: readonly TableView[];
  orders: readonly OrderView[];
  dishes: readonly DishView[];
  memory?: MemoryView;
  pendingPosTableIds: readonly string[];
}
