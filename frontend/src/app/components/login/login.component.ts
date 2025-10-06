import { Component } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { ButtonModule } from 'primeng/button';
import { CommonModule } from '@angular/common';
import { Auth as AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { Auth, signInWithPopup, GoogleAuthProvider, UserCredential } from '@angular/fire/auth';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, InputTextModule, PasswordModule, ButtonModule, MatInputModule, MatButtonModule],
  templateUrl: './login.html',
  styleUrls: ['./login.scss']
})
export class LoginComponent {
  errorMessage: string | null = null;
  loginForm: FormGroup;
  loading: boolean = false;
  

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,  // your local auth service
    private router: Router,
    private auth: Auth                 // Firebase Auth
  )  {
    this.auth.onAuthStateChanged(user => {
      if(user){
        console.log('Logged in user:', user);
      } else {
        console.log('User not logged in');
      }
    });
    this.loginForm = this.fb.group({
      usernameOrEmail: ['', Validators.required],
      password: ['', Validators.required]
    });
  }
  async loginWithGoogle() {
    const provider = new GoogleAuthProvider();
    try {
      const result: UserCredential = await signInWithPopup(this.auth, provider);

      // Get Firebase ID token
      const idToken = await result.user.getIdToken();

      // Optional: Send this idToken to your backend for verification/JWT/session
      // Example:
      // this.authService.loginWithFirebaseToken(idToken).subscribe(...);

    } catch (error) {
      console.error('Google login failed', error);
      // Optionally show error to user
    }
  }
  onSubmit() {
    if (this.loginForm.invalid) return;

    this.loading = true;
    this.errorMessage = null;

    this.authService.login(this.loginForm.value).subscribe({
      next: () => {
        this.loading = false;
        this.router.navigate(['/dashboard']); // Change to your protected route
      },
      error: (err:any) => {
        this.loading = false;
        this.errorMessage = 'Invalid username or password';
      },
    });
    // Your authentication logic here (call authService.login...)
  }
}
