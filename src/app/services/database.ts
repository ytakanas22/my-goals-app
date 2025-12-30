import { isPlatformBrowser } from '@angular/common';
import { Inject, Injectable, PLATFORM_ID, InjectionToken } from '@angular/core';
import type AlaSQL from 'alasql'; // 型情報だけをインポート（ビルドには影響しない）

// AlaSQL用のトークンを定義
export const ALASQL_TOKEN = new InjectionToken<typeof AlaSQL>('alasql', {
  providedIn: 'root',
  factory: () => (window as any).alasql // グローバルな実体とAngularを繋ぐ唯一の接点
});

export interface Goal {
  id?: number;
  title: string;
  created_at?: string;
  status?: 'active' | 'completed';
  target_year?: number;
  description?: string;
  deadline?: string;
  progress?: number;
}

@Injectable({ providedIn: 'root' })
export class DatabaseService {
  private isInitialized = false;

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    @Inject(ALASQL_TOKEN) private alasql: typeof AlaSQL
  ) {}

  private async ensureDb(): Promise<boolean> {
    if (!isPlatformBrowser(this.platformId)) return false;

    if (!this.isInitialized) {
      try {
        // DI経由で受け取ったalasqlを使用
        await this.alasql.promise('CREATE INDEXEDDB DATABASE IF NOT EXISTS goal_db');
        await this.alasql.promise('ATTACH INDEXEDDB DATABASE goal_db');
        await this.alasql.promise('USE goal_db');

        await this.alasql.promise(`
          CREATE TABLE IF NOT EXISTS goals (
            id INT AUTO_INCREMENT PRIMARY KEY,
            title STRING NOT NULL,
            description STRING,
            target_year INT NOT NULL,
            deadline STRING,
            progress INT DEFAULT 0,
            status STRING DEFAULT 'active',
            created_at DATETIME DEFAULT NOW()
          );
        `);
        this.isInitialized = true;
      } catch (e) {
        console.error('AlaSQL Initialization failed', e);
        return false;
      }
    }
    return true;
  }

  async addGoalExtended(title: string, description: string, year: number, deadline: Date): Promise<void> {
    const ok = await this.ensureDb();
    if (!ok) return;
    await this.alasql.promise(
      'INSERT INTO goals (title, description, target_year, deadline, progress, status) VALUES (?, ?, ?, ?, 0, "active")',
      [title, description, year, deadline?.toISOString()]
    );
  }

  async updateGoalProgress(id: number, progress: number, status: string): Promise<void> {
    const ok = await this.ensureDb();
    if (!ok) return;
    await this.alasql.promise(
      'UPDATE goals SET progress = $1, status = $2 WHERE id = $3;',
      [progress, status, id]
    );
  }

  async getGoalsByYear(year: number): Promise<Goal[]> {
    const ok = await this.ensureDb();
    if (!ok) return [];
    return await this.alasql.promise('SELECT * FROM goals WHERE target_year = ? ORDER BY deadline ASC', [year]);
  }

  async deleteGoal(id: number): Promise<void> {
    const ok = await this.ensureDb();
    if (!ok) return;
    await this.alasql.promise('DELETE FROM goals WHERE id = ?', [id]);
  }
}