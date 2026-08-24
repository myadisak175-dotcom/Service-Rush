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
import { art, button, font, headerBand, panel, pill, sectionTitle, starRow } from '../ui/ArtTheme';

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

    this.cameras.main.setBackgroundColor('#f6efe6');
    headerBand(this, `DAY ${dayNumber} · SERVICE CLOSED`);
    this.add.text(34, 28, 'SHIFT COMPLETE', {
      fontFamily: font,
      fontSize: '31px',
      fontStyle: 'bold',
      color: '#fff8ef',
    });
    this.add.text(34, 72, config.title, {
      fontFamily: font,
      fontSize: '16px',
      color: '#d7b99a',
    });

    panel(this, 360, 330, 640, 286, { fill: art.paper, stroke: art.creamDeep, radius: 32 });
    this.add.text(360, 220, starRow(result.stars), {
      fontFamily: font,
      fontSize: '55px',
      color: '#d8a048',
    }).setOrigin(0.5);
    this.add.text(360, 293, `${result.score}`, {
      fontFamily: font,
      fontSize: '42px',
      fontStyle: 'bold',
      color: '#3f3029',
    }).setOrigin(0.5);
    this.add.text(360, 335, 'SERVICE SCORE', {
      fontFamily: font,
      fontSize: '12px',
      fontStyle: 'bold',
      letterSpacing: 2,
      color: '#8c7567',
    }).setOrigin(0.5);

    pill(this, 237, 393, `SHIFT  💰 ${result.shiftCoins}`, {
      fill: art.woodDark,
      fontSize: '14px',
    });
    pill(this, 483, 393, `PAYOUT  +${result.rewardCoins}`, {
      fill: art.terracotta,
      fontSize: '14px',
    });

    if (result.stars > result.previousBestStars) {
      pill(this, 360, 444, '✨ NEW BEST', { fill: art.sage, fontSize: '13px' });
    }

    this.drawSpecialResult(data, config.id, campaign?.achievementStars, result.stars);

    this.coinText = this.add.text(676, 167, `💰 ${this.save.coins}`, {
      fontFamily: font,
      fontSize: '20px',
      fontStyle: 'bold',
      color: '#5a4438',
    }).setOrigin(1, 0);

    sectionTitle(this, 40, 550, 'UPGRADE THE RESTAURANT');
    this.add.text(680, 553, 'choose style or service', {
      fontFamily: font,
      fontSize: '13px',
      color: '#8b7769',
    }).setOrigin(1, 0);

    const offers = shopUpgrades(this.save, 3);
    if (offers.length) {
      offers.forEach((upgrade, index) => this.createUpgradeCard(upgrade, 648 + index * 132));
    } else {
      panel(this, 360, 760, 620, 170, { fill: 0xeee4d8, stroke: 0xd6c4b3, radius: 28 });
      this.add.text(360, 735, '✨ Everything available is already yours.', {
        fontFamily: font,
        fontSize: '20px',
        fontStyle: 'bold',
        color: '#514038',
      }).setOrigin(0.5);
      this.add.text(360, 780, 'Keep earning stars — the terrace will bring a new shop tier.', {
        fontFamily: font,
        fontSize: '14px',
        color: '#806d61',
      }).setOrigin(0.5);
    }

    this.shopStatus = this.add.text(360, 1045, result.achievementUnlocked ? '🏅 Critic Approved unlocked' : '', {
      fontFamily: font,
      fontSize: '15px',
      fontStyle: 'bold',
      color: result.achievementUnlocked ? '#506548' : '#9d4e3f',
    }).setOrigin(0.5);

    button(this, nextConfig ? 220 : 360, 1142, '🏠  HOME', () => this.scene.start('home'), {
      fill: art.cocoa,
      fontSize: '19px',
      paddingX: 25,
      paddingY: 14,
    });

    if (nextConfig) {
      button(this, 500, 1142, 'NEXT DAY  →', () => this.scene.start('day-intro', { dayId: nextDayId }), {
        fill: art.terracotta,
        fontSize: '19px',
        paddingX: 25,
        paddingY: 14,
      });
    } else {
      pill(this, 360, 1212, '🌿 FIRST WEEK COMPLETE · OUTDOOR TERRACE DISCOVERED', {
        fill: art.sage,
        fontSize: '12px',
      });
    }

    this.cameras.main.fadeIn(260, 246, 239, 230);
  }

  private drawSpecialResult(
    data: ResultSceneData,
    dayId: string,
    achievementStars: number | undefined,
    stars: number,
  ): void {
    if (dayId === 'day-07') {
      const approved = stars >= (achievementStars ?? 2);
      pill(this, 360, 493, approved
        ? '🏅 CRITIC APPROVED · worth returning to'
        : '🕵️ CRITIC VERDICT · promising, keep improving', {
        fill: approved ? art.sage : art.woodDark,
        fontSize: '13px',
        paddingX: 16,
        paddingY: 8,
      });
      return;
    }

    if (data.regularCompleted && data.regularName) {
      pill(this, 360, 493,
        `${data.regularIcon ?? '★'} ${data.regularName} returned  ·  +${data.regularBonusScore ?? 0} score  ·  +${data.regularBonusCoins ?? 0} coins`, {
          fill: art.sage,
          fontSize: '12px',
          paddingX: 15,
          paddingY: 8,
        });
    }
  }

  private createUpgradeCard(upgrade: UpgradeDefinition, y: number): void {
    const owned = this.save?.unlockedUpgrades.includes(upgrade.id) ?? false;
    panel(this, 360, y, 620, 112, {
      fill: owned ? art.sageLight : upgrade.kind === 'service' ? 0xf0f5eb : art.paper,
      stroke: owned ? 0xa9bea0 : 0xd3b99f,
      radius: 25,
    });

    this.add.text(88, y, upgrade.icon, {
      fontFamily: font,
      fontSize: '39px',
    }).setOrigin(0.5);

    pill(this, 165, y - 35, upgrade.kind === 'service' ? 'SERVICE' : 'STYLE', {
      fill: upgrade.kind === 'service' ? art.sage : art.wood,
      fontSize: '9px',
      paddingX: 8,
      paddingY: 4,
    });

    this.add.text(132, y - 14, upgrade.title, {
      fontFamily: font,
      fontSize: '18px',
      fontStyle: 'bold',
      color: '#44342d',
    });
    const detail = upgrade.benefitLabel
      ? `${upgrade.description}\n${upgrade.benefitLabel}`
      : upgrade.description;
    this.add.text(132, y + 15, detail, {
      fontFamily: font,
      fontSize: '12px',
      color: '#776459',
      wordWrap: { width: 335 },
      lineSpacing: 3,
    });

    const action = pill(this, 582, y, owned ? 'OWNED ✓' : `💰 ${upgrade.cost}`, {
      fill: owned ? art.sage : art.terracotta,
      fontSize: '13px',
      paddingX: 13,
      paddingY: 8,
    });

    if (owned) return;

    const hit = this.add.rectangle(360, y, 620, 112, 0xffffff, 0.001)
      .setInteractive({ useHandCursor: true });
    hit.on('pointerup', () => {
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
      this.coinText?.setText(`💰 ${this.save.coins}`);
      action.setText('OWNED ✓').setBackgroundColor('#78936d');
      hit.disableInteractive();
      const benefit = upgrade.benefitLabel ? ` · ${upgrade.benefitLabel}` : '';
      this.shopStatus?.setColor('#506548').setText(`${upgrade.icon} ${upgrade.title} added${benefit}`);
    });
  }
}
