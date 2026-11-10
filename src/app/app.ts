import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthenticationService } from './auth/authentication.service';

@Component({
  imports: [RouterLink, RouterOutlet],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  private appVersion = signal('1.0.4');

  private readonly auth = inject(AuthenticationService);
  private readonly router = inject(Router);
  protected readonly currentUser = this.auth.currentUser;
  protected readonly signingOut = signal(false);
  protected readonly logoutError = signal(false);

  protected logout(): void {
    if (this.signingOut()) return;
    this.signingOut.set(true);
    this.logoutError.set(false);
    this.auth
      .logout()
      .pipe(finalize(() => this.signingOut.set(false)))
      .subscribe({
        next: () => void this.router.navigateByUrl('/user/login', { replaceUrl: true }),
        error: () => this.logoutError.set(true),
      });
  }
}
