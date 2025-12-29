import { isPlatformBrowser } from '@angular/common';
import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { PGlite } from '@electric-sql/pglite';

// 目標データの型定義
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

@Injectable({
  providedIn: 'root'
})
export class DatabaseService {
  private db: PGlite | null = null;

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {} // プラットフォーム判定を注入

  /**
   * 目標一覧を取得する
   */
  async getGoals(): Promise<Goal[]> {
    const db = await this.ensureDb();
    if (!db) return [];
    const result = await db.query<Goal>('SELECT * FROM goals ORDER BY created_at DESC;');
    return result.rows;
  }

  /**
   * 新しい目標を追加する
   */
  async addGoal(title: string): Promise<void> {
    const db = await this.ensureDb();
    if (!db) return;
    await db.query('INSERT INTO goals (title) VALUES ($1);', [title]);
  }

  // addGoalExtended と getGoalsByYear を追加
  async addGoalExtended(title: string, description: string, year: number, deadline: Date): Promise<void> {
    const db = await this.ensureDb();
    if (!db) return;
    await db.query(
      'INSERT INTO goals (title, description, target_year, deadline) VALUES ($1, $2, $3, $4);',
      [title, description, year, deadline?.toISOString()]
    );
  }

  async updateGoalProgress(id: number, progress: number, status: string): Promise<void> {
    const db = await this.ensureDb();
    if (!db) return;
    await db.query(
      'UPDATE goals SET progress = $1, status = $2 WHERE id = $3;',
      [progress, status, id]
    );
  }

  async getGoalsByYear(year: number): Promise<Goal[]> {
    const db = await this.ensureDb();
    if (!db) return [];
    const result = await db.query<Goal>(
      'SELECT * FROM goals WHERE target_year = $1 ORDER BY deadline ASC;',
      [year]
    );
    return result.rows;
  }

  /**
   * 目標を削除する
   */
  async deleteGoal(id: number): Promise<void> {
    const db = await this.ensureDb();
    if (!db) return;
    await db.query('DELETE FROM goals WHERE id = $1;', [id]);
  }

  /**
   * データベースの初期化
   * 初回呼び出し時にDBインスタンスを作成し、テーブルがなければ作成します
   */
private async ensureDb() {
    // ブラウザ環境でない（SSR中）なら何もしない
    if (!isPlatformBrowser(this.platformId)) {
      return null;
    }

    if (!this.db) {
      this.db = new PGlite('idb://my-goals-db');
      await this.db.exec(`
        CREATE TABLE IF NOT EXISTS goals (
          id SERIAL PRIMARY KEY,
          title TEXT NOT NULL,
          description TEXT,
          target_year INTEGER NOT NULL,
          deadline DATE,
          progress INTEGER DEFAULT 0,
          status TEXT DEFAULT 'active',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
    }
    return this.db;
  }
}