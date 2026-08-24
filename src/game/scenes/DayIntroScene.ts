import Phaser from 'phaser';
import { campaignDays } from '../../content/campaignDays';
import { dayConfigs } from '../../content/dayConfigs';
import { art, button, font, headerBand, panel, pill } from '../ui/ArtTheme';

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
    this.cameras.main.setBackgroundColor('#f6efe6');
    headerBand(this, campaign.eyebrow);

    this.add.text(34, 28, config.title.toUpperCase(), {
      fontFamily: font,
      fontSize: '29px',
      fontStyle: 'bold',
      color: '#fff8ef',
    });
    this.add.text(34, 72, 'Tonight’s service brief', {
      fontFamily: font,
      fontSize: '16px',
      color: '#d7b99a',
    });

    panel(this, 360, 486, 620, 560, { fill: art.paper, stroke: art.creamDeep, radius: 34 });

    const iconRing = this.add.graphics();
    iconRing.fillStyle(art.cream, 1);
    iconRing.fillCircle(360, 284, 72);
    iconRing.lineStyle(3, art.terracotta, 0.35);
    iconRing.strokeCircle(360, 284, 72);
    this.add.text(360, 284, campaign.eventIcon ?? '🍜', {
      fontFamily: font,
      fontSize: '67px',
    }).setOrigin(0.5);

    this.add.text(360, 385, campaign.headline, {
      fontFamily: font,
      fontSize: '30px',
      fontStyle: 'bold',
      color: '#3f3029',
      align: 'center',
      wordWrap: { width: 500 },
    }).setOrigin(0.5);

    this.add.text(360, 492, campaign.briefing, {
      fontFamily: font,
      fontSize: '20px',
      color: '#715d50',
      align: 'center',
      lineSpacing: 9,
      wordWrap: { width: 500 },
    }).setOrigin(0.5);

    pill(this, 360, 625, campaign.unlockLine, {
      fill: art.creamDeep,
      color: '#8d4936',
      fontSize: '16px',
      paddingX: 20,
      paddingY: 11,
    });

    if (campaign.eventLabel) {
      pill(this, 360, 696, `${campaign.eventIcon ?? '★'}  ${campaign.eventLabel}`, {
        fill: art.terracottaDark,
        fontSize: '16px',
        paddingX: 18,
        paddingY: 10,
      });
    }

    const metaY = campaign.eventLabel ? 790 : 745;
    panel(this, 360, metaY, 520, 84, { fill: 0xf3e6d5, stroke: 0xdfc9b2, radius: 22, shadow: false });
    this.add.text(360, metaY - 13, `⏱ ${config.shiftDurationSeconds}s     ★★★ ${config.starThresholds[2]} pts`, {
      fontFamily: font,
      fontSize: '17px',
      fontStyle: 'bold',
      color: '#4c3b32',
    }).setOrigin(0.5);
    this.add.text(360, metaY + 19, 'Keep the room calm, clean and moving.', {
      fontFamily: font,
      fontSize: '13px',
      color: '#816d60',
    }).setOrigin(0.5);

    button(this, 360, 1004, 'OPEN THE DOORS  →', () => this.startShift(), {
      fill: art.terracotta,
      fontSize: '23px',
      paddingX: 34,
      paddingY: 17,
    });

    this.add.text(360, 1125, '← Back to restaurant', {
      fontFamily: font,
      fontSize: '17px',
      color: '#80685b',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true })
      .on('pointerup', () => {
        this.cameras.main.fadeOut(130, 51, 40, 34);
        this.time.delayedCall(130, () => this.scene.start('home'));
      });

    this.cameras.main.fadeIn(220, 246, 239, 230);
  }

  private startShift(): void {
    this.cameras.main.fadeOut(160, 51, 40, 34);
    this.time.delayedCall(160, () => {
      this.scene.launch('restaurant', { dayId: this.dayId });
      this.scene.launch('shift-overlay', { dayId: this.dayId });
      this.scene.stop();
    });
  }
}
