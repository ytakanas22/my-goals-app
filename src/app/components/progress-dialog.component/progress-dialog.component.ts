import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatSliderModule } from '@angular/material/slider';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { Goal } from '../../services/database';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIcon, MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';

@Component({
  selector: 'app-progress-dialog',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatDialogModule, MatSliderModule, MatCheckboxModule,
    MatButtonModule, MatFormFieldModule, MatIcon, MatInputModule, MatIconModule
  ],
  templateUrl: './progress-dialog.component.html',
  styleUrls: ['./progress-dialog.component.scss']
})
export class ProgressDialogComponent {
  progress: number;
  isCompleted: boolean;
  description: string;

  constructor(
    public dialogRef: MatDialogRef<ProgressDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: Goal
  ) {
    this.progress = data.progress || 0;
    this.isCompleted = data.status === 'completed';
    this.description = data.description || '';
  }

  get isCheckboxDisabled(): boolean {
    return this.progress === 100;
  }


  onSliderChange(val: number) {
    this.isCompleted = (val === 100);
  }

  onCheckboxChange(checked: boolean) {
    this.isCompleted = checked;
    if (checked) {
      this.progress = 100;
    }
  }

  onSave() {
    this.dialogRef.close({
      progress: this.progress,
      status: this.isCompleted ? 'completed' : 'active',
      description: this.description
    });
  }
}