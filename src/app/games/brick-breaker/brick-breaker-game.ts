import { InjectionToken } from '@angular/core';

export interface BrickBreakerLevel {
  level: number;
  rows: number;
  columns: number;
  lives: number;
  layout?: string[];
  ballSpeed?: number;
  paddleWidth?: number;
  hasNext?: boolean;
  bestScore?: number;
}

export interface GameStatus {
  phase: 'ready' | 'playing' | 'paused' | 'won' | 'lost';
  score: number;
  lives: number;
  remaining: number;
}

export interface BrickBreakerGame {
  start(): void;
  pause(): void;
  movePaddle(x: number): void;
  destroy(): void | Promise<void>;
}

type GameFactory = (
  canvas: HTMLCanvasElement,
  level: BrickBreakerLevel,
  direction: () => number,
  onStatus: (status: GameStatus) => void,
) => BrickBreakerGame;

export const board = { width: 800, height: 600 };

export const loadBrickBreakerGame = new InjectionToken<() => Promise<GameFactory>>(
  'Brick Breaker game loader',
  { factory: () => async () => (await import('./brick-breaker-scene')).createBrickBreakerGame },
);
