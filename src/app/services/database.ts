import { Injectable } from '@angular/core';
import { PGlite } from '@electric-sql/pglite';

// 目標データの型定義
export interface Goal {
  id?: number;
  title: string;
  created_at?: string;
}

@Injectable({
  providedIn: 'root'
})
export class DatabaseService {
  private db: PGlite | null = null;

  constructor() {}

  /**
   * 目標一覧を取得する
   */
  async getGoals(): Promise<Goal[]> {
    const db = await this.ensureDb();
    const result = await db.query<Goal>('SELECT * FROM goals ORDER BY created_at DESC;');
    return result.rows;
  }

  /**
   * 新しい目標を追加する
   */
  async addGoal(title: string): Promise<void> {
    const db = await this.ensureDb();
    await db.query('INSERT INTO goals (title) VALUES ($1);', [title]);
  }

  /**
   * 目標を削除する
   */
  async deleteGoal(id: number): Promise<void> {
    const db = await this.ensureDb();
    await db.query('DELETE FROM goals WHERE id = $1;', [id]);
  }

  /**
   * データベースの初期化
   * 初回呼び出し時にDBインスタンスを作成し、テーブルがなければ作成します
   */
  private async ensureDb() {
    if (!this.db) {
      // 'idb://...' と指定することでブラウザのIndexedDBに永続化されます
      this.db = new PGlite('idb://my-goals-db');
      
      // 初期テーブル作成
      await this.db.exec(`
        CREATE TABLE IF NOT EXISTS goals (
          id SERIAL PRIMARY KEY,
          title TEXT NOT NULL,
          description TEXT,
          deadline DATE,
          progress INTEGER DEFAULT 0, -- 0-100
          status TEXT DEFAULT 'active', -- 'active' or 'completed'
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
    }
    return this.db;
  }
}