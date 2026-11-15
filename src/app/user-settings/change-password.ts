import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { ButtonComponent } from '@progress/kendo-angular-buttons';
import { TextBoxComponent } from '@progress/kendo-angular-inputs';
import { finalize } from 'rxjs';
import { AuthenticationService } from '../auth/authentication.service';

const passwordStrength = /^(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9])(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?]).{6,}$/s;

@Component({
  selector: 'app-change-password',
  imports: [ReactiveFormsModule, TranslatePipe, ButtonComponent, TextBoxComponent],
  templateUrl: './change-password.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChangePasswordComponent {
  private readonly auth = inject(AuthenticationService);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly form = inject(NonNullableFormBuilder).group({
    currentPassword: ['', Validators.required],
    password1: ['', [Validators.required, Validators.pattern(passwordStrength)]],
    password2: ['', Validators.required],
  });
  protected readonly fields = [
    { name: 'currentPassword', label: 'settings.currentPassword', autocomplete: 'current-password' },
    { name: 'password1', label: 'settings.newPassword', autocomplete: 'new-password' },
    { name: 'password2', label: 'settings.confirmPassword', autocomplete: 'new-password' },
  ] as const;
  protected readonly pending = signal(false);
  protected readonly status = signal<'saved' | 'rejected' | 'failed' | null>(null);

  protected save(): void {
    if (this.pending()) return;
    this.status.set(null);
    this.form.markAllAsTouched();
    const passwords = this.form.getRawValue();
    if (this.form.invalid || passwords.password1 !== passwords.password2) return;

    this.pending.set(true);
    this.auth.changePassword(passwords).pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.pending.set(false)),
    ).subscribe({
      next: saved => {
        if (saved) this.form.reset();
        this.status.set(saved ? 'saved' : 'rejected');
      },
      error: () => this.status.set('failed'),
    });
  }
}
