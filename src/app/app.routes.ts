import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  {
    path: 'login',
    loadComponent: () =>
      import('./pages/login/login').then(m => m.Login)
  },
  {
    path: 'customer',
    loadComponent: () =>
      import('./pages/customer/customer').then(m => m.Customer)
  },
  {
    path: 'admin',
    loadComponent: () =>
      import('./pages/admin/admin').then(m => m.Admin)
  },
  {
    path: 'kitchen',
    loadComponent: () =>
      import('./pages/kitchen/kitchen').then(m => m.Kitchen)
  },
  {
    path: 'delivery',
    loadComponent: () =>
      import('./pages/delivery/delivery').then(m => m.Delivery)
  },
];