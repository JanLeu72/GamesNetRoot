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

describe('BrickBreaker', () => {
  let fixture: ComponentFixture<BrickBreaker>;
  let http: HttpTestingController;
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
              phase, score: 0, lives: level.lives, remaining: level.rows * level.columns,
            });
            publish('ready');
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

  it('loads the level with a bearer token and lets the player start and pause', async () => {
    const request = http.expectOne({ method: 'GET', url });
    expect(request.request.headers.get('Authorization')).toBe('Bearer test-token');
    request.flush(level);
    await fixture.whenStable();
    fixture.detectChanges();

    const view: HTMLElement = fixture.nativeElement;
    expect(Array.from(view.querySelectorAll('dd'), (stat) => stat.textContent)).toEqual(['1', '0', '3', '32']);
    view.querySelector('button')!.click();
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
});
