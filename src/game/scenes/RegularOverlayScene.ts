import Phaser from 'phaser';
import { regularForDay } from '../../content/regularCustomerSchedule';
import type { RegularCustomerDefinition } from '../../content/regularCustomers';
import type { RestaurantSnapshot } from '../../domain/restaurant/RestaurantModels';
import type { GameSession } from '../session/GameSession';

interface RegularOverlayData {
  dayId?: string;
}

interface RestaurantSceneRuntime {
  session?: GameSession;
}

export interface RegularVisitBonus {
  score: number;
  coins: number;
  name?: string;
  icon?: string;
  completed: boolean;
}

const ASSIGN_AFTER_MS = 7_000;
const FALLBACK_ASSIGN_AFTER_MS = 14_000;

export class RegularOverlayScene extends Phaser.Scene {
  private regular?: RegularCustomerDefinition;
  private groupId?: string;
  private tableId?: string;
  private sawSeatedPhase = false;
  private completed = false;
  private subscribed = false;
  private badge?: any;
  private toast?: any;
  private toastUntil = 0;

  constructor() {
    super('regular-overlay');
  }

  create(data: RegularOverlayData): void {
    this.regular = regularForDay(data.dayId ?? 'day-01');
    this.groupId = undefined;
    this.tableId = undefined;
    this.sawSeatedPhase = false;
    this.completed = false;
    this.subscribed = false;

    this.badge = this.add.text(0, 0, '', {
      fontFamily: 'system-ui',
      fontSize: '14px',
      fontStyle: 'bold',
      color: '#3f3029',
      backgroundColor: '#f7e3b6',
      padding: { x: 10, y: 5 },
      align: 'center',
    }).setOrigin(0.5).setDepth(2500).setVisible(false);

    this.toast = this.add.text(360, 930, '', {
      fontFamily: 'system-ui',
      fontSize: '18px',
      fontStyle: 'bold',
      color: '#fff8ed',
      backgroundColor: '#6b5145',
      padding: { x: 18, y: 11 },
      align: 'center',
    }).setOrigin(0.5).setDepth(2600).setVisible(false);
  }

  update(): void {
    if (!this.regular) return;
    const session = this.getRestaurantSession();
    if (!session) return;
    if (!this.subscribed) this.subscribe(session);

    const snapshot = session.snapshot();
    if (!this.groupId) this.tryAssign(snapshot);
    this.syncBadge(snapshot);
    this.checkCompletion(snapshot);

    if (this.toast?.visible && session.clock.now >= this.toastUntil) this.toast.setVisible(false);
  }

  getBonuses(): RegularVisitBonus {
    return {
      score: this.completed ? this.regular?.scoreBonus ?? 0 : 0,
      coins: this.completed ? this.regular?.coinBonus ?? 0 : 0,
      name: this.regular?.name,
      icon: this.regular?.icon,
      completed: this.completed,
    };
  }

  private subscribe(session: GameSession): void {
    this.subscribed = true;
    session.events.on('customerGroupSeated', ({ groupId, tableId }) => {
      if (groupId !== this.groupId) return;
      this.tableId = tableId;
      this.sawSeatedPhase = true;
      this.showToast(`${this.regular?.icon ?? '★'} ${this.regular?.name ?? 'Regular'} is back!`, session.clock.now);
    });
    session.events.on('paymentCollected', ({ tableId }) => {
      if (tableId === this.tableId) this.completeVisit(session.clock.now);
    });
  }

  private tryAssign(snapshot: RestaurantSnapshot): void {
    if (!this.regular || snapshot.now < ASSIGN_AFTER_MS || !snapshot.waitingGroups.length) return;
    const matching = snapshot.waitingGroups.find((group) => group.size === this.regular?.groupSize);
    const candidate = matching ?? (snapshot.now >= FALLBACK_ASSIGN_AFTER_MS ? snapshot.waitingGroups[0] : undefined);
    if (!candidate) return;
    this.groupId = candidate.id;
    this.showToast(`${this.regular.icon} Familiar face: ${this.regular.name}`, snapshot.now);
  }

  private syncBadge(snapshot: RestaurantSnapshot): void {
    if (!this.regular || !this.groupId || this.completed) {
      this.badge?.setVisible(false);
      return;
    }

    const waitingIndex = snapshot.waitingGroups.findIndex((group) => group.id === this.groupId);
    if (waitingIndex >= 0) {
      this.badge?.setText(`${this.regular.icon} ${this.regular.name}\nREGULAR`)
        .setPosition(140 + waitingIndex * 190, 1080)
        .setVisible(true);
      return;
    }

    if (!this.tableId) {
      this.badge?.setVisible(false);
      return;
    }
    const tableIndex = snapshot.tables.findIndex((table) => table.id === this.tableId);
    if (tableIndex < 0) {
      this.badge?.setVisible(false);
      return;
    }
    const position = this.tablePosition(snapshot.tables.length, tableIndex);
    this.badge?.setText(`${this.regular.icon} ${this.regular.name}`)
      .setPosition(position.x, position.y - 92)
      .setVisible(true);
  }

  private checkCompletion(snapshot: RestaurantSnapshot): void {
    if (!this.tableId || this.completed) return;
    const table = snapshot.tables.find((entry) => entry.id === this.tableId);
    if (!table) return;
    if (table.phase !== 'empty') {
      this.sawSeatedPhase = true;
      return;
    }
    if (this.sawSeatedPhase) this.completeVisit(snapshot.now);
  }

  private completeVisit(now: number): void {
    if (this.completed || !this.regular) return;
    this.completed = true;
    this.badge?.setVisible(false);
    this.showToast(
      `${this.regular.icon} ${this.regular.name} loved the visit!  +${this.regular.scoreBonus} score  +${this.regular.coinBonus} coins`,
      now,
      5_000,
    );
  }

  private showToast(message: string, now: number, durationMs = 3_200): void {
    this.toastUntil = now + durationMs;
    this.toast?.setText(message).setVisible(true);
  }

  private tablePosition(count: number, index: number): { x: number; y: number } {
    const positions = count <= 2
      ? [{ x: 210, y: 520 }, { x: 510, y: 520 }]
      : count === 3
        ? [{ x: 210, y: 500 }, { x: 510, y: 500 }, { x: 360, y: 720 }]
        : [{ x: 210, y: 500 }, { x: 510, y: 500 }, { x: 210, y: 720 }, { x: 510, y: 720 }];
    return positions[index] ?? { x: 360, y: 500 + index * 170 };
  }

  private getRestaurantSession(): GameSession | undefined {
    if (!this.scene.isActive('restaurant')) return undefined;
    const restaurant = this.scene.get('restaurant') as unknown as RestaurantSceneRuntime;
    return restaurant.session;
  }
}
