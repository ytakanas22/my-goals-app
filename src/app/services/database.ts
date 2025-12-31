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
  id: number; // Date.now() で生成するIDは数値型
  user_name: string; // 目標を作成したユーザー名
  title: string; // 目標タイトル
  created_at: string; // 作成日時
  status: 'active' | 'completed'; // 目標の状態(default: 'active')
  target_year: number; // 目標年度(例：2026)
  description?: string; // 目標の詳細説明
  deadline?: string; // 目標の期限(例：'2026-12-31')
  progress?: number; // 進捗率(0-100, default: 0)
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
            user_name STRING NOT NULL, -- 追加
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

  async addGoalExtended(title: string, userName: string, description: string, year: number, deadline: Date): Promise<void> {
    const ok = await this.ensureDb();
    if (!ok) return;

    // 1. 手動でユニークなID（数値）を生成
    // Date.now() は現在の時刻をミリ秒で返すため、重複しにくく数値として扱えます
    const newId = Date.now();

    // 2. IDも含めて INSERT する
    await this.alasql.promise(
      'INSERT INTO goals (id, user_name, title, description, target_year, deadline, progress, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())',
      [
        newId,
        userName,
        title,
        description,
        year,
        deadline?.toISOString(),
        0,          // progress
        'active'    // status
      ]
    );
  }

  async updateGoal(id: number, progress: number, status: string, description: string): Promise<void> {
    const ok = await this.ensureDb();
    if (!ok) return;

    try {
      await this.alasql.promise(
        'UPDATE goals SET progress = ?, status = ?, description = ? WHERE id = ?',
        [progress, status, description, id]
      );
      console.log(`更新成功: ID=${id}`);
    } catch (e) {
      console.error('更新SQL実行エラー:', e);
    }
  }

  async getGoalsByYear(year: number, userName: string): Promise<Goal[]> {
      const ok = await this.ensureDb();
      if (!ok) return [];
      return await this.alasql.promise(
        'SELECT * FROM goals WHERE target_year = ? AND user_name = ? ORDER BY deadline ASC', 
        [year, userName]
      );
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