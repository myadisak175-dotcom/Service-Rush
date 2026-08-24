import type { DayConfig, GameplayFeature } from '../../content/types';
import { recipes } from '../../content/recipes';
import { EventBus } from '../../core/events/EventBus';
import type { GameEventMap } from '../../core/events/GameEvents';
import { GameClock } from '../../core/time/GameClock';
import { ServiceWindow, type ServiceRating } from '../../systems/service/ServiceWindow';
import type {
  CustomerGroupView,
  DishView,
  MemoryView,
  OrderView,
  RestaurantSnapshot,
  ServiceAction,
  ServiceTimerView,
  TablePhase,
  TableView,
} from '../../domain/restaurant/RestaurantModels';

interface RuntimeGroup {
  id: string;
  size: number;
  state: 'waiting' | 'seated';
  seatWindow: ServiceWindow;
}

interface RuntimeTable {
  id: string;
  capacity: number;
  phase: TablePhase;
  groupId?: string;
  orderId?: string;
  processUntil?: number;
  service?: { action: ServiceAction; window: ServiceWindow };
}

interface RuntimeOrder {
  id: string;
  tableId: string;
  items: string[];
  status: OrderView['status'];
  memoryUntil?: number;
  cookRemainingMs?: number;
}

interface RuntimeDish {
  id: string;
  orderId: string;
  tableId: string;
  recipeId: string;
}

const MEMORY_MS = 5000;
const BROWSE_MS = 2500;
const EAT_MS = 4500;
const AUTO_CLEAR_MS = 1400;
const SPAWN_BASE_MS = 7200;

export class GameSession {
  readonly events = new EventBus<GameEventMap>();
  readonly clock = new GameClock();

  private readonly groups = new Map<string, RuntimeGroup>();
  private readonly tables = new Map<string, RuntimeTable>();
  private readonly orders = new Map<string, RuntimeOrder>();
  private readonly dishes = new Map<string, RuntimeDish>();
  private kitchenQueue: string[] = [];
  private activeKitchen = new Set<string>();
  private nextId = 1;
  private nextSpawnAt = 250;
  private revision = 0;
  private score = 0;
  private coins = 0;
  private streak = 0;

  constructor(readonly config: DayConfig) {
    this.makeTableCapacities(config.tableCount).forEach((capacity, index) => {
      const id = `T${index + 1}`;
      this.tables.set(id, { id, capacity, phase: 'empty' });
    });
  }

  update(realDeltaMs: number): void {
    const delta = this.clock.tick(realDeltaMs);
    if (delta <= 0) return;
    this.spawnIfNeeded();
    this.advanceBrowsing();
    this.advanceMemory();
    this.advanceKitchen(delta);
    this.advanceEating();
  }

  pause(): void {
    this.clock.pause();
  }

  resume(): void {
    this.clock.resume();
  }

  seatGroup(groupId: string, tableId: string): boolean {
    const group = this.groups.get(groupId);
    const table = this.tables.get(tableId);
    if (!group || !table || group.state !== 'waiting' || table.phase !== 'empty') return false;
    if (group.size > table.capacity) return false;

    group.state = 'seated';
    table.groupId = groupId;
    this.resolveWindow(tableId, 'seat', group.seatWindow);

    if (this.has('menu')) {
      table.phase = 'waiting-menu';
      table.service = this.makeService('menu');
    } else {
      table.phase = 'browsing';
      table.processUntil = this.clock.now + AUTO_CLEAR_MS;
    }

    this.events.emit('customerGroupSeated', { groupId, tableId });
    this.touch();
    return true;
  }

  deliverMenu(tableId: string): boolean {
    const table = this.tables.get(tableId);
    if (!table || table.phase !== 'waiting-menu') return false;
    this.resolveTableService(table, 'menu');
    table.phase = 'browsing';
    table.processUntil = this.clock.now + BROWSE_MS;
    this.events.emit('menuDelivered', { tableId });
    this.touch();
    return true;
  }

  takeOrder(tableId: string): readonly string[] | undefined {
    const table = this.tables.get(tableId);
    if (!table || table.phase !== 'ready-to-order') return undefined;

    this.resolveTableService(table, 'order');
    const orderId = `O${this.nextId++}`;
    const order: RuntimeOrder = {
      id: orderId,
      tableId,
      items: this.generateOrderItems(table),
      status: 'memory',
      memoryUntil: this.clock.now + MEMORY_MS,
    };
    this.orders.set(orderId, order);
    table.orderId = orderId;
    table.phase = 'memory';
    table.service = undefined;
    this.touch();
    return order.items;
  }

  submitPos(tableId: string, itemIds: readonly string[]): boolean {
    const table = this.tables.get(tableId);
    if (!table?.orderId || table.phase !== 'waiting-pos') return false;
    const order = this.orders.get(table.orderId);
    if (!order || order.status !== 'waiting-pos') return false;

    if (!sameMultiset(order.items, itemIds)) {
      this.streak = 0;
      this.touch();
      return false;
    }

    this.resolveTableService(table, 'pos');
    order.status = 'queued';
    table.phase = 'waiting-food';
    table.service = undefined;
    this.kitchenQueue.push(order.id);
    this.events.emit('orderSubmitted', { tableId, orderId: order.id });
    this.touch();
    return true;
  }

  serveDish(dishId: string, tableId: string): boolean {
    const dish = this.dishes.get(dishId);
    const table = this.tables.get(tableId);
    if (!dish || !table || table.phase !== 'ready-to-serve' || dish.tableId !== tableId) return false;
    const order = this.orders.get(dish.orderId);
    if (!order || table.orderId !== order.id) return false;

    this.dishes.delete(dishId);
    this.events.emit('foodServed', { orderId: order.id, itemId: dish.id, tableId });

    if (![...this.dishes.values()].some((entry) => entry.orderId === order.id)) {
      this.resolveTableService(table, 'serve');
      order.status = 'done';
      table.phase = 'eating';
      table.processUntil = this.clock.now + EAT_MS;
    }
    this.touch();
    return true;
  }

  collectPayment(tableId: string): number | undefined {
    const table = this.tables.get(tableId);
    if (!table || table.phase !== 'waiting-payment' || !table.orderId) return undefined;
    const order = this.orders.get(table.orderId);
    if (!order) return undefined;

    const rating = this.resolveTableService(table, 'payment');
    const base = order.items.reduce((sum, itemId) => sum + (recipes[itemId]?.basePrice ?? 0), 0);
    const multiplier = rating === 'perfect' ? 1.25 : rating === 'great' ? 1.15 : rating === 'ok' ? 1 : 0.85;
    const amount = Math.max(1, Math.round(base * multiplier));
    this.coins += amount;
    this.events.emit('paymentCollected', { tableId, amount });
    this.clearTable(table);
    this.touch();
    return amount;
  }

  getOldestPendingPosTableId(): string | undefined {
    for (const order of this.orders.values()) {
      if (order.status === 'waiting-pos') return order.tableId;
    }
    return undefined;
  }

  snapshot(): RestaurantSnapshot {
    const now = this.clock.now;
    const waitingGroups: CustomerGroupView[] = [...this.groups.values()]
      .filter((group) => group.state === 'waiting')
      .map((group) => ({
        id: group.id,
        size: group.size,
        service: this.timerView('seat', group.seatWindow, now),
      }));

    const tables: TableView[] = [...this.tables.values()].map((table) => {
      const group = table.groupId ? this.groups.get(table.groupId) : undefined;
      return {
        id: table.id,
        capacity: table.capacity,
        phase: table.phase,
        groupSize: group?.size,
        service: table.service ? this.timerView(table.service.action, table.service.window, now) : undefined,
      };
    });

    const orders: OrderView[] = [...this.orders.values()].map((order) => ({
      id: order.id,
      tableId: order.tableId,
      items: order.items,
      status: order.status,
    }));

    const dishes: DishView[] = [...this.dishes.values()].map((dish) => ({ ...dish }));

    return {
      revision: this.revision,
      now,
      score: this.score,
      coins: this.coins,
      streak: this.streak,
      waitingGroups,
      tables,
      orders,
      dishes,
      memory: this.memoryView(now),
      pendingPosTableIds: orders.filter((order) => order.status === 'waiting-pos').map((order) => order.tableId),
    };
  }

  destroy(): void {
    this.events.clear();
    this.clock.reset();
    this.groups.clear();
    this.tables.clear();
    this.orders.clear();
    this.dishes.clear();
    this.kitchenQueue = [];
    this.activeKitchen.clear();
  }

  private has(feature: GameplayFeature): boolean {
    return this.config.features.includes(feature);
  }

  private spawnIfNeeded(): void {
    if (!this.has('seating')) return;
    const waiting = [...this.groups.values()].filter((group) => group.state === 'waiting').length;
    if (waiting >= this.config.waitingGroupLimit || this.clock.now < this.nextSpawnAt) return;

    const size = 1 + Math.floor(Math.random() * 4);
    const id = `G${this.nextId++}`;
    this.groups.set(id, {
      id,
      size,
      state: 'waiting',
      seatWindow: new ServiceWindow(this.clock.now, { durationMs: this.windowMs }),
    });
    this.nextSpawnAt = this.clock.now + SPAWN_BASE_MS + Math.random() * 3200;
    this.events.emit('customerGroupSpawned', { groupId: id, size });
    this.touch();
  }

  private advanceBrowsing(): void {
    for (const table of this.tables.values()) {
      if (table.phase !== 'browsing' || table.processUntil === undefined || this.clock.now < table.processUntil) continue;
      table.processUntil = undefined;

      if (!this.has('take-order')) {
        this.clearTable(table);
      } else {
        table.phase = 'ready-to-order';
        table.service = this.makeService('order');
        this.events.emit('customerReadyToOrder', { tableId: table.id });
      }
      this.touch();
    }
  }

  private advanceMemory(): void {
    for (const order of this.orders.values()) {
      if (order.status !== 'memory' || order.memoryUntil === undefined || this.clock.now < order.memoryUntil) continue;
      const table = this.tables.get(order.tableId);
      order.memoryUntil = undefined;
      if (!table) continue;

      if (!this.has('pos')) {
        order.status = 'done';
        this.clearTable(table);
      } else {
        order.status = 'waiting-pos';
        table.phase = 'waiting-pos';
        table.service = this.makeService('pos');
      }
      this.touch();
    }
  }

  private advanceKitchen(deltaMs: number): void {
    if (!this.has('kitchen')) return;

    while (this.activeKitchen.size < this.config.kitchenCapacity && this.kitchenQueue.length > 0) {
      const orderId = this.kitchenQueue.shift();
      if (!orderId) break;
      const order = this.orders.get(orderId);
      if (!order) continue;
      order.status = 'cooking';
      order.cookRemainingMs = Math.max(...order.items.map((itemId) => recipes[itemId]?.cookMs ?? 3000));
      this.activeKitchen.add(orderId);
      this.touch();
    }

    for (const orderId of [...this.activeKitchen]) {
      const order = this.orders.get(orderId);
      if (!order || order.cookRemainingMs === undefined) {
        this.activeKitchen.delete(orderId);
        continue;
      }
      order.cookRemainingMs -= deltaMs;
      if (order.cookRemainingMs > 0) continue;

      this.activeKitchen.delete(orderId);
      order.cookRemainingMs = 0;
      const table = this.tables.get(order.tableId);

      if (!this.has('serving')) {
        order.status = 'done';
        if (table) this.clearTable(table);
        this.touch();
        continue;
      }

      order.status = 'ready';
      order.items.forEach((recipeId, index) => {
        const dishId = `D${this.nextId++}-${index}`;
        this.dishes.set(dishId, { id: dishId, orderId, tableId: order.tableId, recipeId });
        this.events.emit('foodReady', { orderId, itemId: dishId });
      });
      if (table) {
        table.phase = 'ready-to-serve';
        table.service = this.makeService('serve');
      }
      this.touch();
    }
  }

  private advanceEating(): void {
    for (const table of this.tables.values()) {
      if (table.phase !== 'eating' || table.processUntil === undefined || this.clock.now < table.processUntil) continue;
      table.processUntil = undefined;

      if (!this.has('payment')) {
        this.clearTable(table);
      } else {
        table.phase = 'waiting-payment';
        table.service = this.makeService('payment');
      }
      this.touch();
    }
  }

  private generateOrderItems(table: RuntimeTable): string[] {
    const pool = this.config.recipeIds.filter((id) => recipes[id]);
    const groupSize = table.groupId ? this.groups.get(table.groupId)?.size ?? 1 : 1;
    const itemCount = Math.max(1, Math.min(groupSize, this.config.id === 'day-02' ? 2 : 4));
    return Array.from({ length: itemCount }, () => pool[Math.floor(Math.random() * pool.length)] ?? 'ramen');
  }

  private clearTable(table: RuntimeTable): void {
    if (table.groupId) this.groups.delete(table.groupId);
    if (table.orderId) {
      const order = this.orders.get(table.orderId);
      if (order) {
        for (const [dishId, dish] of this.dishes) {
          if (dish.orderId === order.id) this.dishes.delete(dishId);
        }
        this.orders.delete(order.id);
      }
    }
    table.groupId = undefined;
    table.orderId = undefined;
    table.processUntil = undefined;
    table.service = undefined;
    table.phase = 'empty';
  }

  private resolveTableService(table: RuntimeTable, action: ServiceAction): ServiceRating {
    if (!table.service || table.service.action !== action) return 'ok';
    const rating = this.resolveWindow(table.id, action, table.service.window);
    table.service = undefined;
    return rating;
  }

  private resolveWindow(tableId: string, action: ServiceAction, window: ServiceWindow): ServiceRating {
    const rating = window.resolve(this.clock.now);
    this.score += rating === 'perfect' ? 100 : rating === 'great' ? 60 : rating === 'ok' ? 30 : 0;
    if (rating === 'perfect') this.streak += 1;
    else if (this.has('streak')) this.streak = 0;
    this.events.emit('serviceWindowResolved', { tableId, action, rating });
    return rating;
  }

  private makeService(action: ServiceAction): RuntimeTable['service'] {
    return {
      action,
      window: new ServiceWindow(this.clock.now, { durationMs: this.windowMs }),
    };
  }

  private timerView(action: ServiceAction, window: ServiceWindow, now: number): ServiceTimerView {
    return {
      action,
      remainingMs: window.remainingMs(now),
      durationMs: window.durationMs,
      rating: window.resolve(now),
    };
  }

  private memoryView(now: number): MemoryView | undefined {
    for (const order of this.orders.values()) {
      if (order.status === 'memory' && order.memoryUntil !== undefined) {
        return {
          tableId: order.tableId,
          items: order.items,
          remainingMs: Math.max(0, order.memoryUntil - now),
        };
      }
    }
    return undefined;
  }

  private get windowMs(): number {
    return this.config.serviceWindowSeconds * 1000;
  }

  private makeTableCapacities(count: number): number[] {
    if (count <= 1) return [4];
    return Array.from({ length: count }, (_, index) => index < Math.ceil(count / 2) ? 2 : 4);
  }

  private touch(): void {
    this.revision += 1;
  }
}

function sameMultiset(expected: readonly string[], actual: readonly string[]): boolean {
  if (expected.length !== actual.length) return false;
  const counts = new Map<string, number>();
  for (const item of expected) counts.set(item, (counts.get(item) ?? 0) + 1);
  for (const item of actual) {
    const count = counts.get(item) ?? 0;
    if (count <= 0) return false;
    counts.set(item, count - 1);
  }
  return [...counts.values()].every((count) => count === 0);
}
