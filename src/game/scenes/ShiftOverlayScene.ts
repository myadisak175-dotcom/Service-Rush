import Phaser from 'phaser';
import { campaignDays } from '../../content/campaignDays';
import { dayConfigs } from '../../content/dayConfigs';
import { eventsAvailableOnDay, type ShiftEventDefinition } from '../../content/shiftEvents';
import { numberFromDayId } from '../../systems/progression/ProgressionSystem';
import type { GameSession } from '../session/GameSession';
import type { RegularOverlayScene, RegularVisitBonus } from './RegularOverlayScene';

interface ShiftOverlayData {
  dayId?: string;
}

interface RestaurantSceneRuntime {
  session?: GameSession;
}

interface ConfigRestorePoint {
  waitingGroupLimit: number;
  kitchenCapacity: number;
  serviceWindowSeconds: number;
}

export class ShiftOverlayScene extends Phaser.Scene {
  private dayId = 'day-01';
  private durationMs = 45_000;
  private timerText?: any;
  private eventText?: any;
  private surpriseText?: any;
  private surpriseEvent?: ShiftEventDefinition;
  private surpriseStarted = false;
  private surpriseFinished = false;
  private surpriseEndsAt = 0;
  private restorePoint?: ConfigRestorePoint;
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

    this.surpriseText = this.add.text(360, 340, '', {
      fontFamily: 'system-ui',
      fontSize: '15px',
      fontStyle: 'bold',
      color: '#44362e',
      backgroundColor: '#f6dfa9',
      padding: { x: 14, y: 8 },
      align: 'center',
    }).setOrigin(0.5).setDepth(2050).setVisible(false);

    this.refreshEventBanner();
    if (!this.scene.isActive('regular-overlay')) this.scene.launch('regular-overlay', { dayId: this.dayId });
  }

  update(): void {
    if (this.finished) return;
    const session = this.getRestaurantSession();
    if (!session) return;

    // Keep the overlay coherent if a developer jumps between days in RestaurantScene.
    if (session.config.id !== this.dayId) {
      this.restoreSurprise(session);
      this.configureForDay(session.config.id);
      this.refreshEventBanner();
      if (this.scene.isActive('regular-overlay')) this.scene.stop('regular-overlay');
      this.scene.launch('regular-overlay', { dayId: this.dayId });
    }

    this.updateSurprise(session);

    const remainingMs = Math.max(0, this.durationMs - session.clock.now);
    const seconds = Math.ceil(remainingMs / 1000);
    this.timerText?.setText(`SHIFT  ${seconds}s`);

    if (remainingMs <= 0) {
      const snapshot = session.snapshot();
      const regular = this.getRegularBonus();
      this.finished = true;
      this.restoreSurprise(session);
      if (this.scene.isActive('regular-overlay')) this.scene.stop('regular-overlay');
      this.scene.stop('restaurant');
      this.scene.start('result', {
        dayId: this.dayId,
        score: snapshot.score + regular.score,
        shiftCoins: snapshot.coins + regular.coins,
        regularCompleted: regular.completed,
        regularName: regular.name,
        regularIcon: regular.icon,
        regularBonusScore: regular.score,
        regularBonusCoins: regular.coins,
      });
    }
  }

  private configureForDay(dayId: string): void {
    const config = dayConfigs[dayId] ?? dayConfigs['day-01'];
    this.dayId = config.id;
    this.durationMs = config.shiftDurationSeconds * 1000;
    const available = eventsAvailableOnDay(numberFromDayId(config.id));
    this.surpriseEvent = available.length
      ? available[Math.floor(Math.random() * available.length)]
      : undefined;
    this.surpriseStarted = false;
    this.surpriseFinished = false;
    this.surpriseEndsAt = 0;
    this.restorePoint = undefined;
    this.surpriseText?.setVisible(false);
  }

  private refreshEventBanner(): void {
    const campaign = campaignDays[this.dayId];
    if (!campaign?.eventLabel) {
      this.eventText?.setVisible(false);
      return;
    }
    this.eventText?.setText(`${campaign.eventIcon ?? '★'}  ${campaign.eventLabel}`).setVisible(true);
  }

  private updateSurprise(session: GameSession): void {
    const surprise = this.surpriseEvent;
    if (!surprise || this.surpriseFinished) return;

    if (!this.surpriseStarted && session.clock.now >= surprise.startAfterMs) {
      this.surpriseStarted = true;
      this.surpriseEndsAt = session.clock.now + surprise.durationMs;
      this.restorePoint = {
        waitingGroupLimit: session.config.waitingGroupLimit,
        kitchenCapacity: session.config.kitchenCapacity,
        serviceWindowSeconds: session.config.serviceWindowSeconds,
      };
      this.applySurprise(session, surprise);
    }

    if (!this.surpriseStarted) return;
    const remainingMs = Math.max(0, this.surpriseEndsAt - session.clock.now);
    this.surpriseText?.setText(
      `${surprise.icon}  ${surprise.label}  ·  ${Math.ceil(remainingMs / 1000)}s\n${surprise.detail}`,
    ).setVisible(true);

    if (remainingMs <= 0) {
      this.restoreSurprise(session);
      this.surpriseFinished = true;
      this.surpriseText?.setVisible(false);
    }
  }

  private applySurprise(session: GameSession, event: ShiftEventDefinition): void {
    const effect = event.effect;
    if (effect.kind === 'arrival-rush') {
      session.config.waitingGroupLimit += effect.extraWaitingGroups;
      session.config.serviceWindowSeconds = Math.max(8, session.config.serviceWindowSeconds + effect.serviceWindowDeltaSeconds);
    } else if (effect.kind === 'kitchen-boost') {
      session.config.kitchenCapacity += effect.extraKitchenCapacity;
    } else if (effect.kind === 'service-breeze') {
      session.config.serviceWindowSeconds += effect.serviceWindowBonusSeconds;
    }
  }

  private restoreSurprise(session: GameSession): void {
    if (!this.restorePoint) return;
    session.config.waitingGroupLimit = this.restorePoint.waitingGroupLimit;
    session.config.kitchenCapacity = this.restorePoint.kitchenCapacity;
    session.config.serviceWindowSeconds = this.restorePoint.serviceWindowSeconds;
    this.restorePoint = undefined;
  }

  private getRegularBonus(): RegularVisitBonus {
    if (!this.scene.isActive('regular-overlay')) {
      return { score: 0, coins: 0, completed: false };
    }
    const overlay = this.scene.get('regular-overlay') as RegularOverlayScene;
    return overlay.getBonuses();
  }

  private getRestaurantSession(): GameSession | undefined {
    if (!this.scene.isActive('restaurant')) return undefined;
    const restaurant = this.scene.get('restaurant') as unknown as RestaurantSceneRuntime;
    return restaurant.session;
  }
}
