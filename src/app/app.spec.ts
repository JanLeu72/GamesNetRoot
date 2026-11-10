import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { vi } from 'vitest';
import { environment } from '../environments/environment';
import { App } from './app';
import { routes } from './app.routes';
import { AuthenticationService } from './auth/authentication.service';

describe('NetRoot Games authentication', () => {
  const storageKey = 'netroot.games.session';
  const loginUrl = environment.oauthServiceUrl + 'user/authenticate?language=de';
  const sessionUrl = environment.oauthServiceUrl + 'user/session';
  const session = (exp: number) => ({
    id: 42,
    username: 'spieler',
    token: 'e30.' + btoa(JSON.stringify({ id: '42', exp })) + '.signature',
  });
  const activeSession = () => session(Math.floor(Date.now() / 1000) + 3600);

  beforeEach(() => {
    localStorage.removeItem(storageKey);
    TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter(routes), provideHttpClient(), provideHttpClientTesting()],
    });
  });

  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
    localStorage.removeItem(storageKey);
  });

  async function rejectSession(): Promise<void> {
    await vi.waitFor(() => {
      const request = TestBed.inject(HttpTestingController).expectOne({ method: 'GET', url: sessionUrl });
      expect(request.request.withCredentials).toBe(true);
      request.flush(null, { status: 401, statusText: 'Unauthorized' });
    });
  }

  it('redirects anonymous users and signs in with the existing NetRoot endpoint', async () => {
    const pending = RouterTestingHarness.create('/');
    await rejectSession();
    await rejectSession();
    const harness = await pending;
    const router = TestBed.inject(Router);
    expect(router.url).toBe('/user/login');

    const form = harness.routeNativeElement!.querySelector('form')!;
    for (const [id, value] of [['username', 'spieler'], ['password', 'example']]) {
      const field = form.querySelector<HTMLInputElement>('#' + id)!;
      field.value = value;
      field.dispatchEvent(new Event('input'));
    }
    form.requestSubmit();
    form.requestSubmit();
    const request = TestBed.inject(HttpTestingController).expectOne({ method: 'POST', url: loginUrl });
    expect(request.request.withCredentials).toBe(true);
    expect(request.request.body).toEqual({ username: 'spieler', password: 'example' });

    const auth = activeSession();
    request.flush(auth);
    await harness.fixture.whenStable();
    expect(router.url).toBe('/');
    expect(localStorage.getItem(storageKey)).toBeNull();
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
      const request = http.expectOne(environment.netRootApi + 'brick-breaker/level');
      expect(request.request.headers.get('Authorization')).toBe('Bearer ' + session.token);
      request.flush(null, { status: 503, statusText: 'Unavailable' });
    });
    const page: HTMLElement = fixture.nativeElement;
    expect(page.textContent).toContain('spieler');
    page.querySelector('header button')!.dispatchEvent(new Event('click'));
    const logout = http.expectOne({ method: 'DELETE', url: sessionUrl });
    expect(logout.request.withCredentials).toBe(true);
    logout.flush(null, { status: 204, statusText: 'No Content' });
    await fixture.whenStable();
    expect(router.url).toBe('/user/login');
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
});
