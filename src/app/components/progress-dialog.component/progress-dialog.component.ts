import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatSliderModule } from '@angular/material/slider';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { Goal } from '../../services/database';

@Component({
  selector: 'app-progress-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MatSliderModule, MatCheckboxModule, MatButtonModule],
  templateUrl: './progress-dialog.component.html',
  styleUrls: ['./progress-dialog.component.scss']
})
export class ProgressDialogComponent {
  progress: number;
  isCompleted: boolean;

  constructor(
    public dialogRef: MatDialogRef<ProgressDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: Goal
  ) {
    this.progress = data.progress || 0;
    this.isCompleted = data.status === 'completed';
  }

  onSliderChange(val: number) {
    if (val === 100) this.isCompleted = true;
  }

  onSave() {
    this.dialogRef.close({
      progress: this.progress,
      status: this.isCompleted ? 'completed' : 'active'
    });
  }
}