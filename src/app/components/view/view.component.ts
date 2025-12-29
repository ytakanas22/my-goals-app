import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DatabaseService, Goal } from '../../services/database';

import { MatCardModule } from '@angular/material/card';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';


@Component({
  selector: 'app-view',
  standalone: true,
  imports: [
    CommonModule, MatCardModule, MatProgressBarModule, 
    MatButtonModule, MatIconModule, MatSelectModule, MatFormFieldModule
  ],
  templateUrl: './view.component.html',
  styleUrls: ['./view.component.scss']
})
export class ViewComponent implements OnInit {
  goals: Goal[] = [];
  selectedYear: number = new Date().getFullYear();
  years = [2024, 2025, 2026];

  constructor(private dbService: DatabaseService) {}

  async ngOnInit() {
    await this.loadGoals();
  }

  async loadGoals() {
    // 年度指定で取得するようにServiceを後ほど修正
    this.goals = await this.dbService.getGoalsByYear(this.selectedYear);
  }

  async onDelete(id: number) {
    if (confirm('この目標を削除しますか？')) {
      await this.dbService.deleteGoal(id);
      await this.loadGoals();
    }
  }

  openProgressDialog(goal: Goal) {
    // TODO: ダイアログの実装
    console.log('Open dialog for', goal);
  }
}