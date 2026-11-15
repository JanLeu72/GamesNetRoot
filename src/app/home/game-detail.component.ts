import { ChangeDetectionStrategy, Component, computed, DOCUMENT, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { combineLatest, map, switchMap } from 'rxjs';
import { LanguageService } from '../i18n/language.service';
import { GamesCatalogService } from './games-catalog.service';

@Component({
  selector: 'app-game-detail',
  imports: [RouterLink, TranslatePipe],
  templateUrl: './game-detail.component.html',
  styleUrl: './games-catalog.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GameDetailComponent {
  private readonly games = inject(GamesCatalogService);
  private readonly router = inject(Router);
  private readonly document = inject(DOCUMENT);
  private readonly language = inject(LanguageService).language;
  private readonly reload = signal(0);
  protected readonly detail = toSignal(combineLatest([
    inject(ActivatedRoute).paramMap.pipe(map(params => params.get('slug') ?? '')),
    toObservable(this.language),
    toObservable(this.reload),
  ]).pipe(switchMap(([slug, language]) => this.games.detail(slug, language))));

  protected readonly playLink = computed(() => {
    const detail = this.detail();
    if (detail?.state !== 'ready' || !detail.data.playPath) return null;

    const base = new URL(this.document.baseURI);
    const url = URL.parse(detail.data.playPath, base);
    if (!url || url.origin !== base.origin || !url.pathname.startsWith('/games/')) return null;
    return this.router.parseUrl(url.pathname + url.search + url.hash);
  });

  protected readonly scoreFormat = computed(() => new Intl.NumberFormat(this.language()));
  private readonly dateFormat = computed(() => new Intl.DateTimeFormat(this.language(), {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'Europe/Zurich',
    timeZoneName: 'short',
  }));

  protected formatRecordDate(timestamp: string): string {
    return this.dateFormat().format(new Date(timestamp));
  }

  protected retry(): void {
    this.reload.update(attempt => attempt + 1);
  }
}
