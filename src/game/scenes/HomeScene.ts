import Phaser from 'phaser';
import { dayConfigs } from '../../content/dayConfigs';
import { upgrades } from '../../content/upgrades';
import { SaveManager } from '../../core/save/SaveManager';
import type { SaveData } from '../../core/save/SaveSchema';
import {
  numberFromDayId,
  restaurantLevel,
  totalStars,
} from '../../systems/progression/ProgressionSystem';
import { activeBenefitLabels } from '../../systems/progression/UpgradeEffects';
import { art, button, font, headerBand, panel, pill, sectionTitle, starRow } from '../ui/ArtTheme';

export class HomeScene extends Phaser.Scene {
  private readonly saveManager = new SaveManager();

  constructor() {
    super('home');
  }

  create(): void {
    const save = this.saveManager.load();
    this.cameras.main.setBackgroundColor('#f6efe6');
    headerBand(this, 'COZY RAMEN BAR · FIRST WEEK');

    this.add.text(34, 28, 'SERVICE', {
      fontFamily: font,
      fontSize: '33px',
      fontStyle: 'bold',
      color: '#fff8ef',
    });
    this.add.text(184, 28, 'RUSH', {
      fontFamily: font,
      fontSize: '33px',
      fontStyle: 'bold',
      color: '#df8666',
    });
    this.add.text(34, 72, `Restaurant Lv.${restaurantLevel(save)}  ·  your little place is growing`, {
      fontFamily: font,
      fontSize: '16px',
      color: '#d7b99a',
    });

    pill(this, 612, 48, `💰 ${save.coins}`, { fill: art.terracottaDark, fontSize: '17px' });
    pill(this, 612, 91, `⭐ ${totalStars(save)}`, { fill: art.woodDark, fontSize: '17px' });

    this.drawRestaurantPreview(save);
    this.drawDaySelect(save);

    this.cameras.main.fadeIn(280, 246, 239, 230);
  }

  private drawRestaurantPreview(save: SaveData): void {
    sectionTitle(this, 38, 174, 'YOUR RESTAURANT');
    this.add.text(681, 176, 'tap a day below to open', {
      fontFamily: font,
      fontSize: '13px',
      color: '#8b7769',
    }).setOrigin(1, 0);

    panel(this, 360, 349, 650, 300, { fill: art.paper, stroke: art.creamDeep, radius: 30 });

    const room = this.add.graphics();
    room.fillStyle(0xf4e6d5, 1);
    room.fillRoundedRect(64, 230, 592, 224, 22);
    room.lineStyle(1, 0xd5bfa8, 0.5);
    for (let x = 88; x < 650; x += 42) room.lineBetween(x, 230, x, 454);
    for (let y = 254; y < 454; y += 42) room.lineBetween(64, y, 656, y);

    room.fillStyle(art.ink, 1);
    room.fillRoundedRect(94, 248, 532, 54, 15);
    room.fillStyle(art.terracotta, 1);
    room.fillRoundedRect(104, 258, 150, 34, 11);
    this.add.text(179, 275, 'SERVICE RUSH', {
      fontFamily: font,
      fontSize: '14px',
      fontStyle: 'bold',
      color: '#fff8ef',
    }).setOrigin(0.5);
    this.add.text(548, 275, '🍜  🍵  🥟', { fontFamily: font, fontSize: '23px' }).setOrigin(0.5);

    this.drawPreviewTable(220, 355, '🍜');
    this.drawPreviewTable(500, 355, '🍵');

    this.add.text(357, 424, '🛎️   👨‍🍳', { fontFamily: font, fontSize: '30px' }).setOrigin(0.5);

    if (save.unlockedUpgrades.includes('window-plants')) {
      this.add.text(89, 323, '🪴', { fontFamily: font, fontSize: '38px' }).setOrigin(0.5);
      this.add.text(631, 323, '🪴', { fontFamily: font, fontSize: '38px' }).setOrigin(0.5);
    }
    if (save.unlockedUpgrades.includes('warm-lights')) {
      this.add.text(360, 319, '✨     ✨     ✨', { fontFamily: font, fontSize: '20px' }).setOrigin(0.5);
    }
    if (save.unlockedUpgrades.includes('chef-board')) {
      pill(this, 575, 418, '📋 SPECIALS', { fill: art.cocoa, fontSize: '11px', paddingX: 9, paddingY: 5 });
    }
    if (save.unlockedUpgrades.includes('service-training')) {
      this.add.text(307, 423, '🧑‍🍳', { fontFamily: font, fontSize: '26px' }).setOrigin(0.5);
    }
    if (save.unlockedUpgrades.includes('prep-station')) {
      this.add.text(414, 424, '🔪', { fontFamily: font, fontSize: '25px' }).setOrigin(0.5);
    }
    if (save.unlockedUpgrades.includes('waiting-bench')) {
      this.add.text(106, 418, '🛋️', { fontFamily: font, fontSize: '28px' }).setOrigin(0.5);
    }

    const owned = upgrades.filter((upgrade) => save.unlockedUpgrades.includes(upgrade.id));
    const critic = save.achievements.includes('critic-approved');
    this.add.text(360, 472, owned.length
      ? `${owned.map((entry) => entry.icon).join('  ')}${critic ? '   🏅' : ''}`
      : 'Complete shifts to make this room yours.', {
      fontFamily: font,
      fontSize: '14px',
      color: '#79665a',
      align: 'center',
    }).setOrigin(0.5);

    const benefits = activeBenefitLabels(save.unlockedUpgrades);
    if (benefits.length) {
      this.add.text(360, 502, benefits.join('   ·   '), {
        fontFamily: font,
        fontSize: '12px',
        fontStyle: 'bold',
        color: '#5d7655',
        align: 'center',
      }).setOrigin(0.5);
    }
  }

  private drawPreviewTable(x: number, y: number, dish: string): void {
    const g = this.add.graphics();
    g.fillStyle(art.shadow, 0.08);
    g.fillEllipse(x + 3, y + 9, 142, 58);
    g.fillStyle(art.woodDark, 1);
    g.fillRoundedRect(x - 72, y - 8, 144, 42, 18);
    g.fillStyle(0xfff7eb, 1);
    g.fillRoundedRect(x - 65, y - 15, 130, 38, 16);
    this.add.text(x, y + 3, `🪑  ${dish}  🪑`, { fontFamily: font, fontSize: '24px' }).setOrigin(0.5);
  }

  private drawDaySelect(save: SaveData): void {
    sectionTitle(this, 38, 535, 'FIRST WEEK');
    this.add.text(681, 538, 'build rhythm · earn stars · grow', {
      fontFamily: font,
      fontSize: '13px',
      color: '#8b7769',
    }).setOrigin(1, 0);

    const configs = Object.values(dayConfigs).sort(
      (a, b) => numberFromDayId(a.id) - numberFromDayId(b.id),
    );

    configs.forEach((config, index) => {
      const dayNumber = numberFromDayId(config.id);
      const unlocked = dayNumber <= save.highestUnlockedDay;
      const col = index % 2;
      const row = Math.floor(index / 2);
      const x = col === 0 ? 194 : 526;
      const y = 628 + row * 119;
      const bestStars = save.starsByDay[config.id] ?? 0;
      this.drawDayCard(config.id, dayNumber, config.title.replace(/^Day \d+ · /, ''), bestStars, unlocked, x, y);
    });

    const weekComplete = save.highestUnlockedDay >= 8;
    panel(this, 360, 1139, 650, 96, {
      fill: weekComplete ? art.sageLight : 0xeee1d2,
      stroke: weekComplete ? art.sage : 0xcdb49d,
      radius: 24,
      shadow: false,
    });
    this.add.text(76, 1115, weekComplete ? '🌿  NEW AREA DISCOVERED' : '🌙  AFTER THE FIRST WEEK', {
      fontFamily: font,
      fontSize: '13px',
      fontStyle: 'bold',
      color: weekComplete ? '#516748' : '#775f51',
    });
    this.add.text(76, 1144, 'Outdoor Terrace', {
      fontFamily: font,
      fontSize: '20px',
      fontStyle: 'bold',
      color: '#44342d',
    });
    pill(this, 592, 1140, weekComplete ? 'COMING NEXT' : 'LOCKED', {
      fill: weekComplete ? art.sage : art.woodDark,
      fontSize: '12px',
    });
  }

  private drawDayCard(
    dayId: string,
    dayNumber: number,
    title: string,
    stars: number,
    unlocked: boolean,
    x: number,
    y: number,
  ): void {
    const fill = unlocked ? art.paper : 0xe6ddd4;
    panel(this, x, y, 304, 94, {
      fill,
      stroke: unlocked ? 0xd5b99e : 0xc6bbb0,
      radius: 22,
      shadow: unlocked,
    });

    const badge = pill(this, x - 111, y - 26, `DAY ${dayNumber}`, {
      fill: unlocked ? art.terracotta : 0x9c938b,
      fontSize: '11px',
      paddingX: 9,
      paddingY: 5,
    });
    badge.setOrigin(0.5);

    this.add.text(x - 126, y - 2, unlocked ? title : 'Locked shift', {
      fontFamily: font,
      fontSize: '16px',
      fontStyle: 'bold',
      color: unlocked ? '#43332c' : '#827970',
    });
    this.add.text(x - 126, y + 25, unlocked ? starRow(stars) : '🔒', {
      fontFamily: font,
      fontSize: '18px',
      color: unlocked ? '#d49a3d' : '#8e857d',
    });

    if (unlocked) {
      const hit = this.add.rectangle(x, y, 304, 94, 0xffffff, 0.001)
        .setInteractive({ useHandCursor: true });
      hit.on('pointerover', () => hit.setAlpha(0.035));
      hit.on('pointerout', () => hit.setAlpha(0.001));
      hit.on('pointerup', () => this.startDay(dayId));
      this.add.text(x + 118, y + 24, '›', {
        fontFamily: font,
        fontSize: '30px',
        color: '#b86143',
      }).setOrigin(0.5);
    }
  }

  private startDay(dayId: string): void {
    this.cameras.main.fadeOut(150, 51, 40, 34);
    this.time.delayedCall(150, () => this.scene.start('day-intro', { dayId }));
  }
}
