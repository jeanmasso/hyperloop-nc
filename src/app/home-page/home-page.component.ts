import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-home-page',
  imports: [],
  templateUrl: './home-page.component.html',
  styleUrl: './home-page.component.css'
})
export class HomePageComponent {

  constructor(private router: Router) {}

  navigateToSearch(): void {
    this.router.navigate(['/search']);
  }

  navigateToSchedules(): void {
    this.router.navigate(['/schedules']);
  }

  navigateToStations(): void {
    this.router.navigate(['/stations']);
  }

  navigateToPrices(): void {
    this.router.navigate(['/prices']);
  }
}
