import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { switchMap } from 'rxjs';
import { injectRouteLanguage } from '../i18n/language.service';
import { localizedUrl } from '../i18n/localized-url';
import { GamesCatalogService } from './games-catalog.service';

@Component({
  selector: 'app-games-home',
  imports: [RouterLink, TranslatePipe],
  templateUrl: './games-home.component.html',
  styleUrl: './games-catalog.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GamesHomeComponent {
  private readonly games = inject(GamesCatalogService);
  private readonly language = injectRouteLanguage();
  private readonly reload = signal(0);
  protected readonly catalog = toSignal(toObservable(this.reload).pipe(
    switchMap(() => this.games.list(this.language)),
  ));

  protected detailsPath(slug: string): string[] {
    return [localizedUrl('/games', this.language), slug, 'details'];
  }

  protected retry(): void {
    this.reload.update(attempt => attempt + 1);
  }
}
