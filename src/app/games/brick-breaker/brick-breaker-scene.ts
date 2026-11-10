import Phaser from 'phaser';
import { board, BrickBreakerGame, BrickBreakerLevel, GameStatus } from './brick-breaker-game';

const paddle = { width: 124, height: 16, y: 544, speed: 540 };
const ballRadius = 8;
const ballSpeed = 380;
const brickHeight = 28;
const brickGap = 9;
const brickColors = [0xf472b6, 0xc084fc, 0x818cf8, 0x22d3ee];

type StaticRectangle = Phaser.GameObjects.Rectangle & { body: Phaser.Physics.Arcade.StaticBody };

export function createBrickBreakerGame(
  canvas: HTMLCanvasElement,
  level: BrickBreakerLevel,
  direction: () => number,
  onStatus: (status: GameStatus) => void,
): BrickBreakerGame {
  const scene = new BrickBreakerScene(level, direction, onStatus);
  const game = new Phaser.Game({
    type: Phaser.CANVAS,
    canvas,
    ...board,
    backgroundColor: '#080f23',
    banner: false,
    input: { keyboard: false, mouse: false, touch: false },
    audio: { noAudio: true },
    physics: { default: 'arcade', arcade: { fps: 240 } },
    scene,
  });

  return {
    start: () => scene.start(),
    pause: () => scene.pause(),
    movePaddle: (x: number) => scene.movePaddle(x),
    destroy: () => game.destroy(false),
  };
}

class BrickBreakerScene extends Phaser.Scene {
  private readonly status: GameStatus;
  private bricks!: StaticRectangle[];
  private bat!: StaticRectangle;
  private ball!: Phaser.Physics.Arcade.Body;

  constructor(
    private readonly level: BrickBreakerLevel,
    private readonly direction: () => number,
    private readonly onStatus: (status: GameStatus) => void,
  ) {
    super('brick-breaker');
    this.status = { phase: 'ready', score: 0, lives: level.lives, remaining: level.rows * level.columns };
  }

  create(): void {
    this.add.grid(board.width / 2, board.height / 2, board.width, board.height, 40, 40)
      .setStrokeStyle(1, 0x172640, 0.8);
    this.bat = this.addStaticRectangle(board.width / 2, paddle.y, paddle.width, paddle.height, 0x22d3ee);
    this.bricks = this.createBricks();

    const ball = this.add.circle(0, 0, ballRadius, 0xf0fdff).setStrokeStyle(1, 0x67e8f9);
    this.physics.add.existing(ball);
    this.ball = (ball.body as Phaser.Physics.Arcade.Body)
      .setCircle(ballRadius).setBounce(1).setCollideWorldBounds(true);

    this.physics.world.setBoundsCollision(true, true, true, false);
    this.physics.add.collider(ball, this.bat, () => {
      const offset = Phaser.Math.Clamp((this.ball.center.x - this.bat.x) / (paddle.width / 2), -1, 1);
      this.launchBall(offset * 1.05);
    }, () => this.ball.velocity.y > 0 && this.ball.prev.y + this.ball.height <= this.bat.body.top);
    this.physics.add.collider(ball, this.bricks, (_ball, brick) => {
      this.hitBrick(brick as StaticRectangle);
    }, () => this.status.phase === 'playing');

    this.physics.pause();
    this.parkBall();
    this.events.on(Phaser.Scenes.Events.PRE_UPDATE, (_time: number, delta: number) => {
      const direction = this.direction();
      if (direction) this.movePaddle(this.bat.x + direction * paddle.speed * Math.min(delta, 50) / 1000);
    });
    this.publishStatus();
  }

  override update(): void {
    if (this.status.phase !== 'playing' || this.ball.top < board.height) return;
    this.status.lives--;
    this.physics.pause();
    this.status.phase = this.status.lives > 0 ? 'ready' : 'lost';
    if (this.status.phase === 'ready') this.parkBall();
    this.publishStatus();
  }

  start(): void {
    if (!this.ball || this.status.phase === 'playing') return;
    if (this.status.phase === 'won' || this.status.phase === 'lost') this.resetLevel();
    if (this.status.phase === 'ready') this.launchBall(0.48);
    this.status.phase = 'playing';
    this.physics.resume();
    this.publishStatus();
  }

  pause(): void {
    if (this.status.phase !== 'playing') return;
    this.physics.pause();
    this.status.phase = 'paused';
    this.publishStatus();
  }

  movePaddle(x: number): void {
    if (!this.bat || (this.status.phase !== 'ready' && this.status.phase !== 'playing')) return;
    const edge = paddle.width / 2;
    const center = Phaser.Math.Clamp(x, edge, board.width - edge);
    if (center === this.bat.x) return;
    this.bat.setX(center);
    this.bat.body.updateFromGameObject();
    if (this.status.phase === 'ready') this.parkBall();
  }

  private createBricks(): StaticRectangle[] {
    const { rows, columns } = this.level;
    const margin = 42;
    const width = (board.width - margin * 2 - brickGap * (columns - 1)) / columns;
    return Array.from({ length: rows * columns }, (_, index) => {
      const row = Math.floor(index / columns);
      const column = index % columns;
      const x = margin + width / 2 + column * (width + brickGap);
      const y = 77 + row * (brickHeight + brickGap);
      return this.addStaticRectangle(x, y, width, brickHeight, brickColors[row % brickColors.length]);
    });
  }

  private addStaticRectangle(x: number, y: number, width: number, height: number, color: number) {
    const rectangle = this.add.rectangle(x, y, width, height, color).setStrokeStyle(2, 0xffffff, 0.25);
    return this.physics.add.existing(rectangle, true) as StaticRectangle;
  }

  private hitBrick(brick: StaticRectangle): void {
    brick.setVisible(false);
    brick.body.enable = false;
    this.status.score += 100;
    this.status.remaining--;
    if (this.status.remaining === 0) {
      this.status.phase = 'won';
      this.ball.stop();
      this.physics.pause();
    }
    this.publishStatus();
  }

  private resetLevel(): void {
    this.status.phase = 'ready';
    this.status.score = 0;
    this.status.lives = this.level.lives;
    this.status.remaining = this.bricks.length;
    for (const brick of this.bricks) {
      brick.setVisible(true);
      brick.body.enable = true;
    }
    this.movePaddle(board.width / 2);
    this.parkBall();
  }

  private parkBall(): void {
    this.ball.reset(this.bat.x, this.bat.body.top - ballRadius - 2);
  }

  private launchBall(angle: number): void {
    this.ball.setVelocity(Math.sin(angle) * ballSpeed, -Math.cos(angle) * ballSpeed);
  }

  private publishStatus(): void {
    this.onStatus({ ...this.status });
  }
}
