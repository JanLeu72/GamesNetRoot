import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import {
  afterNextRender,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  NgZone,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AuthenticationService } from '../../auth/authentication.service';
import { board, BrickBreakerGame, BrickBreakerLevel, GameStatus, loadBrickBreakerGame } from './brick-breaker-game';

const leftKeys = ['arrowleft', 'a'];
const rightKeys = ['arrowright', 'd'];

@Component({
  imports: [RouterLink],
  selector: 'app-brick-breaker',
  styleUrl: './brick-breaker.css',
  templateUrl: './brick-breaker.html',
  host: { '(window:blur)': 'pause()' },
})
export class BrickBreaker {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthenticationService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly zone = inject(NgZone);
  private readonly loadGame = inject(loadBrickBreakerGame);
  private readonly canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private readonly surface = viewChild.required<ElementRef<HTMLElement>>('surface');
  private readonly heldKeys = new Set<string>();
  private game?: BrickBreakerGame;

  protected readonly level = signal<BrickBreakerLevel | null>(null);
  protected readonly status = signal<GameStatus | null>(null);
  protected readonly loading = signal(false);
  protected readonly error = signal<'level' | 'graphics' | null>(null);

  constructor() {
    afterNextRender(() => this.loadLevel());
    this.destroyRef.onDestroy(() => this.game?.destroy());
  }

  protected loadLevel(): void {
    if (this.loading()) return;
    const session = this.auth.activeSession();
    if (!session) {
      void this.router.navigateByUrl('/user/login', { replaceUrl: true });
      return;
    }

    this.error.set(null);
    this.loading.set(true);
    this.http.get<BrickBreakerLevel>(environment.netRootApi + 'brick-breaker/level', {
      headers: { Authorization: 'Bearer ' + session.token },
    }).pipe(
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: (level) => void this.initializeGame(level),
      error: (response: HttpErrorResponse) => {
        this.loading.set(false);
        if (response.status === 401) {
          this.auth.invalidateSession();
          void this.router.navigateByUrl('/user/login', { replaceUrl: true });
        } else {
          this.error.set('level');
        }
      },
    });
  }

  protected start(): void {
    if (!this.game) return;
    this.game.start();
    this.surface().nativeElement.focus({ preventScroll: true });
  }

  protected pause(): void {
    this.heldKeys.clear();
    this.game?.pause();
  }

  protected keyDown(event: KeyboardEvent): void {
    if (event.target !== this.surface().nativeElement || !this.game) return;
    const key = event.key.toLowerCase();
    if (leftKeys.includes(key) || rightKeys.includes(key)) {
      event.preventDefault();
      this.heldKeys.add(key);
    } else if (key === ' ' || key === 'escape') {
      event.preventDefault();
      if (event.repeat) return;
      if (this.status()?.phase === 'playing') this.pause();
      else if (key === ' ') this.start();
    }
  }

  protected keyUp(event: KeyboardEvent): void {
    this.heldKeys.delete(event.key.toLowerCase());
  }

  protected clearKeys(): void {
    this.heldKeys.clear();
  }

  protected pointerDown(event: PointerEvent): void {
    if (!event.isPrimary || event.button !== 0) return;
    if (event.pointerType !== 'mouse') this.canvas().nativeElement.setPointerCapture(event.pointerId);
    this.surface().nativeElement.focus({ preventScroll: true });
    this.movePaddle(event);
  }

  protected movePaddle(event: PointerEvent): void {
    if (!event.isPrimary || (event.pointerType !== 'mouse' && !event.buttons)) return;
    const bounds = this.canvas().nativeElement.getBoundingClientRect();
    if (bounds.width > 0) this.game?.movePaddle((event.clientX - bounds.left) * board.width / bounds.width);
  }

  private async initializeGame(level: BrickBreakerLevel): Promise<void> {
    try {
      const createGame = await this.loadGame();
      if (this.destroyRef.destroyed) return;
      this.level.set(level);
      this.game = this.zone.runOutsideAngular(() => createGame(
        this.canvas().nativeElement,
        level,
        () => Number(rightKeys.some((key) => this.heldKeys.has(key))) -
          Number(leftKeys.some((key) => this.heldKeys.has(key))),
        (status) => {
          if (this.destroyRef.destroyed) return;
          this.status.set(status);
          this.loading.set(false);
        },
      ));
    } catch {
      if (this.destroyRef.destroyed) return;
      this.error.set('graphics');
      this.loading.set(false);
    }
  }
}
