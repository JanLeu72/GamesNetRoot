import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './auth/auth.guard';

export const routes: Routes = [
  {
    path: 'user/login',
    title: 'Anmelden | NetRoot Games',
    canActivate: [guestGuard],
    loadComponent: () => import('./auth/login.component').then((m) => m.LoginComponent),
  },
  {
    path: '',
    pathMatch: 'full',
    title: 'NetRoot Games',
    canActivate: [authGuard],
    loadComponent: () => import('./games-home.component').then((m) => m.GamesHomeComponent),
  },
  {
    path: 'games/brick-breaker',
    title: 'Brick Breaker | NetRoot Games',
    canActivate: [authGuard],
    loadComponent: () => import('./games/brick-breaker/brick-breaker').then((m) => m.BrickBreaker),
  },
  { path: '**', redirectTo: '' },
];
