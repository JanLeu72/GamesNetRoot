import { ChangeDetectionStrategy, Component, output } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { ButtonComponent } from '@progress/kendo-angular-buttons';
import { DialogActionsComponent, DialogComponent } from '@progress/kendo-angular-dialog';
import { PlayerNameComponent } from './player-name';

@Component({
  selector: 'app-player-name-dialog',
  imports: [ButtonComponent, DialogActionsComponent, DialogComponent, PlayerNameComponent, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <kendo-dialog [title]="'settings.promptTitle' | translate" [closable]="false"
                  [width]="420" [maxWidth]="'calc(100vw - 2rem)'" autoFocusedElement="#prompt-player-name">
      <p class="mb-4">{{ 'settings.promptIntro' | translate }}</p>
      <app-player-name #playerName fieldId="prompt-player-name" [showSaved]="false" />
      <kendo-dialog-actions>
        <button kendoButton type="button" [disabled]="playerName.pending()" (click)="dismissed.emit()">
          {{ 'settings.later' | translate }}
        </button>
      </kendo-dialog-actions>
    </kendo-dialog>
  `,
})
export class PlayerNameDialogComponent {
  readonly dismissed = output<void>();
}
