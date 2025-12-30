import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';

// Angular Material
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { DatabaseService } from '../../services/database';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, MatCardModule, MatFormFieldModule,
    MatInputModule, MatSelectModule, MatDatepickerModule, MatNativeDateModule,
    MatButtonModule, MatIconModule
  ],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent implements OnInit {
  goalForm!: FormGroup;
  years = [2024, 2025, 2026];

  constructor(
    private fb: FormBuilder,
    private dbService: DatabaseService,
    private router: Router
  ) {}

  ngOnInit() {
    this.goalForm = this.fb.group({
      title: ['', Validators.required],
      description: [''],
      target_year: [new Date().getFullYear(), Validators.required],
      deadline: [null]
    });
  }

// register.component.ts
async onSubmit() {
  console.log('保存ボタンが押されました', this.goalForm.value); // これが表示されるかチェック

  if (this.goalForm.valid) {
    try {
      const { title, description, target_year, deadline } = this.goalForm.value;
      
      // Serviceのメソッド名が正しいか確認（addGoal か addGoalExtended か）
      await this.dbService.addGoalExtended(title, description, target_year, deadline);
      
      console.log('保存成功！一覧へ移動します');
      this.router.navigate(['/view']);
    } catch (error) {
      console.error('保存中にエラーが発生しました:', error);
    }
  } else {
    console.warn('フォームがバリデーションエラーです', this.goalForm.errors);
  }
}
}