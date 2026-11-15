import { ChangeDetectionStrategy, Component, DestroyRef, effect, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { ButtonComponent } from '@progress/kendo-angular-buttons';
import { TextBoxComponent } from '@progress/kendo-angular-inputs';
import { finalize } from 'rxjs';
import { PlayerProfileService } from './player-profile.service';

@Component({
  selector: 'app-player-name',
  imports: [ReactiveFormsModule, TranslatePipe, ButtonComponent, TextBoxComponent],
  templateUrl: './player-name.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlayerNameComponent {
  readonly fieldId = input('settings-player-name');
  readonly showSaved = input(true);
  private readonly profile = inject(PlayerProfileService);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly form = inject(NonNullableFormBuilder).group({
    displayName: ['', [Validators.required, Validators.maxLength(32), Validators.pattern(/^(?=.*\S)[^\u0000-\u001f\u007f-\u009f]+$/u)]],
  });
  readonly pending = signal(false);
  protected readonly status = signal<'saved' | 'failed' | null>(null);

  constructor() {
    effect(() => {
      const profile = this.profile.state();
      if (profile.kind === 'ready') this.form.reset({ displayName: profile.displayName ?? '' });
    });
  }

  protected save(): void {
    if (this.pending()) return;
    this.status.set(null);
    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    this.pending.set(true);
    this.profile.save(this.form.controls.displayName.value.trim()).pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.pending.set(false)),
    ).subscribe({
      next: () => this.status.set('saved'),
      error: () => this.status.set('failed'),
    });
  }
}
