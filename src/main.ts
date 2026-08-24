import './styles.css';

const bootScreen = document.querySelector<HTMLElement>('#boot-screen');
const bootStatus = document.querySelector<HTMLElement>('#boot-status');

async function start(): Promise<void> {
  try {
    // Keep the initial entry tiny so the loading shell can paint before Phaser is parsed.
    const { createGame } = await import('./game/createGame');
    createGame('game');

    requestAnimationFrame(() => {
      bootScreen?.remove();
    });
  } catch (error) {
    console.error('Failed to start Service Rush', error);
    if (bootStatus) {
      bootStatus.textContent = 'Could not open the restaurant. Please reload.';
    }
  }
}

void start();
