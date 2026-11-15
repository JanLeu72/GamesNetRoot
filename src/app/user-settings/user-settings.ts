import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { ButtonComponent } from '@progress/kendo-angular-buttons';
import { KENDO_TABSTRIP } from '@progress/kendo-angular-layout';
import { LanguageService } from '../i18n/language.service';
import { ChangePasswordComponent } from './change-password';
import { PlayerNameComponent } from './player-name';
import { PlayerProfileService } from './player-profile.service';

@Component({
  selector: 'app-user-settings',
  imports: [KENDO_TABSTRIP, TranslatePipe, ButtonComponent, ChangePasswordComponent, PlayerNameComponent],
  templateUrl: './user-settings.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserSettingsComponent {
  protected readonly profile = inject(PlayerProfileService);
  protected readonly locale = inject(LanguageService);
}
