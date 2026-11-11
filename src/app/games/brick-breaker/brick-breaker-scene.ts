import Phaser from 'phaser';
import { addBall, addBlock, brickFinishes, drawArena, paddleFinish } from './brick-breaker-art';
import { board, BrickBreakerGame, BrickBreakerLevel, GameStatus } from './brick-breaker-game';

const paddle = { width: 124, height: 16, y: 544, speed: 540 };
const ballRadius = 8;
const ballSpeed = 380;
const brickHeight = 28;
const brickGap = 9;
type StaticBlock = Phaser.GameObjects.Image & { body: Phaser.Physics.Arcade.StaticBody };

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
    backgroundColor: '#212c65',
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
    destroy: () => new Promise<void>((resolve) => {
      game.events.once(Phaser.Core.Events.DESTROY, () => resolve());
      game.destroy(false);
    }),
  };
}

class BrickBreakerScene extends Phaser.Scene {
  private readonly status: GameStatus;
  private bricks!: StaticBlock[];
  private bat!: StaticBlock;
  private ball!: Phaser.Physics.Arcade.Body;
  private readonly paddleWidth: number;
  private readonly speed: number;

  constructor(
    private readonly level: BrickBreakerLevel,
    private readonly direction: () => number,
    private readonly onStatus: (status: GameStatus) => void,
  ) {
    super('brick-breaker');
    this.status = { phase: 'ready', score: 0, lives: level.lives, remaining: 0 };
    this.paddleWidth = level.paddleWidth ?? paddle.width;
    this.speed = level.ballSpeed ?? ballSpeed;
  }

  create(): void {
    drawArena(this);
    this.bat = this.physics.add.existing(
      addBlock(this, 'paddle', board.width / 2, paddle.y, this.paddleWidth, paddle.height, paddleFinish), true,
    ) as StaticBlock;
    this.bricks = this.createBricks();
    this.status.remaining = this.bricks.length;

    const ball = addBall(this, ballRadius);
    this.physics.add.existing(ball);
    this.ball = (ball.body as Phaser.Physics.Arcade.Body)
      .setCircle(ballRadius).setBounce(1).setCollideWorldBounds(true);

    this.physics.world.setBoundsCollision(true, true, true, false);
    this.physics.add.collider(ball, this.bat, () => {
      const offset = Phaser.Math.Clamp((this.ball.center.x - this.bat.x) / (this.paddleWidth / 2), -1, 1);
      this.launchBall(offset * 1.05);
    }, () => this.ball.velocity.y > 0 && this.ball.prev.y + this.ball.height <= this.bat.body.top);
    this.physics.add.collider(ball, this.bricks, (_ball, brick) => {
      this.hitBrick(brick as StaticBlock);
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
    const edge = this.paddleWidth / 2;
    const center = Phaser.Math.Clamp(x, edge, board.width - edge);
    if (center === this.bat.x) return;
    this.bat.setX(center);
    this.bat.body.updateFromGameObject();
    if (this.status.phase === 'ready') this.parkBall();
  }

  private createBricks(): StaticBlock[] {
    const { rows, columns } = this.level;
    const layout = this.level.layout ?? Array.from({ length: rows }, () => '#'.repeat(columns));
    const fullWidth = (board.width - 84 - brickGap * (columns - 1)) / columns;
    const hasEmptyCells = layout.some((row) => row.includes('.'));
    const height = hasEmptyCells ? 32 : brickHeight;
    const width = hasEmptyCells ? Math.min(fullWidth, height) : fullWidth;
    const margin = (board.width - (columns * width + (columns - 1) * brickGap)) / 2;
    const bricks: StaticBlock[] = [];
    for (const [row, cells] of layout.entries()) {
      const finish = row % brickFinishes.length;
      for (let column = 0; column < cells.length; column++) {
        if (cells[column] !== '#') continue;
        const x = margin + width / 2 + column * (width + brickGap);
        const y = 77 + row * (height + brickGap);
        const brick = addBlock(this, `brick-${finish}`, x, y, width, height, brickFinishes[finish]);
        bricks.push(this.physics.add.existing(brick, true) as StaticBlock);
      }
    }
    return bricks;
  }

  private hitBrick(brick: StaticBlock): void {
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
    this.ball.setVelocity(Math.sin(angle) * this.speed, -Math.cos(angle) * this.speed);
  }

  private publishStatus(): void {
    this.onStatus({ ...this.status });
  }
}
