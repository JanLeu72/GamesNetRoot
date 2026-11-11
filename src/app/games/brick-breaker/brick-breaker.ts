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
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
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
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly zone = inject(NgZone);
  private readonly loadGame = inject(loadBrickBreakerGame);
  private readonly canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private readonly surface = viewChild.required<ElementRef<HTMLElement>>('surface');
  private readonly heldKeys = new Set<string>();
  private game?: BrickBreakerGame;
  private requestedLevel?: number;
  private countdownTimer?: ReturnType<typeof setInterval>;

  protected readonly level = signal<BrickBreakerLevel | null>(null);
  protected readonly status = signal<GameStatus | null>(null);
  protected readonly loading = signal(false);
  protected readonly error = signal<'level' | 'graphics' | null>(null);
  protected readonly saveState = signal<'saving' | 'failed' | null>(null);
  protected readonly bestScore = signal(0);
  protected readonly practice = signal(false);
  protected readonly countdown = signal<number | null>(null);

  constructor() {
    afterNextRender(() => {
      const level = Number(this.route.snapshot.queryParamMap.get('level'));
      if (Number.isSafeInteger(level) && level > 0) {
        this.practice.set(true);
        this.loadLevel(level);
      } else {
        this.loadLevel();
      }
    });
    this.destroyRef.onDestroy(() => {
      this.cancelCountdown();
      void this.game?.destroy();
    });
  }

  protected loadLevel(number = this.requestedLevel): void {
    if (this.loading()) return;
    const session = this.auth.activeSession();
    if (!session) {
      void this.router.navigateByUrl('/user/login', { replaceUrl: true });
      return;
    }

    this.error.set(null);
    this.loading.set(true);
    this.requestedLevel = number;
    this.http.get<BrickBreakerLevel>(environment.netRootApi + 'brick-breaker/level', {
      headers: { Authorization: 'Bearer ' + session.token },
      params: number === undefined ? {} : { number },
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
    if (!this.game || this.loading() || this.error() || this.saveState() || this.countdown() !== null) return;
    const level = this.level();
    if (this.status()?.phase === 'won' && level?.hasNext) {
      this.loadLevel(level.level + 1);
      return;
    }
    this.surface().nativeElement.focus({ preventScroll: true });
    if (this.status()?.phase === 'paused') {
      this.game.start();
    } else if (this.status()?.phase !== 'playing') {
      this.countDownToStart();
    }
  }

  private countDownToStart(): void {
    let remaining = 3;
    this.showCountdownNumber(remaining);
    this.countdownTimer = setInterval(() => {
      remaining--;
      if (remaining > 0) {
        this.showCountdownNumber(remaining);
        return;
      }
      this.cancelCountdown();
      this.game?.start();
    }, 1000);
  }

  private showCountdownNumber(number: number): void {
    this.countdown.set(number);
    if (typeof window.SpeechSynthesisUtterance !== 'function' || !window.speechSynthesis) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(['eins', 'zwei', 'drei'][number - 1]);
    utterance.lang = 'de-DE';
    utterance.rate = 1.1;
    window.speechSynthesis.speak(utterance);
  }

  private cancelCountdown(): void {
    if (this.countdown() === null) return;
    clearInterval(this.countdownTimer);
    this.countdownTimer = undefined;
    this.countdown.set(null);
    window.speechSynthesis?.cancel();
  }

  protected saveResult(): void {
    const status = this.status();
    const level = this.level();
    const session = this.auth.activeSession();
    if (!level || !status || this.practice() || this.saveState() === 'saving'
        || (status.phase !== 'won' && status.phase !== 'lost')) return;
    if (!session) {
      void this.router.navigateByUrl('/user/login', { replaceUrl: true });
      return;
    }

    this.saveState.set('saving');
    // Let the write finish if the player navigates away from the game.
    this.http.post<void>(environment.netRootApi + 'brick-breaker/result', {
      level: level.level,
      score: status.score,
      won: status.phase === 'won',
    }, { headers: { Authorization: 'Bearer ' + session.token } }).subscribe({
      next: () => {
        if (this.destroyRef.destroyed) return;
        this.bestScore.update((best) => Math.max(best, status.score));
        this.saveState.set(null);
      },
      error: (response: HttpErrorResponse) => {
        if (this.destroyRef.destroyed) return;
        this.saveState.set('failed');
        if (response.status === 401) {
          this.auth.invalidateSession();
          void this.router.navigateByUrl('/user/login', { replaceUrl: true });
        }
      },
    });
  }

  protected pause(): void {
    this.cancelCountdown();
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
      if (this.status()?.phase === 'playing' || (key === 'escape' && this.countdown() !== null)) this.pause();
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
      const previousGame = this.game;
      this.game = undefined;
      if (previousGame) await this.zone.runOutsideAngular(() => previousGame.destroy());
      if (this.destroyRef.destroyed) return;
      this.heldKeys.clear();
      this.level.set(level);
      this.bestScore.set(level.bestScore ?? 0);
      this.game = this.zone.runOutsideAngular(() => createGame(
        this.canvas().nativeElement,
        level,
        () => Number(rightKeys.some((key) => this.heldKeys.has(key))) -
          Number(leftKeys.some((key) => this.heldKeys.has(key))),
        (status) => {
          if (this.destroyRef.destroyed) return;
          const previousPhase = this.status()?.phase;
          this.status.set(status);
          this.loading.set(false);
          if (previousPhase !== status.phase && (status.phase === 'won' || status.phase === 'lost')) {
            this.saveResult();
          }
        },
      ));
    } catch {
      if (this.destroyRef.destroyed) return;
      this.error.set('graphics');
      this.loading.set(false);
    }
  }
}
