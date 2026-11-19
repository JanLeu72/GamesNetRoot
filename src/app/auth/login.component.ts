import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { finalize } from 'rxjs';
import { AuthenticationService } from './authentication.service';
import { gameReturnUrl } from './auth.guard';
import { LanguageService } from '../i18n/language.service';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, TranslatePipe],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent {
  private readonly auth = inject(AuthenticationService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly locale = inject(LanguageService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly form = inject(NonNullableFormBuilder).group({
    username: ['', [Validators.required, Validators.pattern(/\S/)]],
    password: ['', Validators.required],
  });
  protected readonly pending = signal(false);
  protected readonly error = signal('');

  protected login(): void {
    if (this.form.invalid || this.pending()) return;

    const { username, password } = this.form.getRawValue();
    this.pending.set(true);
    this.error.set('');
    this.auth.login({ username: username.trim(), password }, this.locale.language()).pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.pending.set(false)),
    ).subscribe({
      next: () => {
        this.form.reset();
        void this.router.navigateByUrl(gameReturnUrl(this.route.snapshot.queryParamMap.get('returnUrl'), this.locale.language()), {
          replaceUrl: true,
        });
      },
      error: (response: unknown) => {
        const invalid = response instanceof HttpErrorResponse && [400, 401].includes(response.status);
        this.error.set(invalid ? 'login.invalid' : 'login.error');
      },
    });
  }
}
