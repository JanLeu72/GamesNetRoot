import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { LanguageService } from '../../i18n/language.service';

@Component({
  selector: 'app-logged-out',
  templateUrl: './logged-out.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, TranslatePipe],
})
export class LoggedOutComponent {
  protected readonly locale = inject(LanguageService);
}
