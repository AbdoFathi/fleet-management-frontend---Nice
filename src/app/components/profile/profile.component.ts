import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { UserInfo } from '../../models/user.model'; 

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.css'
})
export class ProfileComponent implements OnDestroy {
  currentUser: UserInfo | null = null;
  profileForm: FormGroup;
  passwordForm: FormGroup;
  isUpdatingProfile = false;
  isChangingPassword = false;
  isLoggingOutAll = false;
  private destroy$ = new Subject<void>();

  constructor(
    private authService: AuthService,
    private formBuilder: FormBuilder
  ) {
    this.profileForm = this.createProfileForm();
    this.passwordForm = this.createPasswordForm();

    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        this.currentUser = user;
        if (user) {
          this.profileForm.patchValue({
            username: user.username,
            email: user.email,
            phoneNumber: user.phoneNumber,
          });
        }
      });
  }

  private createProfileForm(): FormGroup {
    return this.formBuilder.group({
      username: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phoneNumber: [''],
      address: ['']
    });
  }

  private createPasswordForm(): FormGroup {
    return this.formBuilder.group({
      currentPassword: ['', Validators.required],
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required]
    }, {
      validators: this.passwordMatchValidator
    });
  }

  private passwordMatchValidator(formGroup: FormGroup) {
    const newPassword = formGroup.get('newPassword');
    const confirmPassword = formGroup.get('confirmPassword');
    
    if (newPassword?.value !== confirmPassword?.value) {
      confirmPassword?.setErrors({ mismatch: true });
      return { mismatch: true };
    }
    
    return null;
  }

  onUpdateProfile(): void {
    if (this.profileForm.valid && !this.isUpdatingProfile) {
      this.isUpdatingProfile = true;
      
      // Simulate API call
      setTimeout(() => {
        console.log('Profile updated:', this.profileForm.value);
        this.isUpdatingProfile = false;
      }, 2000);
    }
  }

  onChangePassword(): void {
    if (this.passwordForm.valid && !this.isChangingPassword) {
      this.isChangingPassword = true;
      
      // Simulate API call
      setTimeout(() => {
        console.log('Password changed');
        this.passwordForm.reset();
        this.isChangingPassword = false;
      }, 2000);
    }
  }

  logoutFromAllDevices(): void {
    this.isLoggingOutAll = true;
    
    // Simulate API call
    setTimeout(() => {
      this.isLoggingOutAll = false;
      this.authService.logout().subscribe();
    }, 2000);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}