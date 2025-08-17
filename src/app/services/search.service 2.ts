import { Injectable } from '@angular/core';
import { Observable, combineLatest } from 'rxjs';
import { map, filter } from 'rxjs/operators';
import { DataService } from './data.service';
import { 
  Station, 
  SearchResult, 
  ServiceClass, 
  Schedule 
} from '../models/transport.models';

export interface SearchCriteria {
  originId?: string;
  destinationId?: string;
  departureDate?: Date;
  serviceClass?: ServiceClass;
  timePreference?: 'morning' | 'afternoon' | 'evening' | 'any';
}

@Injectable({
  providedIn: 'root'
})
export class SearchService {

  constructor(private dataService: DataService) { }

  /**
   * Recherche de trajets avec critères avancés
   */
  searchWithCriteria(criteria: SearchCriteria): Observable<SearchResult[]> {
    if (!criteria.originId || !criteria.destinationId) {
      return new Observable(observer => observer.next([]));
    }

    return this.dataService.searchRoutes(criteria.originId, criteria.destinationId).pipe(
      map(results => this.filterByCriteria(results, criteria)),
      map(results => this.sortByRelevance(results, criteria))
    );
  }

  /**
   * Filtre les résultats selon les critères
   */
  private filterByCriteria(results: SearchResult[], criteria: SearchCriteria): SearchResult[] {
    return results.filter(result => {
      // Filtre par préférence horaire
      if (criteria.timePreference && criteria.timePreference !== 'any') {
        const firstStop = result.schedule.stops[0];
        if (firstStop?.departure_time) {
          const hour = parseInt(firstStop.departure_time.split(':')[0]);
          
          switch (criteria.timePreference) {
            case 'morning':
              if (hour < 6 || hour >= 12) return false;
              break;
            case 'afternoon':
              if (hour < 12 || hour >= 18) return false;
              break;
            case 'evening':
              if (hour < 18 || hour >= 24) return false;
              break;
          }
        }
      }

      return true;
    });
  }

  /**
   * Trie les résultats par pertinence
   */
  private sortByRelevance(results: SearchResult[], criteria: SearchCriteria): SearchResult[] {
    return results.sort((a, b) => {
      // Trier par heure de départ (plus tôt = meilleur)
      const timeA = a.schedule.stops[0]?.departure_time || '23:59';
      const timeB = b.schedule.stops[0]?.departure_time || '23:59';
      
      return timeA.localeCompare(timeB);
    });
  }

  /**
   * Calcule la durée estimée d'un trajet
   */
  calculateTripDuration(schedule: Schedule, originId: string, destinationId: string): string {
    const originStop = schedule.stops.find(stop => stop.station_id === originId);
    const destinationStop = schedule.stops.find(stop => stop.station_id === destinationId);
    
    if (!originStop?.departure_time || !destinationStop?.arrival_time) {
      return 'N/A';
    }

    const startTime = this.parseTime(originStop.departure_time);
    const endTime = this.parseTime(destinationStop.arrival_time);
    
    const diffMinutes = (endTime.getTime() - startTime.getTime()) / (1000 * 60);
    
    if (diffMinutes < 0) {
      // Le trajet passe minuit
      return 'N/A';
    }
    
    const hours = Math.floor(diffMinutes / 60);
    const minutes = Math.floor(diffMinutes % 60);
    
    if (hours > 0) {
      return `${hours}h${minutes > 0 ? ` ${minutes}min` : ''}`;
    }
    return `${minutes}min`;
  }

  /**
   * Parse une heure au format HH:MM
   */
  private parseTime(timeString: string): Date {
    const [hours, minutes] = timeString.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date;
  }

  /**
   * Obtient les suggestions de destinations populaires depuis une origine
   */
  getPopularDestinations(originId: string): Observable<Station[]> {
    return combineLatest([
      this.dataService.getStations(),
      this.dataService.getLines()
    ]).pipe(
      map(([stations, lines]) => {
        const popularDestinations: Station[] = [];
        
        // Trouve les lignes qui passent par l'origine
        lines.forEach(line => {
          if (line.station_ids.includes(originId)) {
            // Ajoute les autres stations de la ligne
            line.station_ids.forEach(stationId => {
              if (stationId !== originId) {
                const station = stations.find(s => s.id === stationId);
                if (station && !popularDestinations.find(d => d.id === station.id)) {
                  popularDestinations.push(station);
                }
              }
            });
          }
        });
        
        return popularDestinations.slice(0, 5); // Limite à 5 suggestions
      })
    );
  }

  /**
   * Recherche de stations par nom
   */
  searchStations(query: string): Observable<Station[]> {
    return this.dataService.getStations().pipe(
      map(stations => stations.filter(station => 
        station.name_fr.toLowerCase().includes(query.toLowerCase()) ||
        station.name_en.toLowerCase().includes(query.toLowerCase()) ||
        station.island_fr.toLowerCase().includes(query.toLowerCase())
      )),
      map(stations => stations.slice(0, 10)) // Limite les résultats
    );
  }
}
