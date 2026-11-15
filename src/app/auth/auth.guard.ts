import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { AuthenticationService } from './authentication.service';

export const restoreSessionInBackground: CanActivateFn = () => {
  inject(AuthenticationService).restoreSession().subscribe();
  return true;
};

export const authGuard: CanActivateFn = (_route, state) => {
  const router = inject(Router);
  return inject(AuthenticationService).restoreSession().pipe(
    map(session => !!session || router.createUrlTree(['/user/login'], {
      queryParams: state.url === '/' ? undefined : { returnUrl: state.url },
    })),
  );
};

export const guestGuard: CanActivateFn = (route) => {
  const router = inject(Router);
  return inject(AuthenticationService).restoreSession().pipe(
    map(session => !session || router.parseUrl(gameReturnUrl(route.queryParamMap.get('returnUrl')))),
  );
};

export function gameReturnUrl(returnUrl: string | null): string {
  if (returnUrl === '/user/settings') return returnUrl;
  return returnUrl?.startsWith('/games/') ? returnUrl : '/';
}
