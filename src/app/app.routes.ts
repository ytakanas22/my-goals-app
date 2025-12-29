import { Routes } from '@angular/router';
import { MainComponent } from './components/main/main.component';
import { RegisterComponent } from './components/register/register.component';
import { ViewComponent } from './components/view/view.component';


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