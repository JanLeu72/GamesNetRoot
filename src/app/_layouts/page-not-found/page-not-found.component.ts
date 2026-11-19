import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { LanguageService } from '../../i18n/language.service';

@Component({
  selector: 'app-page-not-found',
  imports: [RouterLink, TranslatePipe],
  templateUrl: './page-not-found.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './page-not-found.component.css',
})
export class PageNotFoundComponent {
  protected readonly locale = inject(LanguageService);
}
