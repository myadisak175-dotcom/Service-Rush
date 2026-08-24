import Phaser from 'phaser';
import { campaignDays } from '../../content/campaignDays';
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
  private eventText?: any;
  private finished = false;

  constructor() {
    super('shift-overlay');
  }

  create(data: ShiftOverlayData): void {
    const config = dayConfigs[data.dayId ?? 'day-01'] ?? dayConfigs['day-01'];
    this.configureForDay(config.id);
    this.finished = false;

    this.timerText = this.add.text(512, 94, '', {
      fontFamily: 'system-ui',
      fontSize: '18px',
      fontStyle: 'bold',
      color: '#fff4df',
      backgroundColor: '#8c5d46',
      padding: { x: 12, y: 7 },
    }).setDepth(2000);

    this.eventText = this.add.text(360, 158, '', {
      fontFamily: 'system-ui',
      fontSize: '16px',
      fontStyle: 'bold',
      color: '#fff8ed',
      backgroundColor: '#925845',
      padding: { x: 14, y: 8 },
    }).setOrigin(0.5).setDepth(2000).setVisible(false);
    this.refreshEventBanner();
  }

  update(): void {
    if (this.finished) return;
    const session = this.getRestaurantSession();
    if (!session) return;

    // Keep the overlay coherent if a developer jumps between days in RestaurantScene.
    if (session.config.id !== this.dayId) {
      this.configureForDay(session.config.id);
      this.refreshEventBanner();
    }

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

  private configureForDay(dayId: string): void {
    const config = dayConfigs[dayId] ?? dayConfigs['day-01'];
    this.dayId = config.id;
    this.durationMs = config.shiftDurationSeconds * 1000;
  }

  private refreshEventBanner(): void {
    const campaign = campaignDays[this.dayId];
    if (!campaign?.eventLabel) {
      this.eventText?.setVisible(false);
      return;
    }
    this.eventText?.setText(`${campaign.eventIcon ?? '★'}  ${campaign.eventLabel}`).setVisible(true);
  }

  private getRestaurantSession(): GameSession | undefined {
    if (!this.scene.isActive('restaurant')) return undefined;
    const restaurant = this.scene.get('restaurant') as unknown as RestaurantSceneRuntime;
    return restaurant.session;
  }
}
