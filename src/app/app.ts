import { Component, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from './services/auth.service';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIcon } from '@angular/material/icon';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, MatCardModule, MatFormFieldModule, MatInputModule, MatIcon],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {
  userName: string | null = null;
  private authService = inject(AuthService);

  ngOnInit() {
    this.userName = this.authService.currentUserName();
  }

  login(name: string) {
    if (name.trim()) {
      this.authService.setUserName(name);
      this.userName = name; // これで @if が切り替わり、画面が表示される
    }
  }
}
