import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DatabaseService, Goal } from '../../services/database';

import { MatCardModule } from '@angular/material/card';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDialog, MatDialogModule } from '@angular/material/dialog'; 
import { ProgressDialogComponent } from '../progress-dialog.component/progress-dialog.component';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { MatChipsModule } from '@angular/material/chips';

@Component({
  selector: 'app-view',
  standalone: true,
  imports: [
    CommonModule, MatCardModule, MatProgressBarModule, FormsModule,
    MatButtonModule, MatIconModule, MatSelectModule, MatFormFieldModule, MatDialogModule,
    MatChipsModule
  ],
  templateUrl: './view.component.html',
  styleUrls: ['./view.component.scss']
})
export class ViewComponent implements OnInit {
  allGoals: Goal[] = []; // バックアップ用の全データ
  goals: Goal[] = [];
  userName: string = '';
  yearList: number[] = [new Date().getFullYear()];
  selectedYear: number = new Date().getFullYear();

  // タグフィルタ用
  tagList: string[] = [];
  selectedTag: string = 'すべて';

  private dbService = inject(DatabaseService);
  private authService = inject(AuthService);
  private dialog = inject(MatDialog);
  private cdr = inject(ChangeDetectorRef);

  async ngOnInit() {
    this.userName = this.authService.currentUserName() || '';
    await this.dbService.syncFromCloud(this.userName);
    await this.loadGoals();
  }

  async loadGoals() {
      try {
        // サービス側で ensureDb が解決されるのを待ってから SELECT
        const data = await this.dbService.getGoalsByYear(this.selectedYear, this.userName);
        this.allGoals = data || [];

        this.extractTags();
        this.applyFilter();
        this.yearList = this.makeYearList(this.allGoals);
        
        // 非同期処理後のため、強制的に検知を走らせる
        this.cdr.markForCheck(); 
        this.cdr.detectChanges();
      } catch (error) {
        console.error('Failed to load goals:', error);
      }
    }

  /**
   * 進捗更新ダイアログを開く
   */
  openProgressDialog(goal: Goal) {
    const dialogRef = this.dialog.open(ProgressDialogComponent, {
      width: '600px',
      data: { ...goal } // データのコピーを渡す
    });
    dialogRef.afterClosed().subscribe(async (result) => {
      if (result && goal.id) {
        await this.dbService.updateGoal(
          goal.id, 
          result.progress, 
          result.status,
          result.description,
          result.deadline,
          result.tags
        );
        // 一覧を再読み込みして画面を更新
        await this.loadGoals();
      }
    });
    this.cdr.detectChanges();
  }

  applyFilter() {
    if (this.selectedTag === 'すべて') {
      this.goals = [...this.allGoals];
    } else {
      this.goals = this.allGoals.filter(goal => 
        goal.tags && goal.tags.includes(this.selectedTag)
      );
    }
    this.cdr.detectChanges();
  }

  async onDelete(id: number) {
    if (confirm('この目標を削除しますか？')) {
      await this.dbService.deleteGoal(id);
      await this.loadGoals();
    }
    this.cdr.detectChanges();
  }

  private makeYearList(goals: Goal[]): number[] {
    goals.forEach(goal => {
      const year = goal.target_year;
      if (!this.yearList.includes(year)) {
        this.yearList.push(year);
      }
    });
    return this.yearList.sort((a, b) => b - a); // 降順にソート
  }

  private extractTags() {
    const tags = new Set<string>();
    this.allGoals.forEach(goal => {
      if (goal.tags) {
        goal.tags.forEach(t => tags.add(t));
      }
    });
    this.tagList = Array.from(tags).sort();
  }
}