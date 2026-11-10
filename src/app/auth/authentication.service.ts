import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { catchError, finalize, map, Observable, of, shareReplay, tap, timeout } from 'rxjs';
import { environment } from '../../environments/environment';

interface NetRootSession {
  id: number;
  username: string;
  token: string;
}

const storageKey = 'netroot.games.session';

@Injectable({ providedIn: 'root' })
export class AuthenticationService {
  private readonly http = inject(HttpClient);
  private readonly session = signal<NetRootSession | null>(null);
  private readonly sessionUrl = environment.oauthServiceUrl + 'user/session';
  private pendingSession?: Observable<NetRootSession | null>;
  private sessionVersion = 0;
  private sessionInvalidated = false;

  readonly currentUser = this.session.asReadonly();

  activeSession(): NetRootSession | null {
    const session = this.currentUser();
    return this.isActive(session) ? session : null;
  }

  restoreSession(): Observable<NetRootSession | null> {
    this.clearLegacySession();
    const active = this.activeSession();
    if (active || this.sessionInvalidated) return of(active);
    this.session.set(null);

    const version = this.sessionVersion;
    return this.pendingSession ??= this.http.get<NetRootSession>(this.sessionUrl, {
      withCredentials: true,
    }).pipe(
      timeout(5000),
      map(session => version === this.sessionVersion ? this.setSession(session) : this.activeSession()),
      catchError(() => of(this.activeSession())),
      finalize(() => this.pendingSession = undefined),
      shareReplay({ bufferSize: 1, refCount: true }),
    );
  }

  login(credentials: { username: string; password: string }) {
    return this.http.post<NetRootSession>(environment.oauthServiceUrl + 'user/authenticate', credentials, {
      params: { language: 'de' },
      withCredentials: true,
    }).pipe(
      map(session => this.setSession(session)),
      tap((session) => {
        this.sessionVersion++;
        this.sessionInvalidated = false;
      }),
    );
  }

  logout(): Observable<void> {
    return this.http.delete<void>(this.sessionUrl, { withCredentials: true }).pipe(
      timeout(5000),
      tap(() => this.invalidateSession()),
    );
  }

  invalidateSession(): void {
    this.sessionVersion++;
    this.sessionInvalidated = true;
    this.session.set(null);
    this.clearLegacySession();
  }

  private clearLegacySession(): void {
    try { localStorage.removeItem(storageKey); } catch {}
  }

  private setSession(session: NetRootSession): NetRootSession {
    if (!this.isActive(session)) throw new Error('Invalid NetRoot session');
    this.session.set(session);
    return session;
  }

  private isActive(session: NetRootSession | null): session is NetRootSession {
    if (!session || !Number.isInteger(session.id) || session.id <= 0 ||
        typeof session.username !== 'string' || !session.username.trim() ||
        typeof session.token !== 'string') return false;

    try {
      const parts = session.token.split('.');
      if (parts.length !== 3 || parts.some((part) => !part)) return false;
      const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
      return Number(payload.id) === session.id &&
        typeof payload.exp === 'number' && Number.isFinite(payload.exp) &&
        payload.exp * 1000 > Date.now();
    } catch {
      return false;
    }
  }
}
