import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/auth-guard';

// Each page is its own bundle, so opening /login doesn't download the workspace.
export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/notebook-list/notebook-list').then((m) => m.NotebookList),
    canActivate: [authGuard],
  },
  {
    path: 'notebooks/:notebookId',
    loadComponent: () => import('./features/workspace/workspace').then((m) => m.Workspace),
    canActivate: [authGuard],
  },
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login').then((m) => m.Login),
    canActivate: [guestGuard],
  },
  {
    path: 'register',
    loadComponent: () => import('./features/auth/register/register').then((m) => m.Register),
    canActivate: [guestGuard],
  },
  { path: '**', redirectTo: '' },
];
