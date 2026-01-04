import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { COMMA, ENTER } from '@angular/cdk/keycodes';

// Angular Material
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule, MatChipInputEvent } from '@angular/material/chips';

import { DatabaseService } from '../../services/database';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, MatCardModule, MatFormFieldModule,
    MatInputModule, MatSelectModule, MatDatepickerModule, MatNativeDateModule,
    MatButtonModule, MatIconModule, MatChipsModule
  ],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent implements OnInit {
  goalForm!: FormGroup;
  years = [2024, 2025, 2026];

  // チップス（タグ）用の設定
  addOnBlur = true;
  readonly separatorKeysCodes = [ENTER, COMMA] as const;
  tags: string[] = []; // ここに選択されたタグを保持

  private authService = inject(AuthService);
  private dbService = inject(DatabaseService);

  constructor(
    private fb: FormBuilder,
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

  addTag(event: MatChipInputEvent): void {
    const value = (event.value || '').trim();
    if (value) {
      this.tags.push(value);
    }
    event.chipInput!.clear();
  }

  removeTag(tag: string): void {
    const index = this.tags.indexOf(tag);
    if (index >= 0) {
      this.tags.splice(index, 1);
    }
  }

  async onSubmit() {
    if (this.goalForm.valid) {
      try {
        const { title, description, target_year, deadline } = this.goalForm.value;
        const userName = this.authService.currentUserName() || ''; // ユーザー名取得
        
        await this.dbService.addGoalExtended(
          title, 
          userName,
          description, 
          target_year, 
          deadline,
          this.tags
        );
        
        this.router.navigate(['/view']);
      } catch (error) { console.error(error); }
    }
  }
}