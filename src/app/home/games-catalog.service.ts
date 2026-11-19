import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { catchError, map, Observable, of, startWith } from 'rxjs';
import { environment } from '../../environments/environment';

export interface GameSummary {
  slug: string;
  name: string;
  teaser: string | null;
  coverImage: string | null;
}

export interface GameDetails extends GameSummary {
  description: string | null;
  screenshotImage: string | null;
  playPath: string | null;
  leaderboard: { rank: number; score: number; playerName?: string | null; achievedAt?: string | null }[];
}

type CatalogResult<T> =
  | { state: 'loading' | 'missing' | 'error' }
  | { state: 'ready'; data: T };

@Injectable({ providedIn: 'root' })
export class GamesCatalogService {
  private readonly http = inject(HttpClient);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly url = environment.netRootApi + 'games';

  list(lang: string) {
    return this.load<GameSummary[]>(this.url, lang);
  }

  detail(slug: string, lang: string) {
    return this.load<GameDetails>(this.url + '/' + encodeURIComponent(slug), lang);
  }

  private load<T>(url: string, lang: string): Observable<CatalogResult<T>> {
    if (!this.isBrowser) return of({ state: 'loading' });
    return this.http.get<T>(url, { params: { lang }, timeout: 8000 }).pipe(
      map((data): CatalogResult<T> => ({ state: 'ready', data })),
      catchError((error: HttpErrorResponse) =>
        of<CatalogResult<T>>({ state: error.status === 404 ? 'missing' : 'error' }),
      ),
      startWith({ state: 'loading' } as const),
    );
  }
}
