import Phaser from 'phaser';
import type { RestaurantSnapshot, TablePhase } from '../../domain/restaurant/RestaurantModels';
import type { GameSession } from '../session/GameSession';

interface JuiceOverlayData {
  dayId?: string;
}

interface RestaurantSceneRuntime {
  session?: GameSession;
}

const RATING_META = {
  perfect: { label: 'PERFECT  +100', color: '#3f6e46', background: '#e2f1da' },
  great: { label: 'GREAT  +60', color: '#557348', background: '#edf2d7' },
  ok: { label: 'OK  +30', color: '#795d45', background: '#f3e5ca' },
  late: { label: 'LATE', color: '#9a433b', background: '#f4d8d2' },
} as const;

/**
 * Presentation-only feedback for the restaurant loop.
 * It observes GameSession events/snapshots and never mutates gameplay state.
 */
export class JuiceOverlayScene extends Phaser.Scene {
  private previousPhases = new Map<string, TablePhase>();
  private urgentSeen = new Set<string>();
  private subscribed = false;
  private entrancePlayed = false;
  private visualsPaused = false;
  private lastStreak = 0;
  private comboText?: any;

  constructor() {
    super('juice-overlay');
  }

  create(_data: JuiceOverlayData): void {
    this.previousPhases.clear();
    this.urgentSeen.clear();
    this.subscribed = false;
    this.entrancePlayed = false;
    this.visualsPaused = false;
    this.lastStreak = 0;

    this.comboText = this.add.text(360, 875, '', {
      fontFamily: 'system-ui',
      fontSize: '24px',
      fontStyle: 'bold',
      color: '#fff8ed',
      backgroundColor: '#8c553e',
      padding: { x: 20, y: 10 },
      align: 'center',
    }).setOrigin(0.5).setDepth(3300).setVisible(false);
  }

  update(): void {
    const session = this.getRestaurantSession();
    if (!session) return;

    this.syncPauseState(session);
    if (!this.subscribed) this.subscribe(session);
    if (!this.entrancePlayed) this.playEntrance();

    const snapshot = session.snapshot();
    this.syncPhaseReactions(snapshot);
    this.syncUrgency(snapshot);
    this.syncStreak(snapshot);
  }

  private subscribe(session: GameSession): void {
    this.subscribed = true;

    session.events.on('serviceWindowResolved', ({ tableId, rating }) => {
      const meta = RATING_META[rating];
      this.floatAtTable(tableId, meta.label, meta.color, meta.background);
      if (rating === 'perfect') this.sparkAtTable(tableId, '✨');
    });

    session.events.on('paymentCollected', ({ tableId, amount }) => {
      this.floatAtTable(tableId, `+${amount}  💰`, '#5f6f3e', '#e7efd5');
      this.sparkAtTable(tableId, '💛');
    });

    session.events.on('foodServed', ({ tableId }) => {
      this.floatAtTable(tableId, '✓  SERVED', '#4d6b49', '#e1eddd');
    });

    session.events.on('orderSubmitted', ({ tableId }) => {
      this.floatAtTable(tableId, '✓  TICKET SENT', '#675149', '#eee0d1');
    });
  }

  private syncPauseState(session: GameSession): void {
    if (session.clock.isPaused && !this.visualsPaused) {
      this.visualsPaused = true;
      this.tweens.pauseAll();
    } else if (!session.clock.isPaused && this.visualsPaused) {
      this.visualsPaused = false;
      this.tweens.resumeAll();
    }
  }

  private playEntrance(): void {
    this.entrancePlayed = true;
    const restaurant = this.scene.get('restaurant') as Phaser.Scene & RestaurantSceneRuntime;
    restaurant.cameras.main.fadeIn(260, 45, 36, 31);
  }

  private syncPhaseReactions(snapshot: RestaurantSnapshot): void {
    snapshot.tables.forEach((table, index) => {
      const previous = this.previousPhases.get(table.id);
      this.previousPhases.set(table.id, table.phase);
      if (previous === undefined || previous === table.phase) return;

      const reaction = this.phaseReaction(table.phase);
      if (!reaction) return;
      const position = this.tablePosition(snapshot.tables.length, index);
      this.reactionBubble(position.x, position.y - 72, reaction);
      this.pulseTable(position.x, position.y, table.phase);
    });
  }

  private syncUrgency(snapshot: RestaurantSnapshot): void {
    snapshot.tables.forEach((table, index) => {
      const currentKey = table.service ? `${table.id}:${table.service.action}` : undefined;
      for (const key of [...this.urgentSeen]) {
        if (key.startsWith(`${table.id}:`) && key !== currentKey) this.urgentSeen.delete(key);
      }
      if (!table.service || !currentKey) return;
      const urgent = table.service.remainingMs <= table.service.durationMs * 0.3;
      if (!urgent || this.urgentSeen.has(currentKey)) return;

      this.urgentSeen.add(currentKey);
      const position = this.tablePosition(snapshot.tables.length, index);
      this.reactionBubble(position.x + 94, position.y - 54, '😰');
    });
  }

  private syncStreak(snapshot: RestaurantSnapshot): void {
    if (snapshot.streak > this.lastStreak && snapshot.streak >= 2) {
      this.showCombo(snapshot.streak);
    }
    this.lastStreak = snapshot.streak;
  }

  private phaseReaction(phase: TablePhase): string | undefined {
    if (phase === 'waiting-menu') return '📖  MENU?';
    if (phase === 'ready-to-order') return '🙋  READY!';
    if (phase === 'waiting-pos') return '🧾  POS!';
    if (phase === 'ready-to-serve') return '🍽️  PICKUP!';
    if (phase === 'eating') return ['😋', '😊', '✨'][Math.floor(Math.random() * 3)];
    if (phase === 'waiting-payment') return '💰  CHECK!';
    return undefined;
  }

  private floatAtTable(tableId: string, message: string, color: string, backgroundColor: string): void {
    const snapshot = this.getRestaurantSession()?.snapshot();
    if (!snapshot) return;
    const index = snapshot.tables.findIndex((table) => table.id === tableId);
    if (index < 0) return;
    const position = this.tablePosition(snapshot.tables.length, index);

    const pop = this.add.text(position.x, position.y + 58, message, {
      fontFamily: 'system-ui',
      fontSize: '17px',
      fontStyle: 'bold',
      color,
      backgroundColor,
      padding: { x: 10, y: 6 },
    }).setOrigin(0.5).setDepth(3250);

    this.tweens.add({
      targets: pop,
      y: position.y + 10,
      alpha: 0,
      duration: 900,
      ease: 'Cubic.Out',
      onComplete: () => pop.destroy(),
    });
  }

  private reactionBubble(x: number, y: number, message: string): void {
    const bubble = this.add.text(x, y, message, {
      fontFamily: 'system-ui',
      fontSize: message.length <= 2 ? '27px' : '15px',
      fontStyle: 'bold',
      color: '#4a382f',
      backgroundColor: '#fff8e9',
      padding: { x: 9, y: 5 },
    }).setOrigin(0.5).setDepth(3210).setScale(0.72).setAlpha(0);

    this.tweens.add({
      targets: bubble,
      scale: 1,
      alpha: 1,
      duration: 150,
      ease: 'Back.Out',
      onComplete: () => {
        this.tweens.add({
          targets: bubble,
          y: y - 18,
          alpha: 0,
          delay: 620,
          duration: 360,
          ease: 'Cubic.In',
          onComplete: () => bubble.destroy(),
        });
      },
    });
  }

  private pulseTable(x: number, y: number, phase: TablePhase): void {
    const stroke = phase === 'ready-to-order' || phase === 'waiting-payment' ? 0xd99b46 : 0x79a06c;
    const pulse = this.add.rectangle(x, y, 260, 160, 0xffffff, 0)
      .setStrokeStyle(5, stroke, 0.9)
      .setDepth(3150)
      .setScale(0.94);
    this.tweens.add({
      targets: pulse,
      scale: 1.07,
      alpha: 0,
      duration: 520,
      ease: 'Sine.Out',
      onComplete: () => pulse.destroy(),
    });
  }

  private sparkAtTable(tableId: string, icon: string): void {
    const snapshot = this.getRestaurantSession()?.snapshot();
    if (!snapshot) return;
    const index = snapshot.tables.findIndex((table) => table.id === tableId);
    if (index < 0) return;
    const position = this.tablePosition(snapshot.tables.length, index);

    [-38, 0, 38].forEach((offset, sparkIndex) => {
      const spark = this.add.text(position.x + offset, position.y - 8, icon, {
        fontFamily: 'system-ui',
        fontSize: '20px',
      }).setOrigin(0.5).setDepth(3240).setAlpha(0.9);
      this.tweens.add({
        targets: spark,
        x: position.x + offset * 1.35,
        y: position.y - 60 - sparkIndex * 7,
        alpha: 0,
        duration: 650 + sparkIndex * 80,
        ease: 'Cubic.Out',
        onComplete: () => spark.destroy(),
      });
    });
  }

  private showCombo(streak: number): void {
    const label = streak >= 5
      ? `🌟  ON FIRE  ·  PERFECT ×${streak}`
      : streak >= 3
        ? `🔥  STREAK  ·  PERFECT ×${streak}`
        : `🔥  PERFECT ×${streak}`;

    this.comboText?.setText(label).setVisible(true).setAlpha(0).setScale(0.78);
    this.tweens.killTweensOf(this.comboText);
    this.tweens.add({
      targets: this.comboText,
      alpha: 1,
      scale: 1,
      duration: 180,
      ease: 'Back.Out',
      onComplete: () => {
        this.tweens.add({
          targets: this.comboText,
          alpha: 0,
          y: 855,
          delay: 720,
          duration: 320,
          onComplete: () => this.comboText?.setVisible(false).setPosition(360, 875),
        });
      },
    });
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
