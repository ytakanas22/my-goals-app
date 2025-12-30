import { isPlatformBrowser } from '@angular/common';
import { Inject, Injectable, PLATFORM_ID, InjectionToken } from '@angular/core';
import type AlaSQL from 'alasql'; // 型情報だけをインポート（ビルドには影響しない）

// AlaSQL用のトークンを定義
export const ALASQL_TOKEN = new InjectionToken<typeof AlaSQL>('alasql', {
  providedIn: 'root',
  factory: () => {
    // サーバーサイド（Node.js）実行時は null を返すようにガードする
    if (typeof window !== 'undefined') {
      return (window as any).alasql;
    }
    return null; 
  }
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

    // 1. 手動でユニークなID（数値）を生成
    // Date.now() は現在の時刻をミリ秒で返すため、重複しにくく数値として扱えます
    const newId = Date.now();

    // 2. IDも含めて INSERT する
    await this.alasql.promise(
      'INSERT INTO goals (id, title, description, target_year, deadline, progress, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())',
      [
        newId,
        title,
        description,
        year,
        deadline?.toISOString(),
        0,          // progress
        'active'    // status
      ]
    );

    console.log('手動生成されたIDで保存しました:', newId);
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

    // 確実に数値に変換し、実行結果をログに出す
    const numericId = Number(id);
    console.log('削除を実行するID:', numericId);

    try {
      const result = await this.alasql.promise('DELETE FROM goals WHERE id = ?', [numericId]);
      console.log('削除結果（件数など）:', result);
    } catch (e) {
      console.error('削除SQL実行エラー:', e);
    }
  }
}