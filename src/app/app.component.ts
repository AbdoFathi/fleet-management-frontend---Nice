import { RouterOutlet } from '@angular/router';
import { Component, OnInit } from '@angular/core';
import { AuthService } from './services/auth.service'
import { CommonModule } from '@angular/common';
import { NavbarComponent } from './components/navbar/navbar.component';


@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, NavbarComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  constructor() {}
}