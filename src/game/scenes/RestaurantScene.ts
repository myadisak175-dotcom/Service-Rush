import Phaser from 'phaser';
import { dayConfigs } from '../../content/dayConfigs';
import { recipes } from '../../content/recipes';
import { SaveManager } from '../../core/save/SaveManager';
import { debugFlags } from '../../debug/DebugFlags';
import type { RestaurantSnapshot, TableView } from '../../domain/restaurant/RestaurantModels';
import { activeBenefitLabels, applyOwnedUpgrades } from '../../systems/progression/UpgradeEffects';
import { GameSession } from '../session/GameSession';
import { addFloorPattern, art, font, panel, pill } from '../ui/ArtTheme';

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
  session?: GameSession;
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
  private readonly menuOrigin = { x: 100, y: 1010 };

  constructor() {
    super('restaurant');
  }

  create(data: RestaurantSceneData): void {
    const baseConfig = dayConfigs[data.dayId ?? 'day-01'] ?? dayConfigs['day-01'];
    const save = new SaveManager().load();
    const config = applyOwnedUpgrades(baseConfig, save.unlockedUpgrades);
    this.currentDayId = config.id;
    this.session = new GameSession(config);
    this.cameras.main.setBackgroundColor('#f6efe6');

    this.drawRestaurantShell();
    this.drawActiveUpgrades(save.unlockedUpgrades);
    this.createTables(config.tableCount);
    this.createMenuDrag();
    this.createServiceCounter();
    this.createMemoryLayer();
    this.createPosLayer();
    this.createDayButtons();
    this.cameras.main.fadeIn(220, 246, 239, 230);

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
    addFloorPattern(this, 154, 1060);

    const header = this.add.graphics();
    header.fillStyle(art.ink, 1);
    header.fillRect(0, 0, 720, 154);
    header.fillStyle(art.terracotta, 1);
    header.fillRect(0, 148, 720, 6);

    this.add.text(28, 22, 'SERVICE', {
      fontFamily: font,
      fontSize: '28px',
      fontStyle: 'bold',
      color: '#fff8ef',
    });
    this.add.text(155, 22, 'RUSH', {
      fontFamily: font,
      fontSize: '28px',
      fontStyle: 'bold',
      color: '#df8666',
    });
    this.hud = this.add.text(28, 72, '', {
      fontFamily: font,
      fontSize: '17px',
      color: '#e8c7a7',
    });

    this.pauseButton = this.add.text(656, 44, 'Ⅱ', {
      fontFamily: font,
      fontSize: '22px',
      fontStyle: 'bold',
      color: '#fff7ed',
      backgroundColor: '#5f473d',
      padding: { x: 13, y: 9 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).on('pointerup', () => {
      if (!this.session) return;
      if (this.session.clock.isPaused) {
        this.session.resume();
        this.pauseButton.setText('Ⅱ');
      } else {
        this.session.pause();
        this.pauseButton.setText('▶');
      }
    });

    panel(this, 360, 245, 660, 154, { fill: 0x3b302a, stroke: art.woodDark, radius: 26 });
    const kitchen = this.add.graphics();
    kitchen.fillStyle(0x201a17, 1);
    kitchen.fillRoundedRect(55, 190, 610, 73, 18);
    kitchen.fillStyle(art.wood, 1);
    kitchen.fillRoundedRect(55, 260, 610, 32, 10);
    kitchen.lineStyle(2, 0x8b654b, 0.55);
    for (let x = 105; x < 650; x += 58) kitchen.lineBetween(x, 264, x, 288);

    this.add.text(76, 180, 'OPEN KITCHEN', {
      fontFamily: font,
      fontSize: '13px',
      fontStyle: 'bold',
      letterSpacing: 2,
      color: '#d9b88f',
    });
    this.add.text(78, 215, '👨‍🍳  KITCHEN PASS', {
      fontFamily: font,
      fontSize: '23px',
      fontStyle: 'bold',
      color: '#fff5e8',
    });
    this.add.text(78, 250, 'Ready dishes appear on the counter → drag to the right table', {
      fontFamily: font,
      fontSize: '13px',
      color: '#cdb7a5',
    });

    panel(this, 360, 1132, 660, 160, { fill: 0xead7bd, stroke: 0xc39d78, radius: 28 });
    this.add.text(60, 1072, 'WAITING LOUNGE', {
      fontFamily: font,
      fontSize: '14px',
      fontStyle: 'bold',
      letterSpacing: 2,
      color: '#765746',
    });
    this.add.text(60, 1102, 'Drag a party to a table', {
      fontFamily: font,
      fontSize: '17px',
      color: '#4b382f',
    });
  }

  private drawActiveUpgrades(ownedUpgradeIds: readonly string[]): void {
    const benefits = activeBenefitLabels(ownedUpgradeIds);
    if (!benefits.length) return;
    pill(this, 360, 132, benefits.join('   ·   '), {
      fill: art.woodDark,
      fontSize: '11px',
      paddingX: 11,
      paddingY: 5,
    }).setDepth(20);
  }

  private createTables(count: number): void {
    const positions = count <= 2
      ? [{ x: 210, y: 535 }, { x: 510, y: 535 }]
      : count === 3
        ? [{ x: 210, y: 500 }, { x: 510, y: 500 }, { x: 360, y: 735 }]
        : [{ x: 210, y: 500 }, { x: 510, y: 500 }, { x: 210, y: 735 }, { x: 510, y: 735 }];

    this.session!.snapshot().tables.forEach((table, index) => {
      const position = positions[index] ?? { x: 360, y: 500 + index * 170 };
      const shadow = this.add.ellipse(position.x + 4, position.y + 12, 244, 126, art.shadow, 0.10);
      shadow.setDepth(0);
      this.add.ellipse(position.x, position.y, 238, 122, art.woodDark, 1);
      const box = this.add.ellipse(position.x, position.y - 5, 224, 112, art.paper, 1)
        .setStrokeStyle(4, 0xd3b18e)
        .setInteractive({ useHandCursor: true });

      pill(this, position.x, position.y - 74, `${table.id}  ·  ${table.capacity} seats`, {
        fill: art.cocoa,
        fontSize: '11px',
        paddingX: 10,
        paddingY: 5,
      });
      const state = this.add.text(position.x, position.y - 5, 'EMPTY', {
        fontFamily: font,
        fontSize: '20px',
        fontStyle: 'bold',
        color: '#5f4b40',
        align: 'center',
      }).setOrigin(0.5);
      const timer = this.add.text(position.x, position.y + 44, '', {
        fontFamily: font,
        fontSize: '14px',
        fontStyle: 'bold',
        color: '#8a664e',
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
      fontFamily: font,
      fontSize: '25px',
      fontStyle: 'bold',
      align: 'center',
      color: '#3f3029',
      backgroundColor: '#fff5df',
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
    this.add.text(603, 1010, '🛎️\nPOS', {
      fontFamily: font,
      fontSize: '25px',
      fontStyle: 'bold',
      align: 'center',
      color: '#fff7ed',
      backgroundColor: '#a9583f',
      padding: { x: 23, y: 11 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).on('pointerup', () => this.openPos());
  }

  private createMemoryLayer(): void {
    const background = this.add.rectangle(360, 630, 580, 410, art.ink, 0.97).setStrokeStyle(5, 0xe0b77a);
    const title = this.add.text(360, 490, 'ORDER CHECK', {
      fontFamily: font,
      fontSize: '13px',
      fontStyle: 'bold',
      letterSpacing: 2,
      color: '#d9b88f',
    }).setOrigin(0.5);
    this.memoryText = this.add.text(360, 645, '', {
      fontFamily: font,
      fontSize: '32px',
      fontStyle: 'bold',
      color: '#fff6e8',
      align: 'center',
      lineSpacing: 14,
    }).setOrigin(0.5);
    this.memoryLayer = this.add.container(0, 0, [background, title, this.memoryText]).setDepth(500).setVisible(false);
  }

  private createPosLayer(): void {
    const background = this.add.rectangle(360, 650, 650, 690, 0x211b18, 0.99).setStrokeStyle(5, 0xd8aa72);
    const top = this.add.rectangle(360, 362, 650, 116, 0x3b302a, 1);
    const title = this.add.text(72, 326, 'SERVICE COUNTER', {
      fontFamily: font,
      fontSize: '13px',
      fontStyle: 'bold',
      letterSpacing: 2,
      color: '#d9b88f',
    });
    this.posTicket = this.add.text(72, 362, '', {
      fontFamily: font,
      fontSize: '23px',
      fontStyle: 'bold',
      color: '#fff3df',
      wordWrap: { width: 570 },
    });
    this.posStatus = this.add.text(360, 455, '', {
      fontFamily: font,
      fontSize: '17px',
      color: '#ffb9a8',
    }).setOrigin(0.5);
    const children: any[] = [background, top, title, this.posTicket, this.posStatus];

    this.session!.config.recipeIds.forEach((recipeId, index) => {
      const recipe = recipes[recipeId];
      if (!recipe) return;
      const x = 190 + index * 170;
      const button = this.add.text(x, 610, `${recipe.icon}\n${recipe.label}`, {
        fontFamily: font,
        fontSize: '27px',
        fontStyle: 'bold',
        align: 'center',
        color: '#3b2d27',
        backgroundColor: '#fff4de',
        padding: { x: 18, y: 14 },
      }).setOrigin(0.5).setInteractive({ useHandCursor: true }).on('pointerup', () => {
        this.posItems.push(recipeId);
        this.refreshPosTicket();
      });
      children.push(button);
    });

    const undo = this.add.text(170, 785, 'UNDO', {
      fontFamily: font,
      fontSize: '18px',
      fontStyle: 'bold',
      color: '#fff8ef',
      backgroundColor: '#584740',
      padding: { x: 20, y: 12 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).on('pointerup', () => {
      this.posItems.pop();
      this.refreshPosTicket();
    });
    const clear = this.add.text(360, 785, 'CLEAR', {
      fontFamily: font,
      fontSize: '18px',
      fontStyle: 'bold',
      color: '#fff8ef',
      backgroundColor: '#584740',
      padding: { x: 20, y: 12 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).on('pointerup', () => {
      this.posItems = [];
      this.refreshPosTicket();
    });
    const send = this.add.text(550, 785, 'SEND →', {
      fontFamily: font,
      fontSize: '20px',
      fontStyle: 'bold',
      color: '#fff8ef',
      backgroundColor: '#b86143',
      padding: { x: 23, y: 12 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).on('pointerup', () => this.sendPos());
    const close = this.add.text(360, 900, 'CLOSE', {
      fontFamily: font,
      fontSize: '15px',
      fontStyle: 'bold',
      color: '#cdb6a7',
      letterSpacing: 1,
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).on('pointerup', () => this.closePos());
    children.push(undo, clear, send, close);
    this.posLayer = this.add.container(0, 0, children).setDepth(600).setVisible(false);
  }

  private createDayButtons(): void {
    if (!debugFlags.enabled) return;
    this.add.text(350, 1178, 'DEV DAYS', {
      fontFamily: font,
      fontSize: '12px',
      color: '#765a49',
    }).setOrigin(0.5).setDepth(3000);
    Object.keys(dayConfigs).slice(0, 7).forEach((dayId, index) => {
      const label = dayId.slice(-2);
      const x = 230 + index * 42;
      this.add.text(x, 1212, label, {
        fontFamily: font,
        fontSize: '14px',
        color: dayId === this.currentDayId ? '#fff' : '#5d493e',
        backgroundColor: dayId === this.currentDayId ? '#8e5d44' : '#f7e2c6',
        padding: { x: 8, y: 6 },
      }).setOrigin(0.5).setDepth(3000).setInteractive({ useHandCursor: true })
        .on('pointerup', () => this.scene.restart({ dayId }));
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
    this.hud?.setText(`${this.session!.config.title}\nScore ${snapshot.score}   ·   💰 ${snapshot.coins}${streak}`);
  }

  private syncTables(snapshot: RestaurantSnapshot): void {
    for (const table of snapshot.tables) {
      const visual = this.tableVisuals.get(table.id);
      if (!visual) continue;
      visual.state.setText(this.tableStateLabel(table));
      const urgent = table.service && table.service.remainingMs <= table.service.durationMs * 0.3;
      visual.timer.setColor(urgent ? '#b94f45' : '#806453');
      visual.timer.setText(table.service
        ? `${table.service.action.toUpperCase()}  ${Math.ceil(table.service.remainingMs / 1000)}s  · ${table.service.rating.toUpperCase()}`
        : '');
      visual.box.setFillStyle(
        table.phase === 'empty' ? art.paper
          : table.phase === 'ready-to-order' ? 0xffe9bf
            : table.phase === 'ready-to-serve' ? 0xdfead8
              : table.phase === 'waiting-payment' ? 0xffdfaa
                : 0xf6e8d8,
      );
      visual.box.setStrokeStyle(urgent ? 5 : 4, urgent ? art.danger : 0xd3b18e);
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
      const homeX = 155 + index * 190;
      const homeY = 1150;
      if (!object) {
        const faces = Array.from({ length: group.size }, (_, faceIndex) => ['🙂', '😌', '😊', '😋'][faceIndex % 4]).join('');
        object = this.add.text(homeX, homeY, `${faces}\nParty of ${group.size}`, {
          fontFamily: font,
          fontSize: '20px',
          fontStyle: 'bold',
          align: 'center',
          color: '#45342d',
          backgroundColor: '#fff8ed',
          padding: { x: 15, y: 9 },
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
      const homeX = 365 + (index % 4) * 66;
      const homeY = 275 + Math.floor(index / 4) * 54;
      if (!object) {
        const recipe = recipes[dish.recipeId];
        object = this.add.text(homeX, homeY, recipe?.icon ?? '🍽️', {
          fontFamily: font,
          fontSize: '34px',
          backgroundColor: '#fff5df',
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
      `TABLE ${memory.tableId}\n\n${this.countIcons(memory.items)}\n\nMEMORIZE THIS\n${Math.ceil(memory.remainingMs / 1000)}`,
    );
    this.memoryLayer?.setVisible(true);
  }

  private syncPosState(snapshot: RestaurantSnapshot): void {
    if (this.posTarget && !snapshot.pendingPosTableIds.includes(this.posTarget)) this.closePos();
  }

  private openPos(): void {
    const tableId = this.session?.getOldestPendingPosTableId();
    if (!tableId) {
      this.posStatus?.setText('No table is waiting for POS yet.');
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
      this.posStatus?.setText('Order mismatch — fix the ticket and try again.');
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
      `TABLE ${this.posTarget ?? '-'}   ·   ${this.posItems.length ? this.countIcons(this.posItems) : 'tap food icons to build ticket'}`,
    );
  }

  private tableStateLabel(table: TableView): string {
    const people = table.groupSize ? `${Array.from({ length: table.groupSize }, () => '🙂').join('')}\n` : '';
    const labels: Record<TableView['phase'], string> = {
      empty: 'OPEN TABLE',
      'waiting-menu': '📖  NEED MENU',
      browsing: '👀  READING',
      'ready-to-order': '🙋  READY',
      memory: '🧠  ORDER',
      'waiting-pos': '🛎️  SEND POS',
      'waiting-food': '👨‍🍳  COOKING',
      'ready-to-serve': '🍽️  PICKUP',
      eating: '😋  ENJOYING',
      'waiting-payment': '💰  CHECK',
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
