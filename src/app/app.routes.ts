import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, RedirectCommand, Route, Router, Routes } from '@angular/router';
import { authGuard, guestGuard, restoreSessionInBackground } from './auth/auth.guard';
import { LanguageService } from './i18n/language.service';
import { DEFAULT_LANGUAGE, Language, languages, localizedUrl, splitLocalizedUrl, supportedLanguage } from './i18n/localized-url';

type LocalizedPage = Omit<Route, 'canActivate'> & { path: string; guard?: CanActivateFn };

const pages: LocalizedPage[] = [
  {
    path: 'user/settings',
    guard: authGuard,
    loadComponent: () =>
      import('./user-settings/user-settings').then((m) => m.UserSettingsComponent),
  },
  {
    path: 'user/login',
    guard: guestGuard,
    loadComponent: () => import('./auth/login.component').then((m) => m.LoginComponent),
  },
  {
    path: '',
    pathMatch: 'full',
    title: 'seo.homeTitle',
    data: { description: 'seo.homeDescription' },
    guard: restoreSessionInBackground,
    loadComponent: () => import('./home/games-home.component').then((m) => m.GamesHomeComponent),
  },
  {
    path: 'games/:slug/details',
    title: route => route.paramMap.get('slug') === 'brick-breaker' ? 'seo.brickBreakerTitle' : 'home.detailTitle',
    resolve: {
      description: (route: ActivatedRouteSnapshot) => route.paramMap.get('slug') === 'brick-breaker'
        ? 'seo.brickBreakerDescription'
        : 'seo.homeDescription',
    },
    guard: restoreSessionInBackground,
    loadComponent: () => import('./home/game-detail.component').then((m) => m.GameDetailComponent),
  },
  {
    path: 'games/brick-breaker',
    title: 'seo.brickBreakerTitle',
    data: { keepGame: true },
    guard: authGuard,
    loadComponent: () => import('./games/brick-breaker/brick-breaker').then((m) => m.BrickBreaker),
  },
  {
    path: 'logged-out',
    title: 'pages.loggedOut.title',
    guard: guestGuard,
    loadComponent: () =>
      import('./_layouts/logged-out/logged-out.component').then((m) => m.LoggedOutComponent),
  },
];

const notFound: LocalizedPage = {
  path: '**',
  title: 'pages.notFound.title',
  loadComponent: () =>
    import('./_layouts/page-not-found/page-not-found.component').then(
      (m) => m.PageNotFoundComponent,
    ),
};

function withLanguage({ guard, ...page }: LocalizedPage, language: Language): Route {
  return {
    ...page,
    data: { ...page.data, language },
    runGuardsAndResolvers: 'paramsOrQueryParamsChange',
    canActivate: [(route, state) => {
      if (!route.queryParamMap.has('lang')) return guard?.(route, state) ?? true;
      const router = inject(Router);
      const target = splitLocalizedUrl(state.url).prefix ?? supportedLanguage(route.queryParamMap.get('lang')) ?? language;
      const url = router.parseUrl(localizedUrl(state.url, target));
      delete url.queryParams['lang'];
      return new RedirectCommand(url, { replaceUrl: true });
    }],
    resolve: { ...page.resolve, localeReady: () => inject(LanguageService).apply(language) },
  };
}

export const routes: Routes = [
  ...languages.flatMap(language => pages.map(page => ({
    ...withLanguage(page, language),
    path: localizedUrl('/' + page.path, language).slice(1),
  }))),
  ...languages.filter(language => language !== DEFAULT_LANGUAGE).map(language => ({
    path: language,
    children: [withLanguage(notFound, language)],
  })),
  withLanguage(notFound, DEFAULT_LANGUAGE),
];
