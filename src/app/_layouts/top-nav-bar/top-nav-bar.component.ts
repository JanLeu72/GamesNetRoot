import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { ButtonComponent } from '@progress/kendo-angular-buttons';
import { PopupComponent } from '@progress/kendo-angular-popup';
import { finalize } from 'rxjs';
import { AuthenticationService } from '../../auth/authentication.service';
import { PlayerProfileService } from '../../user-settings/player-profile.service';

@Component({
  selector: 'app-top-nav-bar',
  imports: [RouterLink, TranslatePipe, ButtonComponent, PopupComponent],
  templateUrl: './top-nav-bar.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:click)': 'closeOutside($event)',
    '(document:keydown.escape)': 'closeOnEscape($event)',
  },
})
export class TopNavBarComponent {
  private readonly auth = inject(AuthenticationService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly accountButton = viewChild<ElementRef<HTMLButtonElement>>('accountButton');
  private readonly accountPanel = viewChild<ElementRef<HTMLElement>>('accountPanel');
  protected readonly currentUser = this.auth.currentUser;
  protected readonly profile = inject(PlayerProfileService).state;
  protected readonly menuOpen = signal(false);
  protected readonly signingOut = signal(false);
  protected readonly logoutError = signal(false);

  protected closeOutside(event: MouseEvent): void {
    if (!this.menuOpen() || !(event.target instanceof Node)) return;
    if (this.accountButton()?.nativeElement.contains(event.target)
      || this.accountPanel()?.nativeElement.contains(event.target)) return;
    this.menuOpen.set(false);
  }

  protected closeOnEscape(event: Event): void {
    if (!this.menuOpen()) return;
    event.preventDefault();
    this.menuOpen.set(false);
    this.accountButton()?.nativeElement.focus();
  }

  protected logout(): void {
    if (this.signingOut()) return;
    this.signingOut.set(true);
    this.logoutError.set(false);
    this.auth.logout().pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.signingOut.set(false)),
    ).subscribe({
      next: () => {
        this.menuOpen.set(false);
        void this.router.navigateByUrl('/logged-out', { replaceUrl: true });
      },
      error: () => this.logoutError.set(true),
    });
  }
}
