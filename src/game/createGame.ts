import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { HomeScene } from './scenes/HomeScene';
import { RestaurantScene } from './scenes/RestaurantScene';
import { ResultScene } from './scenes/ResultScene';
import { ShiftOverlayScene } from './scenes/ShiftOverlayScene';

export function createGame(parent: string): Phaser.Game {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    backgroundColor: '#f6efe5',
    width: 720,
    height: 1280,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_HORIZONTALLY,
    },
    input: {
      activePointers: 3,
    },
    scene: [BootScene, HomeScene, RestaurantScene, ShiftOverlayScene, ResultScene],
  });
}
