import Phaser from 'phaser';

export const art = {
  bg: 0xf6efe6,
  paper: 0xfffbf5,
  cream: 0xfff2df,
  creamDeep: 0xf4dfc2,
  ink: 0x332822,
  cocoa: 0x4a382f,
  muted: 0x806c60,
  terracotta: 0xb86143,
  terracottaDark: 0x8d4936,
  coral: 0xd97a5d,
  sage: 0x78936d,
  sageLight: 0xdde8d6,
  gold: 0xd8a048,
  wood: 0xb98158,
  woodDark: 0x74513d,
  tile: 0xead8c2,
  shadow: 0x2d211b,
  danger: 0xb94f45,
} as const;

export const font = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

export function panel(
  scene: Phaser.Scene,
  x: number,
  y: number,
  width: number,
  height: number,
  options: {
    fill?: number;
    stroke?: number;
    radius?: number;
    alpha?: number;
    shadow?: boolean;
  } = {},
): Phaser.GameObjects.Graphics {
  const fill = options.fill ?? art.paper;
  const stroke = options.stroke ?? art.creamDeep;
  const radius = options.radius ?? 26;
  const alpha = options.alpha ?? 1;

  if (options.shadow !== false) {
    const shadow = scene.add.graphics();
    shadow.fillStyle(art.shadow, 0.10);
    shadow.fillRoundedRect(x - width / 2 + 5, y - height / 2 + 8, width, height, radius);
  }

  const g = scene.add.graphics();
  g.fillStyle(fill, alpha);
  g.fillRoundedRect(x - width / 2, y - height / 2, width, height, radius);
  g.lineStyle(2, stroke, 0.9);
  g.strokeRoundedRect(x - width / 2, y - height / 2, width, height, radius);
  return g;
}

export function pill(
  scene: Phaser.Scene,
  x: number,
  y: number,
  label: string,
  options: {
    fill?: number;
    color?: string;
    fontSize?: string;
    paddingX?: number;
    paddingY?: number;
  } = {},
): Phaser.GameObjects.Text {
  return scene.add.text(x, y, label, {
    fontFamily: font,
    fontSize: options.fontSize ?? '15px',
    fontStyle: 'bold',
    color: options.color ?? '#fff9f1',
    backgroundColor: `#${(options.fill ?? art.terracotta).toString(16).padStart(6, '0')}`,
    padding: { x: options.paddingX ?? 13, y: options.paddingY ?? 7 },
  }).setOrigin(0.5);
}

export function button(
  scene: Phaser.Scene,
  x: number,
  y: number,
  label: string,
  onTap: () => void,
  options: {
    fill?: number;
    color?: string;
    fontSize?: string;
    paddingX?: number;
    paddingY?: number;
  } = {},
): Phaser.GameObjects.Text {
  const value = pill(scene, x, y, label, {
    fill: options.fill ?? art.terracotta,
    color: options.color,
    fontSize: options.fontSize ?? '20px',
    paddingX: options.paddingX ?? 26,
    paddingY: options.paddingY ?? 14,
  }).setInteractive({ useHandCursor: true });

  value.on('pointerover', () => value.setScale(1.025));
  value.on('pointerout', () => value.setScale(1));
  value.on('pointerdown', () => value.setScale(0.98));
  value.on('pointerup', () => {
    value.setScale(1.025);
    onTap();
  });
  return value;
}

export function headerBand(scene: Phaser.Scene, eyebrow?: string): void {
  const g = scene.add.graphics();
  g.fillStyle(art.ink, 1);
  g.fillRect(0, 0, 720, 154);
  g.fillStyle(art.terracotta, 1);
  g.fillRect(0, 148, 720, 6);
  if (eyebrow) {
    scene.add.text(34, 112, eyebrow, {
      fontFamily: font,
      fontSize: '12px',
      fontStyle: 'bold',
      letterSpacing: 2,
      color: '#dcbf9d',
    });
  }
}

export function sectionTitle(scene: Phaser.Scene, x: number, y: number, label: string): Phaser.GameObjects.Text {
  return scene.add.text(x, y, label, {
    fontFamily: font,
    fontSize: '18px',
    fontStyle: 'bold',
    color: '#4a382f',
    letterSpacing: 1,
  });
}

export function addFloorPattern(scene: Phaser.Scene, top = 154, bottom = 1280): void {
  const g = scene.add.graphics();
  g.fillStyle(art.bg, 1);
  g.fillRect(0, top, 720, bottom - top);
  g.lineStyle(1, art.tile, 0.35);
  const size = 48;
  for (let y = top; y < bottom; y += size) g.lineBetween(0, y, 720, y);
  for (let x = 0; x < 720; x += size) g.lineBetween(x, top, x, bottom);
}

export function starRow(stars: number): string {
  return `${'★'.repeat(stars)}${'☆'.repeat(Math.max(0, 3 - stars))}`;
}
