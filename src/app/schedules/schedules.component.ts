import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataService } from '../services/data.service';
import { UtilsService } from '../services/utils.service';
import { 
  Line, 
  LineSchedule, 
  Schedule, 
  Station 
} from '../models/transport.models';
import { Observable, combineLatest } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { of } from 'rxjs';

interface ScheduleDisplay {
  line: Line;
  schedule: Schedule;
  stations: Station[];
}

interface SchedulesByDirection {
  south: ScheduleDisplay[];
  north: ScheduleDisplay[];
  islands: ScheduleDisplay[];
}

@Component({
  selector: 'app-schedules',
  imports: [CommonModule],
  templateUrl: './schedules.component.html',
  styleUrl: './schedules.component.css'
})
export class SchedulesComponent implements OnInit {
  schedulesByDirection$!: Observable<SchedulesByDirection>;
  
  // Propriétés pour stocker les données traitées
  schedulesByDirection: SchedulesByDirection = {
    south: [],
    north: [],
    islands: []
  };
  
  // Onglet actif
  activeTab: 'south' | 'north' | 'islands' = 'south';
  
  // État des détails de ligne (trip_id de la ligne sélectionnée)
  expandedTripId: string | null = null;
  
  loading = true;

  constructor(
    private dataService: DataService,
    public utilsService: UtilsService
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  hasStopAtStation(schedule: Schedule, stationId: string): boolean {
    return schedule.stops.some(stop => stop.station_id === stationId);
  }

  private loadData(): void {
    // Combine toutes les données pour créer l'Observable des horaires par direction
    this.schedulesByDirection$ = combineLatest([
      this.dataService.getSchedules(),
      this.dataService.getLines(),
      this.dataService.getStations()
    ]).pipe(
      map(([lineSchedules, lines, stations]: [LineSchedule[], Line[], Station[]]) => {
        this.loading = false;
        
        // Vérification que les données existent
        if (!lineSchedules || !lines || !stations) {
          return { south: [], north: [], islands: [] };
        }
        
        // Créer tous les ScheduleDisplay d'abord
        const allScheduleDisplays: ScheduleDisplay[] = lineSchedules
          .map((lineSchedule: LineSchedule) => {
            const line = lines.find((l: Line) => l.id === lineSchedule.line_id);
            if (!line) return [];
            
            return lineSchedule.schedules.map((schedule: Schedule) => {
              // Récupérer les stations dans l'ordre du trajet réel
              const tripStations = schedule.stops
                .map((stop: any) => stations.find((s: Station) => s.id === stop.station_id))
                .filter((station: Station | undefined) => station !== undefined) as Station[];
              
              return {
                line,
                schedule,
                stations: tripStations
              } as ScheduleDisplay;
            });
          })
          .flat();
        
        // Filtrer par direction en utilisant filter()
        const southSchedules = allScheduleDisplays.filter(scheduleDisplay => {
          if (this.isIslandRoute(scheduleDisplay.line, stations)) {
            // Retour des îles vers Grande-Terre (classé comme "sud" car retour vers Nouméa)
            return scheduleDisplay.schedule.direction.startsWith('from-');
          }
          return scheduleDisplay.schedule.direction === 'southbound';
        });
        
        const northSchedules = allScheduleDisplays.filter(scheduleDisplay => 
          !this.isIslandRoute(scheduleDisplay.line, stations) && 
          scheduleDisplay.schedule.direction === 'northbound'
        );
        
        const islandsSchedules = allScheduleDisplays.filter(scheduleDisplay => {
          if (this.isIslandRoute(scheduleDisplay.line, stations)) {
            // Départ de Grande-Terre vers les îles ou autres directions d'îles
            return scheduleDisplay.schedule.direction.startsWith('to-') || 
                   (!scheduleDisplay.schedule.direction.startsWith('from-'));
          }
          return false;
        });
        
        // Trier chaque catégorie par heure
        const sortByTime = (a: ScheduleDisplay, b: ScheduleDisplay) => {
          const timeA = a.schedule.stops[0]?.departure_time || '00:00';
          const timeB = b.schedule.stops[0]?.departure_time || '00:00';
          return timeA.localeCompare(timeB);
        };
        
        const result = {
          south: southSchedules.sort(sortByTime),
          north: northSchedules.sort(sortByTime),
          islands: islandsSchedules.sort(sortByTime)
        };
        
        // Mettre à jour les propriétés du composant
        this.schedulesByDirection = result;
        
        return result;
      }),
      catchError(error => {
        console.error('Erreur lors du chargement des données:', error);
        this.loading = false;
        return of({
          south: [],
          north: [],
          islands: []
        });
      })
    );
    
    // Souscrire explicitement pour mettre à jour les propriétés du composant
    this.schedulesByDirection$.subscribe({
      next: (data) => {
        this.schedulesByDirection = data;
      },
      error: (error) => {
        console.error('Erreur dans la souscription:', error);
      }
    });
  }

  private isIslandRoute(line: Line, stations: Station[]): boolean {
    // Vérifie si la ligne dessert des îles (autres que Grande-Terre)
    const islandStations = stations.filter(station => 
      line.station_ids.includes(station.id) && 
      !station.island_fr.toLowerCase().includes('grande-terre')
    );
    return islandStations.length > 0;
  }

  switchTab(tab: 'south' | 'north' | 'islands'): void {
    this.activeTab = tab;
    // Fermer les détails quand on change d'onglet
    this.expandedTripId = null;
  }

  toggleTripDetails(tripId: string): void {
    this.expandedTripId = this.expandedTripId === tripId ? null : tripId;
  }

  isExpanded(tripId: string): boolean {
    return this.expandedTripId === tripId;
  }

  getUniqueDirections(): string[] {
    return ['northbound', 'southbound', 'outbound', 'inbound'];
  }

  getTripDuration(schedule: Schedule): string {
    const firstStop = schedule.stops[0];
    const lastStop = schedule.stops[schedule.stops.length - 1];
    
    if (!firstStop?.departure_time || !lastStop?.arrival_time) {
      return '-';
    }
    
    const startTime = this.parseTime(firstStop.departure_time);
    const endTime = this.parseTime(lastStop.arrival_time);
    
    const diffMinutes = (endTime.getTime() - startTime.getTime()) / (1000 * 60);
    
    if (diffMinutes < 0) return '-';
    
    const hours = Math.floor(diffMinutes / 60);
    const minutes = Math.floor(diffMinutes % 60);
    
    if (hours > 0) {
      return `${hours}h${minutes > 0 ? ` ${minutes}min` : ''}`;
    }
    return `${minutes}min`;
  }

  private parseTime(timeString: string): Date {
    const [hours, minutes] = timeString.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date;
  }

  trackBySchedule(index: number, item: ScheduleDisplay): string {
    return item.schedule.trip_id;
  }

  trackByStation(index: number, item: Station): string {
    return item.id;
  }

  getStopTime(schedule: Schedule, stationId: string): string {
    const stop = schedule.stops.find(s => s.station_id === stationId);
    return stop?.departure_time || stop?.arrival_time || '';
  }

  // Méthodes utilisant filter() pour différents cas d'usage
  
  /**
   * Filtre les horaires par ligne spécifique
   */
  getSchedulesByLineId(schedules: ScheduleDisplay[], lineId: string): ScheduleDisplay[] {
    return schedules.filter(schedule => schedule.line.id === lineId);
  }

  /**
   * Filtre les horaires par heure de départ (après une heure donnée)
   */
  getSchedulesAfterTime(schedules: ScheduleDisplay[], time: string): ScheduleDisplay[] {
    return schedules.filter(schedule => {
      const departureTime = schedule.schedule.stops[0]?.departure_time || '00:00';
      return departureTime >= time;
    });
  }

  /**
   * Filtre les stations qui ont des arrêts réels pour un horaire donné
   */
  getStationsWithStops(schedule: Schedule, stations: Station[]): Station[] {
    return stations.filter(station => this.hasStopAtStation(schedule, station.id));
  }

  /**
   * Compte le nombre d'arrêts pour un trajet donné
   */
  countStopsInTrip(schedule: Schedule): number {
    return schedule.stops.filter(stop => stop.station_id).length;
  }

  /**
   * Filtre les lignes qui desservent une île spécifique
   */
  getLinesByIsland(lines: Line[], stations: Station[], islandName: string): Line[] {
    return lines.filter(line => 
      line.station_ids.some(stationId => {
        const station = stations.find(s => s.id === stationId);
        return station?.island_fr.toLowerCase().includes(islandName.toLowerCase());
      })
    );
  }

  /**
   * Compte le nombre d'horaires par direction
   */
  countSchedulesByDirection(schedules: ScheduleDisplay[]): { [key: string]: number } {
    const directions = schedules.map(s => s.schedule.direction);
    const uniqueDirections = [...new Set(directions)];
    
    return uniqueDirections.reduce((count, direction) => {
      count[direction] = schedules.filter(s => s.schedule.direction === direction).length;
      return count;
    }, {} as { [key: string]: number });
  }

  /**
   * Obtient des statistiques complètes avec filter() et count()
   */
  getScheduleStatistics(): Observable<{
    totalSchedules: number;
    schedulesByDirection: { [key: string]: number };
    averageStopsPerTrip: number;
    linesServedCount: number;
    islandRoutesCount: number;
  }> {
    return this.schedulesByDirection$.pipe(
      map(schedulesByDirection => {
        const allSchedules = [
          ...schedulesByDirection.south,
          ...schedulesByDirection.north,
          ...schedulesByDirection.islands
        ];

        // Compter les horaires par direction
        const directionCounts = this.countSchedulesByDirection(allSchedules);

        // Calculer la moyenne d'arrêts par trajet
        const totalStops = allSchedules.reduce((sum, schedule) => 
          sum + this.countStopsInTrip(schedule.schedule), 0);
        const averageStops = allSchedules.length > 0 ? totalStops / allSchedules.length : 0;

        // Compter les lignes uniques
        const uniqueLines = [...new Set(allSchedules.map(s => s.line.id))];

        // Compter les lignes vers les îles
        const islandRoutes = allSchedules.filter(schedule => 
          this.isIslandRoute(schedule.line, schedule.stations));

        return {
          totalSchedules: allSchedules.length,
          schedulesByDirection: directionCounts,
          averageStopsPerTrip: Math.round(averageStops * 10) / 10,
          linesServedCount: uniqueLines.length,
          islandRoutesCount: islandRoutes.length
        };
      })
    );
  }
}