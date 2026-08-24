import './styles.css';
import { createGame } from './game/createGame';

const bootScreen = document.querySelector<HTMLElement>('#boot-screen');
const bootStatus = document.querySelector<HTMLElement>('#boot-status');

function showBootError(message: string): void {
  console.error(message);
  if (bootStatus) bootStatus.textContent = message;
}

try {
  createGame('game');

  // Remove the HTML shell only after Phaser has had a chance to create the canvas.
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      if (document.querySelector('#game canvas')) {
        bootScreen?.remove();
      } else {
        showBootError('Could not open the restaurant. Please reload.');
      }
    });
  });
} catch (error) {
  console.error('Failed to start Service Rush', error);
  showBootError('Could not open the restaurant. Please reload.');
}
