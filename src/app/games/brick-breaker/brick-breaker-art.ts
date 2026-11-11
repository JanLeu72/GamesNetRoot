import Phaser from 'phaser';
import { board } from './brick-breaker-game';

export const brickFinishes = [
  ['#ffc2af', '#f97882', '#b52f64'],
  ['#ffe6a3', '#ffb950', '#b85f24'],
  ['#b7ffda', '#55dcb5', '#197d84'],
  ['#b8f5ff', '#62c9ff', '#3866b8'],
  ['#e8c9ff', '#bd94ff', '#7145c4'],
] as const;

export const paddleFinish = ['#e8ffff', '#65ebeb', '#2879b4'] as const;
type Finish = readonly [highlight: string, face: string, edge: string];

export function drawArena(scene: Phaser.Scene): void {
  const { width, height } = board;
  const texture = scene.textures.createCanvas('arena', width, height)!;
  const ctx = texture.getContext();
  const sky = ctx.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, '#212c65');
  sky.addColorStop(0.57, '#34519a');
  sky.addColorStop(1, '#181f4a');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, height);

  const light = ctx.createRadialGradient(400, 210, 25, 400, 210, 405);
  light.addColorStop(0, '#92cfff59');
  light.addColorStop(1, '#92cfff00');
  ctx.fillStyle = light;
  ctx.fillRect(0, 0, width, height);

  // The floor lines converge behind the playfield.
  const horizon = 362;
  const floor = ctx.createLinearGradient(0, horizon, 0, height);
  floor.addColorStop(0, '#111b4300');
  floor.addColorStop(1, '#111b43c0');
  ctx.fillStyle = floor;
  ctx.fillRect(0, horizon, width, height - horizon);
  ctx.strokeStyle = '#b4dcff28';
  ctx.beginPath();
  for (let offset = -9; offset <= 9; offset++) {
    ctx.moveTo(width / 2 + offset * 9, horizon);
    ctx.lineTo(width / 2 + offset * 84, height);
  }
  for (const y of [380, 404, 436, 479, 535, 598]) {
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
  }
  ctx.stroke();

  const rails = ctx.createLinearGradient(0, 0, 0, height);
  rails.addColorStop(0, '#c6d6ff82');
  rails.addColorStop(0.7, '#98bdff42');
  rails.addColorStop(1, '#98bdff00');
  ctx.fillStyle = rails;
  ctx.fillRect(0, 0, 5, height);
  ctx.fillRect(width - 5, 0, 5, height);
  ctx.fillRect(0, 0, width, 3);
  texture.refresh();
  scene.add.image(0, 0, 'arena').setOrigin(0);
}

export function addBlock(
  scene: Phaser.Scene, key: string, x: number, y: number, width: number, height: number, finish: Finish,
): Phaser.GameObjects.Image {
  if (!scene.textures.exists(key)) {
    const w = Math.ceil(width);
    const h = Math.ceil(height);
    const texture = scene.textures.createCanvas(key, w, h)!;
    const ctx = texture.getContext();
    const radius = Math.min(7, h / 2);
    const [highlight, face, edge] = finish;

    ctx.fillStyle = edge;
    ctx.beginPath();
    ctx.roundRect(0, 0, w, h, radius);
    ctx.fill();

    const glaze = ctx.createLinearGradient(0, 0, 0, h - 3);
    glaze.addColorStop(0, highlight);
    glaze.addColorStop(0.42, face);
    glaze.addColorStop(1, edge);
    ctx.fillStyle = glaze;
    ctx.beginPath();
    ctx.roundRect(0, 0, w, h - 3, radius);
    ctx.fill();

    ctx.strokeStyle = '#ffffff9e';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(radius, 2.5);
    ctx.lineTo(w - radius, 2.5);
    ctx.stroke();
    texture.refresh();
  }
  return scene.add.image(x, y, key).setDisplaySize(width, height);
}

export function addBall(scene: Phaser.Scene, radius: number): Phaser.GameObjects.Image {
  const texture = scene.textures.createCanvas('ball', radius * 2, radius * 2)!;
  const ctx = texture.getContext();
  const light = ctx.createRadialGradient(radius * 0.65, radius * 0.55, 0, radius, radius, radius);
  light.addColorStop(0, '#ffffff');
  light.addColorStop(0.55, '#fff4c4');
  light.addColorStop(1, '#f5a851');
  ctx.fillStyle = light;
  ctx.beginPath();
  ctx.arc(radius, radius, radius, 0, 2 * Math.PI);
  ctx.fill();
  texture.refresh();
  return scene.add.image(0, 0, 'ball');
}
