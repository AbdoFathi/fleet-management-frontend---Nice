import { RouterOutlet } from '@angular/router';
import { Component, OnInit } from '@angular/core';
import { AuthService } from './services/auth.service'


@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  constructor() {}
}