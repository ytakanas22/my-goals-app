import { Routes } from '@angular/router';
import { MainComponent } from './components/main/main';
import { RegisterComponent } from './components/register/register';
import { ViewComponent } from './components/view/view';


export const routes: Routes = [
  {
    path: '',
    component: MainComponent,
    children: [
      { path: 'register', component: RegisterComponent },
      { path: 'view', component: ViewComponent },
      { path: '', redirectTo: 'view', pathMatch: 'full' }
    ]
  }
];