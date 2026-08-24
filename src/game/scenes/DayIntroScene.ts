import Phaser from 'phaser';
import { campaignDays } from '../../content/campaignDays';
import { dayConfigs } from '../../content/dayConfigs';

interface DayIntroData {
  dayId?: string;
}

export class DayIntroScene extends Phaser.Scene {
  private dayId = 'day-01';

  constructor() {
    super('day-intro');
  }

  create(data: DayIntroData): void {
    const config = dayConfigs[data.dayId ?? 'day-01'] ?? dayConfigs['day-01'];
    const campaign = campaignDays[config.id] ?? {
      dayId: config.id,
      eyebrow: 'NEW SHIFT',
      headline: config.title,
      briefing: 'Get the restaurant ready for another service.',
      unlockLine: 'Keep the service moving.',
    };
    this.dayId = config.id;
    this.cameras.main.setBackgroundColor('#f4e8d8');

    this.add.rectangle(360, 85, 720, 170, 0x3d2f2a);
    this.add.text(360, 40, campaign.eyebrow, {
      fontFamily: 'system-ui',
      fontSize: '18px',
      fontStyle: 'bold',
      color: '#dcae7d',
      letterSpacing: 2,
    }).setOrigin(0.5);
    this.add.text(360, 92, config.title.toUpperCase(), {
      fontFamily: 'system-ui',
      fontSize: '29px',
      fontStyle: 'bold',
      color: '#fff6e9',
    }).setOrigin(0.5);

    this.add.rectangle(360, 475, 620, 520, 0xfff8ec).setStrokeStyle(4, 0xc69a72);
    this.add.text(360, 295, campaign.eventIcon ?? '🍜', {
      fontFamily: 'system-ui',
      fontSize: '72px',
    }).setOrigin(0.5);
    this.add.text(360, 382, campaign.headline, {
      fontFamily: 'system-ui',
      fontSize: '28px',
      fontStyle: 'bold',
      color: '#46342d',
      align: 'center',
      wordWrap: { width: 520 },
    }).setOrigin(0.5);
    this.add.text(360, 500, campaign.briefing, {
      fontFamily: 'system-ui',
      fontSize: '21px',
      color: '#70584b',
      align: 'center',
      lineSpacing: 8,
      wordWrap: { width: 520 },
    }).setOrigin(0.5);

    this.add.text(360, 650, campaign.unlockLine, {
      fontFamily: 'system-ui',
      fontSize: '19px',
      fontStyle: 'bold',
      color: '#9b5f42',
      backgroundColor: '#f2dfc7',
      padding: { x: 20, y: 12 },
    }).setOrigin(0.5);

    if (campaign.eventLabel) {
      this.add.text(360, 735, `${campaign.eventIcon ?? '★'}  ${campaign.eventLabel}`, {
        fontFamily: 'system-ui',
        fontSize: '18px',
        fontStyle: 'bold',
        color: '#fff8ec',
        backgroundColor: '#8e5944',
        padding: { x: 18, y: 10 },
      }).setOrigin(0.5);
    }

    this.add.text(360, 910, `Shift ${config.shiftDurationSeconds}s  ·  3★ target ${config.starThresholds[2]} pts`, {
      fontFamily: 'system-ui',
      fontSize: '18px',
      color: '#7b6457',
    }).setOrigin(0.5);

    this.add.text(360, 1030, 'OPEN THE DOORS  →', {
      fontFamily: 'system-ui',
      fontSize: '25px',
      fontStyle: 'bold',
      color: '#fff8ed',
      backgroundColor: '#a26547',
      padding: { x: 34, y: 18 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true })
      .on('pointerup', () => this.startShift());

    this.add.text(360, 1145, '← Back to restaurant', {
      fontFamily: 'system-ui',
      fontSize: '18px',
      color: '#80685b',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true })
      .on('pointerup', () => this.scene.start('home'));
  }

  private startShift(): void {
    this.scene.launch('restaurant', { dayId: this.dayId });
    this.scene.launch('shift-overlay', { dayId: this.dayId });
    this.scene.stop();
  }
}
