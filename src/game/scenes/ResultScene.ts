import Phaser from 'phaser';
import { campaignDays } from '../../content/campaignDays';
import { dayConfigs } from '../../content/dayConfigs';
import type { UpgradeDefinition } from '../../content/upgrades';
import { SaveManager } from '../../core/save/SaveManager';
import type { SaveData } from '../../core/save/SaveSchema';
import {
  completeShift,
  dayIdFromNumber,
  numberFromDayId,
  purchaseUpgrade,
  shopUpgrades,
} from '../../systems/progression/ProgressionSystem';

interface ResultSceneData {
  dayId?: string;
  score?: number;
  shiftCoins?: number;
  regularCompleted?: boolean;
  regularName?: string;
  regularIcon?: string;
  regularBonusScore?: number;
  regularBonusCoins?: number;
}

export class ResultScene extends Phaser.Scene {
  private readonly saveManager = new SaveManager();
  private save?: SaveData;
  private coinText?: any;
  private shopStatus?: any;

  constructor() {
    super('result');
  }

  create(data: ResultSceneData): void {
    const config = dayConfigs[data.dayId ?? 'day-01'] ?? dayConfigs['day-01'];
    const completion = completeShift(
      this.saveManager.load(),
      config,
      Math.max(0, data.score ?? 0),
      Math.max(0, data.shiftCoins ?? 0),
    );
    this.save = completion.save;
    this.saveManager.save(completion.save);

    const result = completion.result;
    const campaign = campaignDays[config.id];
    const dayNumber = numberFromDayId(config.id);
    const nextDayId = dayIdFromNumber(dayNumber + 1);
    const nextConfig = dayConfigs[nextDayId];

    this.cameras.main.setBackgroundColor('#f3e6d7');
    this.add.rectangle(360, 88, 720, 176, 0x3e302a);
    this.add.text(360, 40, 'SHIFT COMPLETE', {
      fontFamily: 'system-ui',
      fontSize: '34px',
      fontStyle: 'bold',
      color: '#fff5e8',
    }).setOrigin(0.5);
    this.add.text(360, 96, config.title, {
      fontFamily: 'system-ui',
      fontSize: '20px',
      color: '#ebcfae',
    }).setOrigin(0.5);

    this.add.rectangle(360, 325, 620, 250, 0xfff8ed).setStrokeStyle(4, 0xc69a72);
    this.add.text(360, 235, `${'★'.repeat(result.stars)}${'☆'.repeat(3 - result.stars)}`, {
      fontFamily: 'system-ui',
      fontSize: '54px',
      color: '#c7832f',
    }).setOrigin(0.5);
    this.add.text(360, 310, `SCORE  ${result.score}`, {
      fontFamily: 'system-ui',
      fontSize: '28px',
      fontStyle: 'bold',
      color: '#49362d',
    }).setOrigin(0.5);
    this.add.text(360, 360, `Shift cash ${result.shiftCoins}   ·   Total payout +${result.rewardCoins}`, {
      fontFamily: 'system-ui',
      fontSize: '19px',
      color: '#765b4c',
    }).setOrigin(0.5);
    if (result.stars > result.previousBestStars) {
      this.add.text(360, 410, 'NEW BEST ⭐', {
        fontFamily: 'system-ui',
        fontSize: '18px',
        fontStyle: 'bold',
        color: '#9c6431',
      }).setOrigin(0.5);
    }

    if (campaign?.eventLabel && config.id === 'day-07') {
      const approved = result.stars >= (campaign.achievementStars ?? 2);
      this.add.text(360, 452, approved ? '🏅 CRITIC APPROVED · “A restaurant worth returning to.”' : '🕵️ CRITIC VERDICT · “Promising. Keep improving.”', {
        fontFamily: 'system-ui',
        fontSize: '15px',
        fontStyle: 'bold',
        color: approved ? '#48633f' : '#785d50',
        backgroundColor: approved ? '#ddebd7' : '#eadfd4',
        padding: { x: 14, y: 9 },
      }).setOrigin(0.5);
    } else if (data.regularCompleted && data.regularName) {
      this.add.text(
        360,
        452,
        `${data.regularIcon ?? '★'} ${data.regularName} returned · +${data.regularBonusScore ?? 0} score · +${data.regularBonusCoins ?? 0} coins`,
        {
          fontFamily: 'system-ui',
          fontSize: '15px',
          fontStyle: 'bold',
          color: '#506548',
          backgroundColor: '#dde8d6',
          padding: { x: 14, y: 9 },
        },
      ).setOrigin(0.5);
    }

    this.coinText = this.add.text(360, 510, `YOUR COINS  💰 ${this.save.coins}`, {
      fontFamily: 'system-ui',
      fontSize: '24px',
      fontStyle: 'bold',
      color: '#4b382f',
    }).setOrigin(0.5);

    this.add.text(42, 565, 'UPGRADE THE RESTAURANT', {
      fontFamily: 'system-ui',
      fontSize: '21px',
      fontStyle: 'bold',
      color: '#4b382f',
    });
    this.add.text(42, 598, 'Choose style or a small service boost. You still run every table yourself.', {
      fontFamily: 'system-ui',
      fontSize: '15px',
      color: '#80695b',
    });

    const offers = shopUpgrades(this.save, 3);
    offers.forEach((upgrade, index) => this.createUpgradeCard(upgrade, 680 + index * 128));

    this.shopStatus = this.add.text(360, 1052, result.achievementUnlocked ? 'Achievement unlocked: 🏅 Critic Approved' : '', {
      fontFamily: 'system-ui',
      fontSize: '17px',
      color: result.achievementUnlocked ? '#4f7048' : '#9d4e3f',
    }).setOrigin(0.5);

    const home = this.add.text(nextConfig ? 220 : 360, 1145, '🏠  HOME', {
      fontFamily: 'system-ui',
      fontSize: '22px',
      fontStyle: 'bold',
      color: '#fff8ec',
      backgroundColor: '#6b5145',
      padding: { x: 28, y: 16 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    home.on('pointerup', () => this.scene.start('home'));

    if (nextConfig) {
      this.add.text(500, 1145, 'NEXT DAY  →', {
        fontFamily: 'system-ui',
        fontSize: '22px',
        fontStyle: 'bold',
        color: '#fff8ec',
        backgroundColor: '#a16446',
        padding: { x: 28, y: 16 },
      }).setOrigin(0.5).setInteractive({ useHandCursor: true })
        .on('pointerup', () => this.scene.start('day-intro', { dayId: nextDayId }));
    } else {
      this.add.text(360, 1220, 'FIRST WEEK COMPLETE · Outdoor Terrace discovered 🔒', {
        fontFamily: 'system-ui',
        fontSize: '17px',
        color: '#64775c',
      }).setOrigin(0.5);
    }
  }

  private createUpgradeCard(upgrade: UpgradeDefinition, y: number): void {
    const card = this.add.rectangle(360, y, 620, 104, 0xfff8ed).setStrokeStyle(3, 0xc9a17e);
    const icon = this.add.text(86, y, upgrade.icon, {
      fontFamily: 'system-ui',
      fontSize: '40px',
    }).setOrigin(0.5);
    const kindLabel = this.add.text(135, y - 37, upgrade.kind === 'service' ? 'SERVICE' : 'STYLE', {
      fontFamily: 'system-ui',
      fontSize: '11px',
      fontStyle: 'bold',
      color: upgrade.kind === 'service' ? '#4f7048' : '#8b674f',
    });
    const title = this.add.text(135, y - 18, upgrade.title, {
      fontFamily: 'system-ui',
      fontSize: '19px',
      fontStyle: 'bold',
      color: '#49362d',
    });
    const detail = upgrade.benefitLabel
      ? `${upgrade.description}\n${upgrade.benefitLabel}`
      : upgrade.description;
    const description = this.add.text(135, y + 9, detail, {
      fontFamily: 'system-ui',
      fontSize: '13px',
      color: '#7b6456',
      wordWrap: { width: 330 },
      lineSpacing: 3,
    });
    const action = this.add.text(630, y, '', {
      fontFamily: 'system-ui',
      fontSize: '17px',
      fontStyle: 'bold',
      align: 'center',
      padding: { x: 14, y: 10 },
    }).setOrigin(1, 0.5);

    const refresh = (): void => {
      const owned = this.save?.unlockedUpgrades.includes(upgrade.id) ?? false;
      if (owned) {
        card.setFillStyle(0xe6efdd);
        action.setText('OWNED ✓').setColor('#42623c').setBackgroundColor('#d7e6cc');
        card.disableInteractive();
      } else {
        card.setFillStyle(upgrade.kind === 'service' ? 0xf3f8ee : 0xfff8ed);
        action.setText(`💰 ${upgrade.cost}`).setColor('#fff8ed').setBackgroundColor('#9b6348');
        card.setInteractive({ useHandCursor: true });
      }
      icon.setAlpha(owned ? 1 : 0.9);
      kindLabel.setAlpha(1);
      title.setAlpha(1);
      description.setAlpha(1);
    };

    card.on('pointerup', () => {
      if (!this.save) return;
      const purchase = purchaseUpgrade(this.save, upgrade.id);
      if (!purchase.success) {
        this.shopStatus?.setColor('#9d4e3f').setText(
          purchase.reason === 'insufficient-coins'
            ? 'Not enough coins yet — one more shift!'
            : purchase.reason === 'locked'
              ? 'Keep playing to unlock this upgrade.'
              : '',
        );
        return;
      }
      this.save = purchase.save;
      this.saveManager.save(this.save);
      this.coinText?.setText(`YOUR COINS  💰 ${this.save.coins}`);
      const benefit = upgrade.benefitLabel ? ` · ${upgrade.benefitLabel}` : '';
      this.shopStatus?.setColor('#4f7048').setText(`${upgrade.icon} ${upgrade.title} added${benefit}`);
      refresh();
    });

    refresh();
  }
}
