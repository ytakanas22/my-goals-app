// src/app/services/auth.service.ts
import { isPlatformBrowser } from '@angular/common';
import { Inject, Injectable, PLATFORM_ID, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly USER_KEY = 'goal_app_user';

  currentUser = signal<string | null>(this.getInitialUser());

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  currentUserName(): string | null {
    // ブラウザ環境の時だけ localStorage を触る
    if (isPlatformBrowser(this.platformId)) {
      return localStorage.getItem(this.USER_KEY);
    }
    // サーバー環境ではとりあえず null を返しておく
    return null;
  }

  setUserName(name: string) {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem(this.USER_KEY, name.trim());
      this.currentUser.set(name);
    }
  }

  logout() {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem(this.USER_KEY);
      this.currentUser.set(null);
    }
  }

  private getInitialUser(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(this.USER_KEY);
    }
    return null;
  }
}