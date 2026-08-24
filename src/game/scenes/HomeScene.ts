import Phaser from 'phaser';
import { dayConfigs } from '../../content/dayConfigs';
import { upgrades } from '../../content/upgrades';
import { SaveManager } from '../../core/save/SaveManager';
import type { SaveData } from '../../core/save/SaveSchema';
import { numberFromDayId, totalStars } from '../../systems/progression/ProgressionSystem';

export class HomeScene extends Phaser.Scene {
  private readonly saveManager = new SaveManager();

  constructor() {
    super('home');
  }

  create(): void {
    const save = this.saveManager.load();
    this.cameras.main.setBackgroundColor('#f5eadc');

    this.add.rectangle(360, 78, 720, 156, 0x3d2f2a);
    this.add.text(34, 25, 'SERVICE RUSH', {
      fontFamily: 'system-ui',
      fontSize: '36px',
      fontStyle: 'bold',
      color: '#fff5e8',
    });
    this.add.text(34, 79, 'Your little restaurant · make it yours', {
      fontFamily: 'system-ui',
      fontSize: '18px',
      color: '#e8c8a2',
    });
    this.add.text(676, 31, `💰 ${save.coins}\n⭐ ${totalStars(save)}`, {
      fontFamily: 'system-ui',
      fontSize: '22px',
      fontStyle: 'bold',
      align: 'right',
      color: '#fff1d9',
      lineSpacing: 9,
    }).setOrigin(1, 0);

    this.drawRestaurantPreview(save);
    this.drawDaySelect(save);
  }

  private drawRestaurantPreview(save: SaveData): void {
    this.add.text(42, 190, 'YOUR RESTAURANT', {
      fontFamily: 'system-ui',
      fontSize: '22px',
      fontStyle: 'bold',
      color: '#4a362d',
    });

    this.add.rectangle(360, 385, 640, 340, 0xfbf2e4)
      .setStrokeStyle(4, 0xc6a27c);
    this.add.rectangle(360, 265, 560, 70, 0xdcae79).setStrokeStyle(3, 0x93684b);
    this.add.text(360, 264, 'SERVICE RUSH · OPEN', {
      fontFamily: 'system-ui',
      fontSize: '24px',
      fontStyle: 'bold',
      color: '#49352c',
    }).setOrigin(0.5);

    const tableStyle = { fontFamily: 'system-ui', fontSize: '43px' };
    this.add.text(238, 390, '🪑🍜🪑', tableStyle).setOrigin(0.5);
    this.add.text(482, 390, '🪑🍵🪑', tableStyle).setOrigin(0.5);
    this.add.text(360, 495, '🛎️  👨‍🍳', {
      fontFamily: 'system-ui',
      fontSize: '39px',
    }).setOrigin(0.5);

    if (save.unlockedUpgrades.includes('window-plants')) {
      this.add.text(95, 326, '🪴', { fontFamily: 'system-ui', fontSize: '50px' }).setOrigin(0.5);
      this.add.text(625, 326, '🪴', { fontFamily: 'system-ui', fontSize: '50px' }).setOrigin(0.5);
    }
    if (save.unlockedUpgrades.includes('warm-lights')) {
      this.add.text(360, 320, '✨   ✨   ✨', {
        fontFamily: 'system-ui',
        fontSize: '29px',
      }).setOrigin(0.5);
    }
    if (save.unlockedUpgrades.includes('chef-board')) {
      this.add.text(595, 505, '📋\nSPECIALS', {
        fontFamily: 'system-ui',
        fontSize: '20px',
        align: 'center',
        color: '#fff4da',
        backgroundColor: '#4c3b32',
        padding: { x: 10, y: 8 },
      }).setOrigin(0.5);
    }

    const owned = upgrades.filter((upgrade) => save.unlockedUpgrades.includes(upgrade.id));
    const ownershipText = owned.length
      ? `Restaurant upgrades: ${owned.map((entry) => entry.icon).join(' ')}`
      : 'Complete a shift to earn coins and decorate your restaurant.';
    this.add.text(360, 562, ownershipText, {
      fontFamily: 'system-ui',
      fontSize: '17px',
      color: '#785f50',
      align: 'center',
    }).setOrigin(0.5);
  }

  private drawDaySelect(save: SaveData): void {
    this.add.text(42, 605, 'OPEN FOR SERVICE', {
      fontFamily: 'system-ui',
      fontSize: '22px',
      fontStyle: 'bold',
      color: '#4a362d',
    });

    const configs = Object.values(dayConfigs).sort(
      (a, b) => numberFromDayId(a.id) - numberFromDayId(b.id),
    );

    configs.forEach((config, index) => {
      const dayNumber = numberFromDayId(config.id);
      const unlocked = dayNumber <= save.highestUnlockedDay;
      const col = index % 2;
      const row = Math.floor(index / 2);
      const x = col === 0 ? 195 : 525;
      const y = 715 + row * 148;
      const bestStars = save.starsByDay[config.id] ?? 0;

      const card = this.add.rectangle(x, y, 294, 122, unlocked ? 0xfff8ed : 0xd8cec2)
        .setStrokeStyle(3, unlocked ? 0xb6815f : 0xa89d92);
      const title = config.title.replace(/^Day \d+ · /, '');
      this.add.text(x - 122, y - 39, `DAY ${dayNumber}`, {
        fontFamily: 'system-ui',
        fontSize: '16px',
        fontStyle: 'bold',
        color: unlocked ? '#8f583e' : '#8c837c',
      });
      this.add.text(x - 122, y - 10, unlocked ? title : 'LOCKED', {
        fontFamily: 'system-ui',
        fontSize: '19px',
        fontStyle: 'bold',
        color: unlocked ? '#49362d' : '#837a73',
      });
      this.add.text(x - 122, y + 27, unlocked ? `${'★'.repeat(bestStars)}${'☆'.repeat(3 - bestStars)}` : '🔒', {
        fontFamily: 'system-ui',
        fontSize: '21px',
        color: unlocked ? '#c88933' : '#80766f',
      });

      if (unlocked) {
        card.setInteractive({ useHandCursor: true }).on('pointerup', () => this.startDay(config.id));
      }
    });

    this.add.rectangle(360, 1164, 640, 92, 0xe5d4c2).setStrokeStyle(2, 0xc5a88b);
    this.add.text(360, 1146, 'NEXT · DAY 7', {
      fontFamily: 'system-ui',
      fontSize: '17px',
      fontStyle: 'bold',
      color: '#7c5d4b',
    }).setOrigin(0.5);
    this.add.text(360, 1181, 'Special Guest  🔒  Coming in the retention milestone', {
      fontFamily: 'system-ui',
      fontSize: '16px',
      color: '#856f61',
    }).setOrigin(0.5);
  }

  private startDay(dayId: string): void {
    this.scene.launch('restaurant', { dayId });
    this.scene.launch('shift-overlay', { dayId });
    this.scene.stop();
  }
}
