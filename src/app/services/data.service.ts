import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { 
  Station, 
  Line, 
  LineSchedule, 
  Price
} from '../models/transport.models';

@Injectable({
  providedIn: 'root'
})
export class DataService {
  private readonly DATA_PATH = '/data/';

  constructor(private http: HttpClient) {}

  /**
   * Retourne toutes les stations
   */
  getStations(): Observable<Station[]> {
    return this.http.get<Station[]>(`${this.DATA_PATH}stations.json`);
  }

  /**
   * Retourne toutes les lignes
   */
  getLines(): Observable<Line[]> {
    return this.http.get<Line[]>(`${this.DATA_PATH}lines.json`);
  }

  /**
   * Retourne tous les horaires
   */
  getSchedules(): Observable<LineSchedule[]> {
    return this.http.get<LineSchedule[]>(`${this.DATA_PATH}schedules.json`);
  }

  /**
   * Retourne tous les prix
   */
  getPrices(): Observable<Price[]> {
    return this.http.get<Price[]>(`${this.DATA_PATH}prices.json`);
  }
}
