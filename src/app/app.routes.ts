import { inject } from '@angular/core';
import { ResolveFn, Routes } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { map } from 'rxjs';
import { authGuard, guestGuard, restoreSessionInBackground } from './auth/auth.guard';

function pageTitle(key: string): ResolveFn<string> {
  return () => inject(TranslateService).get(key).pipe(map(title => `${title} | NetRoot Games`));
}

export const routes: Routes = [
  {
    path: 'user/settings',
    title: 'NetRoot Games',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./user-settings/user-settings').then((m) => m.UserSettingsComponent),
  },
  {
    path: 'user/login',
    title: 'NetRoot Games',
    canActivate: [guestGuard],
    loadComponent: () => import('./auth/login.component').then((m) => m.LoginComponent),
  },
  {
    path: '',
    pathMatch: 'full',
    title: 'NetRoot Games',
    canActivate: [restoreSessionInBackground],
    loadComponent: () => import('./home/games-home.component').then((m) => m.GamesHomeComponent),
  },
  {
    path: 'games/:slug/details',
    title: pageTitle('home.detailTitle'),
    canActivate: [restoreSessionInBackground],
    loadComponent: () => import('./home/game-detail.component').then((m) => m.GameDetailComponent),
  },
  {
    path: 'games/brick-breaker',
    title: 'Brick Breaker | NetRoot Games',
    canActivate: [authGuard],
    loadComponent: () => import('./games/brick-breaker/brick-breaker').then((m) => m.BrickBreaker),
  },
  {
    path: 'logged-out',
    title: pageTitle('pages.loggedOut.title'),
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./_layouts/logged-out/logged-out.component').then((m) => m.LoggedOutComponent),
  },
  {
    path: '**',
    title: pageTitle('pages.notFound.title'),
    loadComponent: () =>
      import('./_layouts/page-not-found/page-not-found.component').then(
        (m) => m.PageNotFoundComponent,
      ),
  },
];
