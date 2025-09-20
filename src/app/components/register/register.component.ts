import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { RegisterRequest } from '../../models/auth.model';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css'
})
export class RegisterComponent {

private fb = inject(FormBuilder);
  private router = inject(Router);
  public authService = inject(AuthService);

  // Signals for reactive state
  errorMessage = signal<string>('');
  successMessage = signal<string>('');
  showPassword = signal<boolean>(false);
  showConfirmPassword = signal<boolean>(false);

  registerForm: FormGroup = this.fb.group({
    username: ['', [Validators.required, Validators.minLength(3)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [
      Validators.required, 
      Validators.minLength(8),
      Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    ]],
    confirmPassword: ['', [Validators.required]],
    phoneNumber: ['', [Validators.pattern(/^(\+966|0)?[5][0-9]{8}$/)]],
    address: [''],
    role: ['USER'],
    acceptTerms: [false, [Validators.requiredTrue]]
  }, {
    validators: [this.passwordMatchValidator]
  });

  onSubmit(): void {
    if (this.registerForm.valid) {
      this.errorMessage.set('');
      
      const formValue = this.registerForm.value;
      const registerRequest: RegisterRequest = {
        username: formValue.username,
        email: formValue.email,
        password: formValue.password,
        phoneNumber: formValue.phoneNumber || undefined,
        address: formValue.address || undefined,
        roles: [formValue.role]
      };

      this.authService.register(registerRequest).subscribe({
        next: (userInfo) => {
          this.successMessage.set('تم إنشاء الحساب بنجاح! يمكنك الآن تسجيل الدخول');
          this.registerForm.reset();
          
          setTimeout(() => {
            this.router.navigate(['/login'], {
              queryParams: { message: 'registration-success' }
            });
          }, 2000);
        },
        error: (error) => {
          let errorMsg = 'حدث خطأ في إنشاء الحساب';
          
          if (error.error?.message) {
            errorMsg = error.error.message;
          } else if (error.message) {
            errorMsg = error.message;
          }
          
          this.errorMessage.set(errorMsg);
        }
      });
    } else {
      this.markAllFieldsAsTouched();
    }
  }

  togglePassword(): void {
    this.showPassword.update(value => !value);
  }

  toggleConfirmPassword(): void {
    this.showConfirmPassword.update(value => !value);
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.registerForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  private passwordMatchValidator(control: AbstractControl): {[key: string]: any} | null {
    const password = control.get('password');
    const confirmPassword = control.get('confirmPassword');
    
    if (password && confirmPassword && password.value !== confirmPassword.value) {
      confirmPassword.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    }
    
    return null;
  }

  private markAllFieldsAsTouched(): void {
    Object.keys(this.registerForm.controls).forEach(key => {
      this.registerForm.get(key)?.markAsTouched();
    });
  }
}
