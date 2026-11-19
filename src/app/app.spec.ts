import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter, RouteReuseStrategy, Router, TitleStrategy } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { SwUpdate, VersionEvent } from '@angular/service-worker';
import { Subject } from 'rxjs';
import { vi } from 'vitest';
import { environment } from '../environments/environment';
import { App } from './app';
import { routes } from './app.routes';
import { AuthenticationService } from './auth/authentication.service';
import { LanguageService } from './i18n/language.service';
import { GameRouteReuse } from './i18n/game-route-reuse';
import { GamesTitleStrategy } from './i18n/games-title.strategy';
import { testTranslationProviders } from './i18n/translation-testing';

describe('NetRoot Games authentication', () => {
  const storageKey = 'netroot.games.session';
  const loginUrl = environment.oauthServiceUrl + 'user/authenticate?language=de';
  const sessionUrl = environment.oauthServiceUrl + 'user/session';
  const profileUrl = environment.netRootApi + 'player-profile';
  const session = (exp: number) => ({
    id: 42,
    username: 'spieler',
    token: 'e30.' + btoa(JSON.stringify({ id: '42', exp })) + '.signature',
  });
  const activeSession = () => session(Math.floor(Date.now() / 1000) + 3600);

  beforeEach(() => {
    localStorage.removeItem(storageKey);
    localStorage.setItem('netroot.games.language', 'de');
    TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter(routes), provideHttpClient(), provideHttpClientTesting(), testTranslationProviders,
        provideNoopAnimations(),
        { provide: RouteReuseStrategy, useClass: GameRouteReuse },
        { provide: TitleStrategy, useClass: GamesTitleStrategy },
      ],
    });
  });

  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
    localStorage.removeItem(storageKey);
    localStorage.removeItem('netroot.games.language');
  });

  async function rejectSession(): Promise<void> {
    await vi.waitFor(() => {
      const request = TestBed.inject(HttpTestingController).expectOne({ method: 'GET', url: sessionUrl });
      expect(request.request.withCredentials).toBe(true);
      request.flush(null, { status: 401, statusText: 'Unauthorized' });
    });
  }

  it('returns to the requested game and level after signing in', async () => {
    const gameUrl = '/fr/games/brick-breaker?level=4';
    const pending = RouterTestingHarness.create('/games/brick-breaker?level=4&lang=fr');
    await rejectSession();
    await rejectSession();
    const harness = await pending;
    const router = TestBed.inject(Router);
    expect(router.url).toBe('/fr/user/login?returnUrl=' + encodeURIComponent(gameUrl));

    const form = harness.routeNativeElement!.querySelector('form')!;
    for (const [id, value] of [['username', 'spieler'], ['password', 'example']]) {
      const field = form.querySelector<HTMLInputElement>('#' + id)!;
      field.value = value;
      field.dispatchEvent(new Event('input'));
    }
    form.requestSubmit();
    form.requestSubmit();
    const request = TestBed.inject(HttpTestingController).expectOne({
      method: 'POST', url: environment.oauthServiceUrl + 'user/authenticate?language=fr',
    });
    expect(request.request.withCredentials).toBe(true);
    expect(request.request.body).toEqual({ username: 'spieler', password: 'example' });

    const auth = activeSession();
    request.flush(auth);
    await harness.fixture.whenStable();
    expect(router.url).toBe(gameUrl);
    const level = TestBed.inject(HttpTestingController).expectOne({
      method: 'GET',
      url: environment.netRootApi + 'brick-breaker/level?number=4',
    });
    expect(level.request.headers.get('Authorization')).toBe('Bearer ' + auth.token);
    level.flush(null, { status: 503, statusText: 'Unavailable' });
    expect(localStorage.getItem(storageKey)).toBeNull();

    const gameView = harness.routeNativeElement;
    await TestBed.inject(LanguageService).select('es');
    expect(router.url).toBe('/es/games/brick-breaker?level=4');
    expect(harness.routeNativeElement).toBe(gameView);
    expect(document.documentElement.lang).toBe('es');
  });

  it('restores a valid session on a direct visit and clears it on logout', async () => {
    const fixture = TestBed.createComponent(App);
    const router = TestBed.inject(Router);
    fixture.detectChanges();
    const pending = router.navigateByUrl('/games/brick-breaker');
    const http = TestBed.inject(HttpTestingController);
    const session = activeSession();
    await vi.waitFor(() => {
      const request = http.expectOne({ method: 'GET', url: sessionUrl });
      expect(request.request.withCredentials).toBe(true);
      request.flush(session);
    });
    await pending;
    fixture.detectChanges();
    await vi.waitFor(() => {
      const request = http.expectOne({ method: 'GET', url: profileUrl });
      expect(request.request.headers.get('Authorization')).toBe('Bearer ' + session.token);
      request.flush({ displayName: 'Spielername42' });
    });
    await vi.waitFor(() => {
      const request = http.expectOne(environment.netRootApi + 'brick-breaker/level');
      expect(request.request.headers.get('Authorization')).toBe('Bearer ' + session.token);
      request.flush(null, { status: 503, statusText: 'Unavailable' });
    });
    await fixture.whenStable();
    const page: HTMLElement = fixture.nativeElement;
    expect(page.textContent).toContain('Spielername42');
    expect(page.querySelector('kendo-dialog')).toBeNull();
    const menuButton = page.querySelector<HTMLButtonElement>('header button[aria-expanded]')!;
    expect(page.querySelector<HTMLSelectElement>('header select')?.value).toBe('de');
    expect(page.querySelector('header kendo-popup')).toBeNull();
    menuButton.click();
    await fixture.whenStable();
    const popup = () => page.querySelector('header kendo-popup');
    expect(menuButton.getAttribute('aria-expanded')).toBe('true');
    await vi.waitFor(() => expect(popup()?.querySelector('a')?.getAttribute('href')).toBe('/user/settings'));

    popup()?.querySelector('a')?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await fixture.whenStable();
    expect(popup()).toBeNull();
    expect(menuButton.getAttribute('aria-expanded')).toBe('false');

    menuButton.click();
    await fixture.whenStable();
    page.querySelector<HTMLElement>('main')!.click();
    await fixture.whenStable();
    expect(popup()).toBeNull();

    menuButton.click();
    await fixture.whenStable();
    popup()!.querySelector('button')!.click();
    const logout = http.expectOne({ method: 'DELETE', url: sessionUrl });
    expect(logout.request.withCredentials).toBe(true);
    logout.flush(null, { status: 204, statusText: 'No Content' });
    await fixture.whenStable();
    expect(router.url).toBe('/logged-out');
    expect(page.querySelector('main h1')?.textContent?.trim()).toBe('Abgemeldet');
    expect(page.querySelector('main a')?.getAttribute('href')).toBe('/user/login');
    expect(document.title).toBe('Abgemeldet | NetRoot Games');
    expect(localStorage.getItem(storageKey)).toBeNull();
  });

  it('clears the legacy token and stays on the login screen after a denied request', async () => {
    localStorage.setItem(storageKey, JSON.stringify(session(1)));
    const pending = RouterTestingHarness.create('/user/login');
    await rejectSession();
    const harness = await pending;
    expect(localStorage.getItem(storageKey)).toBeNull();

    const auth = TestBed.inject(AuthenticationService);
    let failed = false;
    auth.login({ username: 'spieler', password: 'wrong' }).subscribe({ error: () => failed = true });
    TestBed.inject(HttpTestingController).expectOne(loginUrl).flush(null, {
      status: 400, statusText: 'Bad Request',
    });
    expect(failed).toBe(true);
    expect(auth.currentUser()).toBeNull();
    expect(harness.routeNativeElement!.querySelector('form')).toBeTruthy();
  });

  it('asks for a missing player name and supports editing the name and password in settings', async () => {
    const fixture = TestBed.createComponent(App);
    const router = TestBed.inject(Router);
    const http = TestBed.inject(HttpTestingController);
    const auth = activeSession();
    fixture.detectChanges();
    const navigation = router.navigateByUrl('/user/settings');
    await vi.waitFor(() => http.expectOne(sessionUrl).flush(auth));
    await navigation;
    await vi.waitFor(() => http.expectOne(profileUrl).flush({ displayName: null }));

    const page: HTMLElement = fixture.nativeElement;
    const enter = (selector: string, value: string) => {
      const input = page.querySelector<HTMLInputElement>(selector)!;
      input.value = value;
      input.dispatchEvent(new Event('input', { bubbles: true }));
    };
    const saveName = (displayName: string) => {
      const request = http.expectOne({ method: 'PUT', url: profileUrl });
      expect(request.request.headers.get('Authorization')).toBe('Bearer ' + auth.token);
      expect(request.request.body).toEqual({ displayName });
      request.flush({ displayName });
    };

    await vi.waitFor(() => expect(page.querySelector('#prompt-player-name')).toBeTruthy());
    enter('#prompt-player-name', '  Arcade42  ');
    page.querySelector('kendo-dialog form')!.dispatchEvent(new Event('submit', { bubbles: true }));
    saveName('Arcade42');
    await fixture.whenStable();
    expect(page.querySelector('kendo-dialog')).toBeNull();
    expect(page.querySelector('header')?.textContent).toContain('Arcade42');

    expect(page.querySelector<HTMLInputElement>('#settings-player-name')?.value).toBe('Arcade42');
    enter('#settings-player-name', 'Arcade43');
    page.querySelector('kendo-tabstrip form')!.dispatchEvent(new Event('submit', { bubbles: true }));
    saveName('Arcade43');
    await fixture.whenStable();
    expect(page.querySelector('header')?.textContent).toContain('Arcade43');

    page.querySelectorAll<HTMLElement>('[role="tab"]')[1].click();
    await fixture.whenStable();
    enter('#currentPassword', 'Old123!');
    enter('#password1', 'New123!');
    enter('#password2', 'New123!');
    page.querySelector('app-change-password form')!.dispatchEvent(new Event('submit', { bubbles: true }));
    const password = http.expectOne({ method: 'POST', url: environment.oauthServiceUrl + 'user/updatepassword' });
    expect(password.request.headers.get('Authorization')).toBe('Bearer ' + auth.token);
    expect(password.request.body).toEqual({ currentPassword: 'Old123!', password1: 'New123!', password2: 'New123!' });
    fixture.detectChanges();
    password.flush(true);
    await fixture.whenStable();
    expect(page.querySelector('app-change-password [role="status"]')?.textContent).toContain('Dein Passwort wurde geändert.');
    expect(page.querySelector<HTMLInputElement>('#currentPassword')?.value).toBe('');

    page.querySelectorAll<HTMLElement>('[role="tab"]')[2].click();
    await fixture.whenStable();
    const select = page.querySelector<HTMLSelectElement>('app-user-settings select')!;
    expect(select.value).toBe('de');
    select.value = 'es';
    select.dispatchEvent(new Event('change', { bubbles: true }));
    await fixture.whenStable();
    expect(page.querySelector('app-user-settings h1')?.textContent).toContain('Ajustes');
    expect(router.url).toBe('/es/user/settings');
    expect(document.documentElement.lang).toBe('es');
  });

  it('offers a reload only once a new version is ready', async () => {
    const versionUpdates = new Subject<VersionEvent>();
    TestBed.overrideProvider(SwUpdate, { useValue: { isEnabled: true, versionUpdates } });
    const fixture = TestBed.createComponent(App);
    const page: HTMLElement = fixture.nativeElement;
    await fixture.whenStable();

    versionUpdates.next({ type: 'VERSION_DETECTED', version: { hash: 'new' } });
    await fixture.whenStable();
    expect(page.querySelector('[role="status"]')).toBeNull();

    versionUpdates.next({
      type: 'VERSION_READY',
      currentVersion: { hash: 'old' },
      latestVersion: { hash: 'new' },
    });
    await fixture.whenStable();
    expect(page.querySelector('[role="status"]')?.textContent).toContain('Eine neue Version');
    expect(page.querySelector('button')?.textContent).toContain('Jetzt neu laden');
  });

  it('uses the URL prefix and switches via the header while keeping query parameters and fragments', async () => {
    const fixture = TestBed.createComponent(App);
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/fr/games/not-a-game?lang=en&source=arcade#info');
    await fixture.whenStable();
    expect(router.url).toBe('/fr/games/not-a-game?source=arcade#info');
    expect(document.documentElement.lang).toBe('fr');

    const select = fixture.nativeElement.querySelector('header select') as HTMLSelectElement;
    expect(select.value).toBe('fr');
    select.value = 'en';
    select.dispatchEvent(new Event('change'));
    await fixture.whenStable();

    expect(router.url).toBe('/en/games/not-a-game?source=arcade#info');
    expect(document.documentElement.lang).toBe('en');
  });

  it('shows a public catalog in API order and opens the translated details for a game', async () => {
    const http = TestBed.inject(HttpTestingController);
    const pending = RouterTestingHarness.create('/');
    await rejectSession();
    const harness = await pending;
    const router = TestBed.inject(Router);
    expect(router.url).toBe('/');
    const catalog = environment.netRootApi + 'games?lang=';
    const brick = {
      slug: 'brick-breaker',
      name: 'Brick Breaker',
      teaser: 'Deutsch',
      coverImage: '/images/games/brick-breaker-cover.jpg',
    };
    const second = { slug: 'another-game', name: 'Another game', teaser: null, coverImage: null };
    http.expectOne(catalog + 'de').flush([brick, second]);
    harness.detectChanges();
    expect(harness.routeNativeElement?.textContent).toContain('Deutsch');
    const titles = harness.routeNativeElement?.querySelectorAll('.game-card h3') ?? [];
    expect(Array.from(titles, title => title.textContent)).toEqual(['Brick Breaker', 'Another game']);

    const french = TestBed.inject(LanguageService).select('fr');
    await rejectSession();
    await french;
    await vi.waitFor(() => {
      http.expectOne(catalog + 'fr').flush([{ ...brick, teaser: 'Texte français' }, second]);
    });
    harness.detectChanges();
    expect(harness.routeNativeElement?.textContent).toContain('Texte français');

    const card = harness.routeNativeElement!.querySelector('.game-card a')!;
    expect(card.getAttribute('href')).toBe('/fr/games/brick-breaker/details');
    const details = router.navigateByUrl(card.getAttribute('href')!);
    await rejectSession();
    await details;
    await vi.waitFor(() => http.expectOne(environment.netRootApi + 'games/brick-breaker?lang=fr').flush({
      ...brick,
      description: 'Dirige la balle.',
      screenshotImage: '/images/games/brick-breaker-level-4.png',
      playPath: 'games/brick-breaker?level=4',
      leaderboard: [{ rank: 1, playerName: 'Arcade42', score: 950, achievedAt: '2026-07-15T12:34:00Z' }],
    }));
    harness.detectChanges();
    expect(harness.routeNativeElement?.querySelector('h1')?.textContent).toBe('Brick Breaker');
    expect(harness.routeNativeElement?.querySelector('.leaderboard')?.textContent).toContain('Arcade42');
    expect(harness.routeNativeElement?.querySelector('time')?.textContent).toContain('14:34');
    expect(harness.routeNativeElement?.querySelector('a.catalog-button')?.getAttribute('href'))
      .toBe('/fr/games/brick-breaker?level=4');
  });
});
