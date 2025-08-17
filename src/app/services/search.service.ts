import { Injectable } from '@angular/core';
import { Observable, combineLatest, of } from 'rxjs';
import { map, filter } from 'rxjs/operators';
import { DataService } from './data.service';
import { 
  Station, 
  SearchResult, 
  ServiceClass, 
  Schedule,
  LineSchedule,
  Price
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
   * Recherche de trajets avec critères avancés en utilisant les méthodes fonctionnelles
   */
  searchWithCriteria(criteria: SearchCriteria): Observable<SearchResult[]> {
    if (!criteria.originId || !criteria.destinationId) {
      return of([]);
    }

    return combineLatest([
      this.dataService.getStations(),
      this.dataService.getSchedules(),
      this.dataService.getPrices()
    ]).pipe(
      map(([stations, schedules, prices]) => {
        const originStation = stations.find(s => s.id === criteria.originId);
        const destinationStation = stations.find(s => s.id === criteria.destinationId);
        
        if (!originStation || !destinationStation) {
          return [];
        }

        // Trouver les horaires qui connectent ces stations avec reduce() et filter()
        const relevantSchedules = this.findConnectingSchedules(
          schedules, 
          criteria.originId!, 
          criteria.destinationId!
        );

        // Trouver le prix correspondant avec filter()
        const priceInfo = prices.find(p => 
          p.origin_station_id === criteria.originId && 
          p.destination_station_id === criteria.destinationId
        );

        if (!priceInfo) {
          return [];
        }

        // Créer les résultats de recherche avec map()
        const results: SearchResult[] = relevantSchedules
          .map(schedule => ({
            origin: originStation,
            destination: destinationStation,
            schedule: schedule,
            price: priceInfo.prices,
            duration: this.calculateTripDuration(schedule, criteria.originId!, criteria.destinationId!),
            distance: this.calculateDistance(originStation, destinationStation)
          }))
          .filter(result => this.matchesCriteria(result, criteria)) // Appliquer les filtres
          .sort((a, b) => this.sortByRelevance(a, b, criteria)); // Trier

        return results;
      })
    );
  }

  /**
   * Trouve les horaires qui connectent deux stations en utilisant reduce() et filter()
   */
  private findConnectingSchedules(schedules: LineSchedule[], originId: string, destinationId: string): Schedule[] {
    return schedules
      .reduce((allSchedules: Schedule[], lineSchedule) => {
        // Utiliser filter() pour trouver les horaires valides de cette ligne
        const validSchedules = lineSchedule.schedules
          .filter(schedule => {
            const originStopIndex = schedule.stops.findIndex(stop => stop.station_id === originId);
            const destinationStopIndex = schedule.stops.findIndex(stop => stop.station_id === destinationId);
            
            // Vérifier que les deux stations sont sur cette ligne et dans le bon ordre
            return originStopIndex !== -1 && destinationStopIndex !== -1 && originStopIndex < destinationStopIndex;
          });
        
        // Reduce pour accumuler tous les horaires valides
        return [...allSchedules, ...validSchedules];
      }, []);
  }

  /**
   * Vérifie si un résultat correspond aux critères avec filter()
   */
  private matchesCriteria(result: SearchResult, criteria: SearchCriteria): boolean {
    // Filtre par préférence horaire
    if (criteria.timePreference && criteria.timePreference !== 'any') {
      const firstStop = result.schedule.stops.find(stop => stop.station_id === criteria.originId);
      if (firstStop?.departure_time) {
        const hour = parseInt(firstStop.departure_time.split(':')[0]);
        
        const timeRanges = {
          morning: { start: 6, end: 12 },
          afternoon: { start: 12, end: 18 },
          evening: { start: 18, end: 22 }
        };

        const range = timeRanges[criteria.timePreference];
        if (range && (hour < range.start || hour >= range.end)) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Fonction de tri par pertinence
   */
  private sortByRelevance(a: SearchResult, b: SearchResult, criteria: SearchCriteria): number {
    // Trier par heure de départ (plus tôt = meilleur)
    const timeA = a.schedule.stops[0]?.departure_time || '23:59';
    const timeB = b.schedule.stops[0]?.departure_time || '23:59';
    
    return timeA.localeCompare(timeB);
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
   * Calcule la distance approximative entre deux stations
   */
  private calculateDistance(origin: Station, destination: Station): number {
    const R = 6371; // Rayon de la Terre en km
    const dLat = this.degreesToRadians(destination.coordinates.lat - origin.coordinates.lat);
    const dLon = this.degreesToRadians(destination.coordinates.lon - origin.coordinates.lon);
    
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.degreesToRadians(origin.coordinates.lat)) * 
      Math.cos(this.degreesToRadians(destination.coordinates.lat)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    
    return Math.round(distance);
  }

  /**
   * Convertit les degrés en radians
   */
  private degreesToRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
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
   * Obtient les suggestions de destinations populaires avec map() et filter()
   */
  getPopularDestinations(originId: string): Observable<Station[]> {
    return combineLatest([
      this.dataService.getStations(),
      this.dataService.getLines()
    ]).pipe(
      map(([stations, lines]) => {
        // Utiliser reduce() pour collecter toutes les destinations
        const popularDestinations = lines
          .filter(line => line.station_ids.includes(originId)) // Filter les lignes qui passent par l'origine
          .reduce((destinations: Station[], line) => {
            // Pour chaque ligne, mapper les stations
            const lineDestinations = line.station_ids
              .filter(stationId => stationId !== originId) // Exclure l'origine
              .map(stationId => stations.find(s => s.id === stationId)) // Mapper vers les objets Station
              .filter((station): station is Station => 
                station !== undefined && 
                !destinations.some(d => d.id === station.id) // Éviter les doublons
              );
            
            return [...destinations, ...lineDestinations];
          }, []);
        
        return popularDestinations.slice(0, 5); // Limite à 5 suggestions
      })
    );
  }

  /**
   * Recherche de stations par nom avec filter()
   */
  searchStations(query: string): Observable<Station[]> {
    return this.dataService.getStations().pipe(
      map(stations => stations
        .filter(station => 
          station.name_fr.toLowerCase().includes(query.toLowerCase()) ||
          station.name_en.toLowerCase().includes(query.toLowerCase()) ||
          station.island_fr.toLowerCase().includes(query.toLowerCase())
        )
        .slice(0, 10) // Limite les résultats
      )
    );
  }

  /**
   * Statistiques de recherche avec reduce()
   */
  getSearchStatistics(results: SearchResult[]): {
    totalRoutes: number;
    averageDuration: string;
    priceRange: { min: number; max: number };
    timeDistribution: { morning: number; afternoon: number; evening: number };
  } {
    if (results.length === 0) {
      return {
        totalRoutes: 0,
        averageDuration: '0min',
        priceRange: { min: 0, max: 0 },
        timeDistribution: { morning: 0, afternoon: 0, evening: 0 }
      };
    }

    // Utiliser reduce() pour calculer les statistiques
    const stats = results.reduce((acc, result) => {
      // Compter les routes
      acc.routeCount++;

      // Calculer la durée moyenne (en minutes)
      if (result.duration && result.duration !== 'N/A') {
        const minutes = this.parseDurationToMinutes(result.duration);
        acc.totalDuration += minutes;
      }

      // Calculer la fourchette de prix
      const price = result.price.third_class; // Utiliser la 3ème classe (prix le plus économique)
      acc.minPrice = Math.min(acc.minPrice, price);
      acc.maxPrice = Math.max(acc.maxPrice, price);

      // Distribution des heures
      const firstStop = result.schedule.stops[0];
      if (firstStop?.departure_time) {
        const hour = parseInt(firstStop.departure_time.split(':')[0]);
        if (hour >= 6 && hour < 12) acc.morningCount++;
        else if (hour >= 12 && hour < 18) acc.afternoonCount++;
        else if (hour >= 18 && hour < 22) acc.eveningCount++;
      }

      return acc;
    }, {
      routeCount: 0,
      totalDuration: 0,
      minPrice: Infinity,
      maxPrice: 0,
      morningCount: 0,
      afternoonCount: 0,
      eveningCount: 0
    });

    return {
      totalRoutes: stats.routeCount,
      averageDuration: this.formatDuration(Math.round(stats.totalDuration / stats.routeCount)),
      priceRange: { 
        min: stats.minPrice === Infinity ? 0 : stats.minPrice, 
        max: stats.maxPrice 
      },
      timeDistribution: {
        morning: stats.morningCount,
        afternoon: stats.afternoonCount,
        evening: stats.eveningCount
      }
    };
  }

  /**
   * Parse une durée en texte vers des minutes
   */
  private parseDurationToMinutes(durationText: string): number {
    if (durationText.includes('h')) {
      const parts = durationText.split('h');
      const hours = parseInt(parts[0]);
      const minutesPart = parts[1]?.replace('min', '').trim();
      const minutes = minutesPart ? parseInt(minutesPart) : 0;
      return hours * 60 + minutes;
    } else {
      return parseInt(durationText.replace('min', ''));
    }
  }

  /**
   * Formate une durée en minutes vers du texte
   */
  private formatDuration(totalMinutes: number): string {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    
    if (hours > 0) {
      return `${hours}h${minutes > 0 ? ` ${minutes}min` : ''}`;
    }
    return `${minutes}min`;
  }
}
