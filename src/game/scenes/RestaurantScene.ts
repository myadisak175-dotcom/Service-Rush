import Phaser from 'phaser';
import { dayConfigs } from '../../content/dayConfigs';
import { recipes } from '../../content/recipes';
import type { RestaurantSnapshot, TableView } from '../../domain/restaurant/RestaurantModels';
import { GameSession } from '../session/GameSession';

interface RestaurantSceneData {
  dayId?: string;
}

interface TableVisual {
  x: number;
  y: number;
  width: number;
  height: number;
  box: any;
  state: any;
  timer: any;
}

const TABLE_W = 250;
const TABLE_H = 150;

export class RestaurantScene extends Phaser.Scene {
  private session?: GameSession;
  private tableVisuals = new Map<string, TableVisual>();
  private groupObjects = new Map<string, any>();
  private dishObjects = new Map<string, any>();
  private hud?: any;
  private pauseButton?: any;
  private memoryLayer?: any;
  private memoryText?: any;
  private posLayer?: any;
  private posTicket?: any;
  private posStatus?: any;
  private posTarget?: string;
  private posItems: string[] = [];
  private currentDayId = 'day-01';
  private menuDrag?: any;
  private readonly menuOrigin = { x: 92, y: 1020 };

  constructor() {
    super('restaurant');
  }

  create(data: RestaurantSceneData): void {
    const config = dayConfigs[data.dayId ?? 'day-01'] ?? dayConfigs['day-01'];
    this.currentDayId = config.id;
    this.session = new GameSession(config);
    this.cameras.main.setBackgroundColor('#f5eadc');

    this.drawRestaurantShell();
    this.createTables(config.tableCount);
    this.createMenuDrag();
    this.createServiceCounter();
    this.createMemoryLayer();
    this.createPosLayer();
    this.createDayButtons();

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.session?.destroy();
      this.session = undefined;
      this.groupObjects.clear();
      this.dishObjects.clear();
      this.tableVisuals.clear();
    });
  }

  update(_time: number, delta: number): void {
    if (!this.session) return;
    this.session.update(delta);
    const snapshot = this.session.snapshot();
    this.syncHud(snapshot);
    this.syncTables(snapshot);
    this.syncWaitingGroups(snapshot);
    this.syncDishes(snapshot);
    this.syncMemory(snapshot);
    this.syncPosState(snapshot);
  }

  private drawRestaurantShell(): void {
    this.add.rectangle(360, 70, 720, 140, 0x3d2f2a);
    this.add.text(28, 24, 'SERVICE RUSH', {
      fontFamily: 'system-ui',
      fontSize: '32px',
      fontStyle: 'bold',
      color: '#fff5e8',
    });
    this.hud = this.add.text(28, 76, '', {
      fontFamily: 'system-ui',
      fontSize: '20px',
      color: '#f8d9ad',
    });

    this.pauseButton = this.add.text(634, 32, '⏸', {
      fontFamily: 'system-ui',
      fontSize: '34px',
      backgroundColor: '#675048',
      padding: { x: 10, y: 7 },
    }).setInteractive({ useHandCursor: true }).on('pointerup', () => {
      if (!this.session) return;
      if (this.session.clock.isPaused) {
        this.session.resume();
        this.pauseButton.setText('⏸');
      } else {
        this.session.pause();
        this.pauseButton.setText('▶');
      }
    });

    this.add.rectangle(360, 230, 660, 150, 0xd9b98c).setStrokeStyle(4, 0x8c6749);
    this.add.text(58, 171, 'KITCHEN + PICKUP', {
      fontFamily: 'system-ui',
      fontSize: '24px',
      fontStyle: 'bold',
      color: '#49362c',
    });
    this.add.text(58, 218, 'อาหารที่พร้อมจะออกตรงนี้ → ลากไปโต๊ะ', {
      fontFamily: 'system-ui',
      fontSize: '18px',
      color: '#6e5445',
    });

    this.add.rectangle(360, 1125, 660, 150, 0xe4c7a3).setStrokeStyle(4, 0x8c6749);
    this.add.text(58, 1065, 'WAITING AREA', {
      fontFamily: 'system-ui',
      fontSize: '22px',
      fontStyle: 'bold',
      color: '#49362c',
    });
  }

  private createTables(count: number): void {
    const positions = count <= 2
      ? [{ x: 210, y: 520 }, { x: 510, y: 520 }]
      : count === 3
        ? [{ x: 210, y: 500 }, { x: 510, y: 500 }, { x: 360, y: 720 }]
        : [{ x: 210, y: 500 }, { x: 510, y: 500 }, { x: 210, y: 720 }, { x: 510, y: 720 }];

    this.session!.snapshot().tables.forEach((table, index) => {
      const position = positions[index] ?? { x: 360, y: 500 + index * 170 };
      const box = this.add.rectangle(position.x, position.y, TABLE_W, TABLE_H, 0xfffbf5)
        .setStrokeStyle(4, 0x9a765c)
        .setInteractive({ useHandCursor: true });
      this.add.text(position.x, position.y - 52, `${table.id} · ${table.capacity} seats`, {
        fontFamily: 'system-ui',
        fontSize: '20px',
        fontStyle: 'bold',
        color: '#49362c',
      }).setOrigin(0.5);
      const state = this.add.text(position.x, position.y - 4, 'EMPTY', {
        fontFamily: 'system-ui',
        fontSize: '21px',
        color: '#6b5548',
        align: 'center',
      }).setOrigin(0.5);
      const timer = this.add.text(position.x, position.y + 48, '', {
        fontFamily: 'system-ui',
        fontSize: '17px',
        color: '#9a4e42',
      }).setOrigin(0.5);
      box.on('pointerup', () => this.onTableTap(table.id));
      this.tableVisuals.set(table.id, {
        x: position.x,
        y: position.y,
        width: TABLE_W,
        height: TABLE_H,
        box,
        state,
        timer,
      });
    });
  }

  private createMenuDrag(): void {
    this.menuDrag = this.add.text(this.menuOrigin.x, this.menuOrigin.y, '📖\nMENU', {
      fontFamily: 'system-ui',
      fontSize: '28px',
      align: 'center',
      color: '#3f3029',
      backgroundColor: '#fff8e8',
      padding: { x: 18, y: 10 },
    }).setOrigin(0.5).setInteractive({ draggable: true, useHandCursor: true });
    this.input.setDraggable(this.menuDrag);
    this.menuDrag.on('drag', (_pointer: any, x: number, y: number) => {
      this.menuDrag.setPosition(x, y).setDepth(200);
    });
    this.menuDrag.on('dragend', (pointer: any) => {
      const tableId = this.findTableAt(pointer.x, pointer.y);
      if (tableId) this.session?.deliverMenu(tableId);
      this.menuDrag.setPosition(this.menuOrigin.x, this.menuOrigin.y).setDepth(1);
    });
  }

  private createServiceCounter(): void {
    this.add.text(590, 1020, '🛎️\nPOS', {
      fontFamily: 'system-ui',
      fontSize: '28px',
      align: 'center',
      color: '#fff',
      backgroundColor: '#76513f',
      padding: { x: 22, y: 10 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).on('pointerup', () => this.openPos());
  }

  private createMemoryLayer(): void {
    const background = this.add.rectangle(360, 630, 560, 390, 0x30241f, 0.96).setStrokeStyle(5, 0xf5d6a8);
    this.memoryText = this.add.text(360, 630, '', {
      fontFamily: 'system-ui',
      fontSize: '34px',
      color: '#fff6e8',
      align: 'center',
      lineSpacing: 14,
    }).setOrigin(0.5);
    this.memoryLayer = this.add.container(0, 0, [background, this.memoryText]).setDepth(500).setVisible(false);
  }

  private createPosLayer(): void {
    const background = this.add.rectangle(360, 650, 640, 650, 0x2d241f, 0.98).setStrokeStyle(5, 0xf2d1a0);
    const title = this.add.text(360, 385, 'SERVICE COUNTER', {
      fontFamily: 'system-ui',
      fontSize: '30px',
      fontStyle: 'bold',
      color: '#fff3df',
    }).setOrigin(0.5);
    this.posTicket = this.add.text(360, 445, '', {
      fontFamily: 'system-ui',
      fontSize: '25px',
      color: '#f8d8aa',
      align: 'center',
      wordWrap: { width: 560 },
    }).setOrigin(0.5);
    this.posStatus = this.add.text(360, 505, '', {
      fontFamily: 'system-ui',
      fontSize: '19px',
      color: '#ffb9a8',
    }).setOrigin(0.5);
    const children: any[] = [background, title, this.posTicket, this.posStatus];

    this.session!.config.recipeIds.forEach((recipeId, index) => {
      const recipe = recipes[recipeId];
      if (!recipe) return;
      const x = 190 + index * 170;
      const button = this.add.text(x, 620, `${recipe.icon}\n${recipe.label}`, {
        fontFamily: 'system-ui',
        fontSize: '28px',
        align: 'center',
        color: '#3b2d27',
        backgroundColor: '#fff5df',
        padding: { x: 18, y: 14 },
      }).setOrigin(0.5).setInteractive({ useHandCursor: true }).on('pointerup', () => {
        this.posItems.push(recipeId);
        this.refreshPosTicket();
      });
      children.push(button);
    });

    const undo = this.add.text(170, 780, 'UNDO', {
      fontFamily: 'system-ui',
      fontSize: '20px',
      color: '#fff',
      backgroundColor: '#65524a',
      padding: { x: 18, y: 12 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).on('pointerup', () => {
      this.posItems.pop();
      this.refreshPosTicket();
    });
    const clear = this.add.text(360, 780, 'CLEAR', {
      fontFamily: 'system-ui',
      fontSize: '20px',
      color: '#fff',
      backgroundColor: '#65524a',
      padding: { x: 18, y: 12 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).on('pointerup', () => {
      this.posItems = [];
      this.refreshPosTicket();
    });
    const send = this.add.text(550, 780, 'SEND', {
      fontFamily: 'system-ui',
      fontSize: '22px',
      fontStyle: 'bold',
      color: '#fff',
      backgroundColor: '#9a6046',
      padding: { x: 22, y: 12 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).on('pointerup', () => this.sendPos());
    const close = this.add.text(360, 875, 'CLOSE', {
      fontFamily: 'system-ui',
      fontSize: '18px',
      color: '#d9c0ae',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).on('pointerup', () => this.closePos());
    children.push(undo, clear, send, close);
    this.posLayer = this.add.container(0, 0, children).setDepth(600).setVisible(false);
  }

  private createDayButtons(): void {
    this.add.text(350, 1178, 'DEV DAYS', {
      fontFamily: 'system-ui',
      fontSize: '14px',
      color: '#765a49',
    }).setOrigin(0.5);
    Object.keys(dayConfigs).slice(0, 6).forEach((dayId, index) => {
      const label = dayId.slice(-2);
      const x = 250 + index * 42;
      this.add.text(x, 1212, label, {
        fontFamily: 'system-ui',
        fontSize: '15px',
        color: dayId === this.currentDayId ? '#fff' : '#5d493e',
        backgroundColor: dayId === this.currentDayId ? '#8e5d44' : '#f7e2c6',
        padding: { x: 8, y: 6 },
      }).setOrigin(0.5).setInteractive({ useHandCursor: true }).on('pointerup', () => this.scene.restart({ dayId }));
    });
  }

  private onTableTap(tableId: string): void {
    if (!this.session) return;
    const table = this.session.snapshot().tables.find((entry) => entry.id === tableId);
    if (!table) return;
    if (table.phase === 'ready-to-order') this.session.takeOrder(tableId);
    else if (table.phase === 'waiting-payment') this.session.collectPayment(tableId);
  }

  private syncHud(snapshot: RestaurantSnapshot): void {
    const streak = this.session!.config.features.includes('streak') ? `   🔥 ${snapshot.streak}` : '';
    this.hud?.setText(`${this.session!.config.title}   Score ${snapshot.score}   💰 ${snapshot.coins}${streak}`);
  }

  private syncTables(snapshot: RestaurantSnapshot): void {
    for (const table of snapshot.tables) {
      const visual = this.tableVisuals.get(table.id);
      if (!visual) continue;
      visual.state.setText(this.tableStateLabel(table));
      const urgent = table.service && table.service.remainingMs <= table.service.durationMs * 0.3;
      visual.timer.setColor(urgent ? '#b23d32' : '#8a664e');
      visual.timer.setText(table.service
        ? `${table.service.action.toUpperCase()}  ${Math.ceil(table.service.remainingMs / 1000)}s  · ${table.service.rating.toUpperCase()}`
        : '');
      visual.box.setFillStyle(
        table.phase === 'empty' ? 0xfffbf5
          : table.phase === 'ready-to-order' ? 0xffefd1
            : table.phase === 'ready-to-serve' ? 0xe5f4df
              : table.phase === 'waiting-payment' ? 0xffe6b8
                : 0xf8eee3,
      );
    }
  }

  private syncWaitingGroups(snapshot: RestaurantSnapshot): void {
    const ids = new Set(snapshot.waitingGroups.map((group) => group.id));
    for (const [id, object] of this.groupObjects) {
      if (!ids.has(id)) {
        object.destroy();
        this.groupObjects.delete(id);
      }
    }

    snapshot.waitingGroups.forEach((group, index) => {
      let object = this.groupObjects.get(group.id);
      const homeX = 140 + index * 190;
      const homeY = 1135;
      if (!object) {
        object = this.add.text(homeX, homeY, `${'👤'.repeat(group.size)}\n${group.id} · ${group.size}`, {
          fontFamily: 'system-ui',
          fontSize: '23px',
          align: 'center',
          color: '#49362c',
          backgroundColor: '#fff7e9',
          padding: { x: 12, y: 8 },
        }).setOrigin(0.5).setInteractive({ draggable: true, useHandCursor: true });
        object.setData('homeX', homeX);
        object.setData('homeY', homeY);
        object.setData('groupId', group.id);
        this.input.setDraggable(object);
        object.on('drag', (_pointer: any, x: number, y: number) => object.setPosition(x, y).setDepth(200));
        object.on('dragend', (pointer: any) => {
          const tableId = this.findTableAt(pointer.x, pointer.y);
          const ok = tableId ? this.session?.seatGroup(object.getData('groupId'), tableId) : false;
          if (!ok) object.setPosition(object.getData('homeX'), object.getData('homeY'));
          object.setDepth(1);
        });
        this.groupObjects.set(group.id, object);
      } else if (!object.input?.dragState) {
        object.setData('homeX', homeX);
        object.setData('homeY', homeY);
        object.setPosition(homeX, homeY);
      }
    });
  }

  private syncDishes(snapshot: RestaurantSnapshot): void {
    const ids = new Set(snapshot.dishes.map((dish) => dish.id));
    for (const [id, object] of this.dishObjects) {
      if (!ids.has(id)) {
        object.destroy();
        this.dishObjects.delete(id);
      }
    }

    snapshot.dishes.forEach((dish, index) => {
      let object = this.dishObjects.get(dish.id);
      const homeX = 330 + (index % 5) * 70;
      const homeY = 265 + Math.floor(index / 5) * 58;
      if (!object) {
        const recipe = recipes[dish.recipeId];
        object = this.add.text(homeX, homeY, recipe?.icon ?? '🍽️', {
          fontFamily: 'system-ui',
          fontSize: '38px',
          backgroundColor: '#fff8ea',
          padding: { x: 8, y: 5 },
        }).setOrigin(0.5).setInteractive({ draggable: true, useHandCursor: true });
        object.setData('homeX', homeX);
        object.setData('homeY', homeY);
        object.setData('dishId', dish.id);
        this.input.setDraggable(object);
        object.on('drag', (_pointer: any, x: number, y: number) => object.setPosition(x, y).setDepth(250));
        object.on('dragend', (pointer: any) => {
          const tableId = this.findTableAt(pointer.x, pointer.y);
          const ok = tableId ? this.session?.serveDish(object.getData('dishId'), tableId) : false;
          if (!ok) object.setPosition(object.getData('homeX'), object.getData('homeY'));
          object.setDepth(1);
        });
        this.dishObjects.set(dish.id, object);
      } else if (!object.input?.dragState) {
        object.setData('homeX', homeX);
        object.setData('homeY', homeY);
        object.setPosition(homeX, homeY);
      }
    });
  }

  private syncMemory(snapshot: RestaurantSnapshot): void {
    const memory = snapshot.memory;
    if (!memory) {
      this.memoryLayer?.setVisible(false);
      return;
    }
    this.memoryText?.setText(
      `TABLE ${memory.tableId}\n\n${this.countIcons(memory.items)}\n\nจำออเดอร์ไว้!\n${Math.ceil(memory.remainingMs / 1000)}`,
    );
    this.memoryLayer?.setVisible(true);
  }

  private syncPosState(snapshot: RestaurantSnapshot): void {
    if (this.posTarget && !snapshot.pendingPosTableIds.includes(this.posTarget)) this.closePos();
  }

  private openPos(): void {
    const tableId = this.session?.getOldestPendingPosTableId();
    if (!tableId) {
      this.posStatus?.setText('ยังไม่มีโต๊ะรอส่งออเดอร์');
      return;
    }
    this.posTarget = tableId;
    this.posItems = [];
    this.posStatus?.setText('');
    this.refreshPosTicket();
    this.posLayer?.setVisible(true);
  }

  private sendPos(): void {
    if (!this.session || !this.posTarget) return;
    if (this.session.submitPos(this.posTarget, this.posItems)) {
      this.closePos();
    } else {
      this.posStatus?.setText('ออเดอร์ไม่ตรง — แก้ ticket แล้วลองใหม่');
    }
  }

  private closePos(): void {
    this.posLayer?.setVisible(false);
    this.posTarget = undefined;
    this.posItems = [];
    this.posStatus?.setText('');
  }

  private refreshPosTicket(): void {
    this.posTicket?.setText(
      `TABLE ${this.posTarget ?? '-'}\n${this.posItems.length ? this.countIcons(this.posItems) : 'แตะรูปอาหารเพื่อใส่ ticket'}`,
    );
  }

  private tableStateLabel(table: TableView): string {
    const people = table.groupSize ? `${'👤'.repeat(table.groupSize)}\n` : '';
    const labels: Record<TableView['phase'], string> = {
      empty: 'EMPTY',
      'waiting-menu': '📖 NEED MENU',
      browsing: '👀 READING',
      'ready-to-order': '🙋 READY TO ORDER',
      memory: '🧠 ORDER MEMORY',
      'waiting-pos': '🛎️ SEND TO POS',
      'waiting-food': '👨‍🍳 COOKING',
      'ready-to-serve': '🍽️ FOOD READY',
      eating: '😋 EATING',
      'waiting-payment': '💰 PAYMENT',
    };
    return people + labels[table.phase];
  }

  private findTableAt(x: number, y: number): string | undefined {
    for (const [id, visual] of this.tableVisuals) {
      if (Math.abs(x - visual.x) <= visual.width / 2 && Math.abs(y - visual.y) <= visual.height / 2) return id;
    }
    return undefined;
  }

  private countIcons(itemIds: readonly string[]): string {
    const counts = new Map<string, number>();
    for (const id of itemIds) counts.set(id, (counts.get(id) ?? 0) + 1);
    return [...counts.entries()]
      .map(([id, count]) => `${recipes[id]?.icon ?? '🍽️'} ×${count}`)
      .join('   ');
  }
}
