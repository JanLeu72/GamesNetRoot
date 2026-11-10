import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { AuthenticationService } from './authentication.service';

export const authGuard: CanActivateFn = () => {
  const router = inject(Router);
  return inject(AuthenticationService).restoreSession().pipe(
    map(session => !!session || router.createUrlTree(['/user/login'])),
  );
};

export const guestGuard: CanActivateFn = () => {
  const router = inject(Router);
  return inject(AuthenticationService).restoreSession().pipe(
    map(session => !session || router.createUrlTree(['/'])),
  );
};
