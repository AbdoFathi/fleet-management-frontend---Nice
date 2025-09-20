import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { UserInfo } from '../../models/user.model';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent implements OnDestroy {
  currentUser: UserInfo | null = null;
  private destroy$ = new Subject<void>();

  constructor(private authService: AuthService) {
    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => this.currentUser = user);
  }

  getGreetingMessage(): string {
    const hour = new Date().getHours();
    if (hour < 12) {
      return 'صباح الخير! نتمنى لك يوماً مثمراً';
    } else if (hour < 18) {
      return 'مساء الخير! كيف يسير عملك اليوم؟';
    } else {
      return 'مساء الخير! نتمنى أن تكون قد أنجزت كل مهامك';
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}