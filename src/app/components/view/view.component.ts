import { Component, inject, OnInit } from '@angular/core';
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



@Component({
  selector: 'app-view',
  standalone: true,
  imports: [
    CommonModule, MatCardModule, MatProgressBarModule, 
    MatButtonModule, MatIconModule, MatSelectModule, MatFormFieldModule, MatDialogModule
  ],
  templateUrl: './view.component.html',
  styleUrls: ['./view.component.scss']
})
export class ViewComponent implements OnInit {
  goals: Goal[] = [];
  selectedYear: number = new Date().getFullYear();
  years = [2024, 2025, 2026];

  private dbService = inject(DatabaseService);
  private dialog = inject(MatDialog);

  async ngOnInit() {
    await this.loadGoals();
  }

  async loadGoals() {
    // 年度指定で取得するようにServiceを後ほど修正
    this.goals = await this.dbService.getGoalsByYear(this.selectedYear);
  }

/**
   * 進捗更新ダイアログを開く
   */
  openProgressDialog(goal: Goal) {
    const dialogRef = this.dialog.open(ProgressDialogComponent, {
      width: '400px',
      data: { ...goal } // データのコピーを渡す
    });

    // ダイアログが閉じられた後の処理
    dialogRef.afterClosed().subscribe(async (result) => {
      if (result && goal.id) {
        // DBを更新
        await this.dbService.updateGoalProgress(
          goal.id, 
          result.progress, 
          result.status
        );
        // 一覧を再読み込みして画面を更新
        await this.loadGoals();
      }
    });
  }

  async onDelete(id: number) {
    if (confirm('この目標を削除しますか？')) {
      await this.dbService.deleteGoal(id);
      await this.loadGoals();
    }
  }
}