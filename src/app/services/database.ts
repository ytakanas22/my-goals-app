import { isPlatformBrowser } from '@angular/common';
import { Inject, Injectable, PLATFORM_ID, InjectionToken } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environment/environment';
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
  tags?: string[];
}

@Injectable({ providedIn: 'root' })
export class DatabaseService {
  private isInitialized = false;
  private supabase: SupabaseClient;
  

  constructor(
    @Inject(PLATFORM_ID) private platformId: object,
    @Inject(ALASQL_TOKEN) private alasql: typeof AlaSQL
  ) {
    this.supabase = createClient(environment.supabaseUrl, environment.supabaseKey);
  }

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
            user_name STRING NOT NULL,
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

  async addGoalExtended(title: string, userName: string, description: string, year: number, deadline: Date, tags: string[]): Promise<void> {
  const ok = await this.ensureDb();
    if (!ok) return;

    const newId = Date.now();
    const goal: Goal = {
      id: newId,
      user_name: userName,
      title,
      description,
      target_year: year,
      deadline: deadline?.toISOString(),
      progress: 0,
      status: 'active',
      tags: tags,
      created_at: new Date().toISOString()
    };

    // 1. AlaSQL (Local) - JSON型として保存
    await this.alasql.promise(
      'INSERT INTO goals (id, user_name, title, description, target_year, deadline, progress, status, tags, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [goal.id, goal.user_name, goal.title, goal.description, goal.target_year, goal.deadline, goal.progress, goal.status, JSON.stringify(goal.tags), goal.created_at]
    );

    // 2. Supabase (Cloud) - JSONBカラムに自動的に配列として入る
    await this.syncToCloud(goal);
  }

  async updateGoal(id: number, progress: number, status: string, description: string, deadline: string | undefined, tags: string[]): Promise<void> {
    const ok = await this.ensureDb();
    if (!ok) return;

    try {
      // 1. ローカル(AlaSQL)を更新
      await this.alasql.promise(
        'UPDATE goals SET progress = ?, status = ?, description = ?, deadline = ?, tags = ? WHERE id = ?',
        [progress, status, description, deadline, JSON.stringify(tags), id]
      );

      // 2. クラウド同期 (最新の状態を取得して送る)
      const results = await this.alasql.promise('SELECT * FROM goals WHERE id = ?', [id]) as Goal[];
      if (results && results.length > 0) {
        await this.syncToCloud(results[0]);
      }
    } catch (e) {
      console.error('更新エラー:', e);
    }
  }

  async getGoalsByYear(year: number, userName: string): Promise<Goal[]> {
      const ok = await this.ensureDb();
      if (!ok) return [];
      const results = await this.alasql.promise(
          'SELECT * FROM goals WHERE target_year = ? AND user_name = ? ORDER BY deadline ASC', 
          [year, userName]
        ) as Goal[];

      // tags が文字列で返ってきたら配列に変換してあげる
      return results.map((goal: Goal) => ({
        ...goal,
        tags: typeof goal.tags === 'string' ? JSON.parse(goal.tags) : (goal.tags || [])
      }));
    }

async deleteGoal(id: number): Promise<void> {
    const ok = await this.ensureDb();
    if (!ok) return;

    try {
      // 1. ローカル(AlaSQL)から削除
      await this.alasql.promise('DELETE FROM goals WHERE id = ?', [id]);

      // 2. クラウド(Supabase)から削除
      const { error } = await this.supabase
        .from('goals')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      console.log(`削除成功: ID=${id} (ローカル＆クラウド)`);
    } catch (e) {
      console.error('削除エラー:', e);
    }
  }

  /**
   * クラウド同期 (Sync Down): ログイン時にサーバーから最新データを取得して IndexedDB を更新
   */
  async syncFromCloud(userName: string): Promise<void> {
    const ok = await this.ensureDb();
    if (!ok) return;

    // Supabaseからデータを取得
    const { data, error } = await this.supabase
      .from('goals')
      .select('*')
      .eq('user_name', userName);

    if (error) {
      console.error('Supabaseからの取得失敗:', error);
      return;
    }

    if (data && data.length > 0) {
      // ローカルの既存データを一度消して、クラウドのデータで上書き（簡易的な同期）
      await this.alasql.promise('DELETE FROM goals WHERE user_name = ?', [userName]);
      for (const goal of data) {
        await this.alasql.promise('INSERT INTO goals VALUES ?', [goal]);
      }
      console.log('クラウドと同期完了');
    }
  }

  /**
   * クラウド保存 (Sync Up): 追加・更新・削除の後に呼ぶ
   */
  private async syncToCloud(goal: Goal): Promise<void> {
    const { error } = await this.supabase
      .from('goals')
      .upsert(goal); // upsertは「無ければ挿入、有れば更新」を行う便利な命令

    if (error) console.error('クラウド保存失敗:', error);
  }
}