import Phaser from 'phaser';
import { dayConfigs } from '../../content/dayConfigs';
import type { GameSession } from '../session/GameSession';

interface ShiftOverlayData {
  dayId?: string;
}

interface RestaurantSceneRuntime {
  session?: GameSession;
}

export class ShiftOverlayScene extends Phaser.Scene {
  private dayId = 'day-01';
  private durationMs = 45_000;
  private timerText?: any;
  private finished = false;

  constructor() {
    super('shift-overlay');
  }

  create(data: ShiftOverlayData): void {
    const config = dayConfigs[data.dayId ?? 'day-01'] ?? dayConfigs['day-01'];
    this.dayId = config.id;
    this.durationMs = config.shiftDurationSeconds * 1000;
    this.finished = false;

    this.timerText = this.add.text(512, 94, '', {
      fontFamily: 'system-ui',
      fontSize: '18px',
      fontStyle: 'bold',
      color: '#fff4df',
      backgroundColor: '#8c5d46',
      padding: { x: 12, y: 7 },
    }).setDepth(2000);
  }

  update(): void {
    if (this.finished) return;
    const session = this.getRestaurantSession();
    if (!session) return;

    const remainingMs = Math.max(0, this.durationMs - session.clock.now);
    const seconds = Math.ceil(remainingMs / 1000);
    this.timerText?.setText(`SHIFT  ${seconds}s`);

    if (remainingMs <= 0) {
      const snapshot = session.snapshot();
      this.finished = true;
      this.scene.stop('restaurant');
      this.scene.start('result', {
        dayId: this.dayId,
        score: snapshot.score,
        shiftCoins: snapshot.coins,
      });
    }
  }

  private getRestaurantSession(): GameSession | undefined {
    if (!this.scene.isActive('restaurant')) return undefined;
    const restaurant = this.scene.get('restaurant') as unknown as RestaurantSceneRuntime;
    return restaurant.session;
  }
}
