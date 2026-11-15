import { DOCUMENT, afterNextRender, Component, DestroyRef, inject, linkedSignal, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterOutlet } from '@angular/router';
import { SwUpdate } from '@angular/service-worker';
import { TranslatePipe } from '@ngx-translate/core';
import { filter, take } from 'rxjs';
import { TopNavBarComponent } from './_layouts/top-nav-bar/top-nav-bar.component';
import { AuthenticationService } from './auth/authentication.service';
import { LanguageService } from './i18n/language.service';
import { PlayerNameDialogComponent } from './user-settings/player-name-dialog';
import { PlayerProfileService } from './user-settings/player-profile.service';

@Component({
  imports: [RouterOutlet, TranslatePipe, TopNavBarComponent, PlayerNameDialogComponent],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  private readonly auth = inject(AuthenticationService);
  private readonly document = inject(DOCUMENT);
  protected readonly updateReady = signal(false);
  protected readonly currentUser = this.auth.currentUser;
  protected readonly profile = inject(PlayerProfileService);
  protected readonly dismissedNamePrompt = linkedSignal({
    source: this.currentUser,
    computation: () => false,
  });

  constructor() {
    inject(LanguageService);
    const swUpdate = inject(SwUpdate, { optional: true });
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      if (!swUpdate?.isEnabled) return;
      swUpdate.versionUpdates.pipe(
        filter(event => event.type === 'VERSION_READY'),
        take(1),
        takeUntilDestroyed(destroyRef),
      ).subscribe(() => this.updateReady.set(true));
    });
  }

  protected reloadForUpdate(): void {
    this.document.location.reload();
  }

  protected shouldAskForPlayerName(): boolean {
    const profile = this.profile.state();
    return !!this.currentUser() && !this.dismissedNamePrompt()
      && profile.kind === 'ready' && !profile.displayName;
  }
}
