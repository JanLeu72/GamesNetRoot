import { isPlatformBrowser } from '@angular/common';
import { inject, PLATFORM_ID } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { AuthenticationService } from './authentication.service';
import { DEFAULT_LANGUAGE, Language, localizedUrl, splitLocalizedUrl } from '../i18n/localized-url';

export const restoreSessionInBackground: CanActivateFn = () => {
  if (!isPlatformBrowser(inject(PLATFORM_ID))) return true;
  inject(AuthenticationService).restoreSession().subscribe();
  return true;
};

export const authGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const language: Language = route.data['language'] ?? DEFAULT_LANGUAGE;
  return inject(AuthenticationService).restoreSession().pipe(
    map(session => !!session || router.createUrlTree([localizedUrl('/user/login', language)], {
      queryParams: { returnUrl: state.url },
    })),
  );
};

export const guestGuard: CanActivateFn = (route) => {
  const router = inject(Router);
  const language: Language = route.data['language'] ?? DEFAULT_LANGUAGE;
  return inject(AuthenticationService).restoreSession().pipe(
    map(session => !session || router.parseUrl(gameReturnUrl(route.queryParamMap.get('returnUrl'), language))),
  );
};

export function gameReturnUrl(returnUrl: string | null, language: Language): string {
  if (!returnUrl) return localizedUrl('/', language);
  const { path } = splitLocalizedUrl(returnUrl);
  const canReturn = path === '/user/settings' || path === '/games/brick-breaker' || /^\/games\/[^/\\]+\/details$/.test(path);
  return localizedUrl(canReturn ? returnUrl : '/', language);
}
