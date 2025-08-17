import { Routes } from '@angular/router';
import { HomePageComponent } from './home-page/home-page.component';
import { SearchComponent } from './search/search.component';
import { SchedulesComponent } from './schedules/schedules.component';
import { StationsComponent } from './stations/stations.component';
import { PricesComponent } from './prices/prices.component';

export const routes: Routes = [
  { path: '', component: HomePageComponent },
  { path: 'home', component: HomePageComponent },
  { path: 'search', component: SearchComponent },
  { path: 'schedules', component: SchedulesComponent },
  { path: 'stations', component: StationsComponent },
  { path: 'prices', component: PricesComponent },
  { path: '**', redirectTo: '' }
];
