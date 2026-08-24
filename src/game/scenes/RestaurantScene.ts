import Phaser from 'phaser';
import { dayConfigs } from '../../content/dayConfigs';
import { GameSession } from '../session/GameSession';

interface RestaurantSceneData {
  dayId?: string;
}

export class RestaurantScene extends Phaser.Scene {
  private session?: GameSession;

  constructor() {
    super('restaurant');
  }

  create(data: RestaurantSceneData): void {
    const config = dayConfigs[data.dayId ?? 'day-01'] ?? dayConfigs['day-01'];
    this.session = new GameSession(config);

    this.add.text(360, 170, 'SERVICE RUSH', {
      fontFamily: 'system-ui',
      fontSize: '54px',
      color: '#3b2c24',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(360, 250, `${config.title}\nArchitecture foundation ready`, {
      align: 'center',
      fontFamily: 'system-ui',
      fontSize: '28px',
      color: '#6a5448',
      lineSpacing: 14,
    }).setOrigin(0.5);

    this.add.text(360, 480, 'Next implementation milestone:\nport the validated prototype loop into modular systems.', {
      align: 'center',
      fontFamily: 'system-ui',
      fontSize: '24px',
      color: '#745f53',
      wordWrap: { width: 560 },
      lineSpacing: 12,
    }).setOrigin(0.5);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.session?.destroy();
      this.session = undefined;
    });
  }

  update(_time: number, delta: number): void {
    this.session?.update(delta);
  }
}
