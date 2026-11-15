import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { combineLatest, switchMap } from 'rxjs';
import { LanguageService } from '../i18n/language.service';
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
  private readonly reload = signal(0);
  protected readonly catalog = toSignal(combineLatest([
    toObservable(inject(LanguageService).language),
    toObservable(this.reload),
  ]).pipe(switchMap(([language]) => this.games.list(language))));

  protected retry(): void {
    this.reload.update(attempt => attempt + 1);
  }
}
