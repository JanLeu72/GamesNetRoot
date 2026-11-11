import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { environment } from '../../../environments/environment';
import { AuthenticationService } from '../../auth/authentication.service';
import { BrickBreaker } from './brick-breaker';
import { BrickBreakerLevel, GameStatus, loadBrickBreakerGame } from './brick-breaker-game';

const level = { level: 1, rows: 4, columns: 8, lives: 3 };
const url = environment.netRootApi + 'brick-breaker/level';
const resultUrl = environment.netRootApi + 'brick-breaker/result';

describe('BrickBreaker', () => {
  let fixture: ComponentFixture<BrickBreaker>;
  let http: HttpTestingController;
  let winLevel: () => void;
  const destroyGame = vi.fn();

  beforeEach(() => {
    destroyGame.mockClear();
    TestBed.configureTestingModule({
      imports: [BrickBreaker],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: AuthenticationService, useValue: { activeSession: () => ({ token: 'test-token' }) } },
        {
          provide: loadBrickBreakerGame,
          useValue: async () => (
            _canvas: HTMLCanvasElement,
            level: BrickBreakerLevel,
            _direction: () => number,
            onStatus: (status: GameStatus) => void,
          ) => {
            const publish = (phase: GameStatus['phase']) => onStatus({
              phase, score: phase === 'won' ? 3200 : 0, lives: level.lives, remaining: level.rows * level.columns,
            });
            publish('ready');
            winLevel = () => publish('won');
            return {
              start: () => publish('playing'),
              pause: () => publish('paused'),
              movePaddle() {},
              destroy: destroyGame,
            };
          },
        },
      ],
    });
    fixture = TestBed.createComponent(BrickBreaker);
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  it('counts down before launching the ball and lets the player pause', async () => {
    const request = http.expectOne({ method: 'GET', url });
    expect(request.request.headers.get('Authorization')).toBe('Bearer test-token');
    request.flush(level);
    await fixture.whenStable();
    fixture.detectChanges();

    const view: HTMLElement = fixture.nativeElement;
    expect(Array.from(view.querySelectorAll('dd'), (stat) => stat.textContent)).toEqual(['1', '0', '3', '32', '0']);
    vi.useFakeTimers();
    try {
      view.querySelector('button')!.click();
      for (const number of [3, 2, 1]) {
        fixture.detectChanges();
        expect(view.querySelector('.game-countdown')?.textContent).toBe(String(number));
        expect(view.querySelector('button')).toBeNull();
        vi.advanceTimersByTime(1000);
      }
    } finally {
      vi.useRealTimers();
    }
    fixture.detectChanges();
    expect(view.querySelector('button')?.textContent).toContain('Pausieren');
    view.querySelector('button')!.click();
    fixture.detectChanges();
    expect(view.querySelector('button')?.textContent).toContain('Weiterspielen');
  });

  it('can retry when the level cannot be loaded', async () => {
    http.expectOne(url).flush(null, { status: 503, statusText: 'Unavailable' });
    fixture.detectChanges();
    const view: HTMLElement = fixture.nativeElement;
    expect(view.querySelector('[role="alert"]')?.textContent).toContain('nicht geladen');
    view.querySelector('button')!.click();
    http.expectOne(url).flush(level);
    await fixture.whenStable();
    fixture.detectChanges();
    expect(view.querySelector('button')?.textContent).toContain('Ball starten');
  });

  it('destroys the game when leaving the route', async () => {
    http.expectOne(url).flush(level);
    await fixture.whenStable();
    fixture.destroy();
    expect(destroyGame).toHaveBeenCalledOnce();
  });

  it('loads the next level after a win and retries the same level on failure', async () => {
    http.expectOne(url).flush({ ...level, hasNext: true });
    await fixture.whenStable();
    winLevel();
    fixture.detectChanges();

    const view: HTMLElement = fixture.nativeElement;
    expect(view.textContent).toContain('Fortschritt wird gespeichert');
    const result = http.expectOne({ method: 'POST', url: resultUrl });
    expect(result.request.body).toEqual({ level: 1, score: 3200, won: true });
    expect(result.request.headers.get('Authorization')).toBe('Bearer test-token');
    result.flush(null, { status: 503, statusText: 'Unavailable' });
    fixture.detectChanges();
    expect(view.querySelector('button')?.textContent).toContain('Erneut speichern');
    view.querySelector('button')!.click();
    http.expectOne(resultUrl).flush(null, { status: 204, statusText: 'No Content' });
    fixture.detectChanges();

    expect(view.querySelector('button')?.textContent).toContain('Nächstes Level');
    view.querySelector('button')!.click();
    const nextUrl = url + '?number=2';
    http.expectOne(nextUrl).flush(null, { status: 503, statusText: 'Unavailable' });
    fixture.detectChanges();
    view.querySelector('button')!.click();
    http.expectOne(nextUrl).flush({ ...level, level: 2, hasNext: false });
    await fixture.whenStable();
    fixture.detectChanges();

    expect(destroyGame).toHaveBeenCalledOnce();
    expect(view.querySelector('dd')?.textContent).toBe('2');
    winLevel();
    http.expectOne(resultUrl).flush(null, { status: 204, statusText: 'No Content' });
    fixture.detectChanges();
    expect(view.querySelector('button')?.textContent).toContain('Level wiederholen');
  });

  it('starts at the saved level and shows the saved best score', async () => {
    http.expectOne(url).flush({ ...level, level: 3, bestScore: 3600 });
    await fixture.whenStable();
    fixture.detectChanges();

    const view: HTMLElement = fixture.nativeElement;
    expect(Array.from(view.querySelectorAll('dd'), (stat) => stat.textContent)).toEqual(['3', '0', '3', '32', '3600']);
  });
});
