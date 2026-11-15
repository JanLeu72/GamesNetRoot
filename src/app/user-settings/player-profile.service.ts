import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { catchError, combineLatest, map, of, startWith, switchMap, tap, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthenticationService } from '../auth/authentication.service';

interface PlayerProfile {
  displayName: string | null;
}

type ProfileState =
  | { kind: 'loading' | 'error' }
  | { kind: 'ready'; displayName: string | null };

type Session = ReturnType<AuthenticationService['activeSession']>;

@Injectable({ providedIn: 'root' })
export class PlayerProfileService {
  private readonly auth = inject(AuthenticationService);
  private readonly http = inject(HttpClient);
  private readonly url = environment.netRootApi + 'player-profile';
  private readonly refresh = signal(0);
  private readonly saved = signal<{ session: Session; profile: PlayerProfile } | null>(null);
  private readonly lookup = toSignal(combineLatest([
    toObservable(this.auth.currentUser),
    toObservable(this.refresh),
  ]).pipe(
    switchMap(([session]) => session
      ? this.http.get<PlayerProfile>(this.url, this.requestOptions(session.token)).pipe(
        map((profile): ProfileState => ({ kind: 'ready', displayName: profile.displayName })),
        catchError(() => of<ProfileState>({ kind: 'error' })),
        startWith<ProfileState>({ kind: 'loading' }),
        map(state => ({ session, state })),
      )
      : of(null)),
  ));

  readonly state = computed<ProfileState>(() => {
    const session = this.auth.currentUser();
    const saved = this.saved();
    if (saved && saved.session === session) return { kind: 'ready', ...saved.profile };
    const lookup = this.lookup();
    return lookup && lookup.session === session ? lookup.state : { kind: 'loading' };
  });

  retry(): void {
    this.refresh.update(revision => revision + 1);
  }

  save(displayName: string) {
    const session = this.auth.activeSession();
    if (!session) return throwError(() => new Error('No active session'));

    return this.http.put<PlayerProfile>(this.url, { displayName }, this.requestOptions(session.token)).pipe(
      tap(profile => {
        if (session === this.auth.currentUser()) this.saved.set({ session, profile });
      }),
    );
  }

  private requestOptions(token: string) {
    return { headers: { Authorization: 'Bearer ' + token }, timeout: 8000 };
  }
}
