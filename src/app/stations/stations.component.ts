import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService } from '../services/data.service';
import { UtilsService } from '../services/utils.service';
import { Station, Line, LineSchedule } from '../models/transport.models';
import { Observable, combineLatest, Subscription } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { of } from 'rxjs';

interface StationDisplay {
  station: Station;
  linesServed: Line[];
  scheduleCount: number;
  connectionsCount: number;
}

interface StationsByIsland {
  [islandName: string]: StationDisplay[];
}

@Component({
  selector: 'app-stations',
  imports: [CommonModule, FormsModule],
  templateUrl: './stations.component.html',
  styleUrl: './stations.component.css'
})
export class StationsComponent implements OnInit, OnDestroy {
  // Propriétés pour stocker les données (même approche que schedules)
  allStationsData: StationDisplay[] = [];
  stationsByIslandData: StationsByIsland = {};
  uniqueIslands: string[] = [];
  stationStatistics: any = null;
  filteredStations: StationDisplay[] = [];
  transportHubs: StationDisplay[] = [];
  
  // Observables pour les méthodes existantes
  stationsByIsland$!: Observable<StationsByIsland>;
  allStations$!: Observable<StationDisplay[]>;
  
  // Subscription pour gérer le nettoyage
  private dataSubscription?: Subscription;
  
  // États de filtrage
  selectedIsland: string = 'all';
  searchTerm: string = '';
  sortBy: 'name' | 'schedules' | 'lines' = 'name';
  sortOrder: 'asc' | 'desc' = 'asc';
  
  // États d'affichage
  loading = true;
  showMap = false;
  expandedStationId: string | null = null;
  activeTab: string = 'grande-terre'; // Onglet actif par défaut

  constructor(
    private dataService: DataService,
    public utilsService: UtilsService
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  ngOnDestroy(): void {
    if (this.dataSubscription) {
      this.dataSubscription.unsubscribe();
    }
  }

  private loadData(): void {
    this.loading = true;
    
    // Combine toutes les données pour créer l'Observable des stations
    this.allStations$ = combineLatest([
      this.dataService.getStations(),
      this.dataService.getLines(),
      this.dataService.getSchedules()
    ]).pipe(
      map(([stations, lines, lineSchedules]: [Station[], Line[], LineSchedule[]]) => {
        // Créer tous les StationDisplay avec filter() et count()
        return stations.map(station => {
          // Filtrer les lignes qui desservent cette station
          const linesServed = lines.filter(line => 
            line.station_ids.includes(station.id)
          );
          
          // Compter les horaires qui passent par cette station
          const scheduleCount = this.countSchedulesForStation(station.id, lineSchedules);
          
          // Compter les connexions (autres stations accessibles)
          const connectionsCount = this.countConnectionsForStation(station.id, lines, stations);
          
          return {
            station,
            linesServed,
            scheduleCount,
            connectionsCount
          } as StationDisplay;
        });
      }),
      catchError(error => {
        console.error('Erreur lors du chargement des données des stations:', error);
        this.loading = false;
        return of([]);
      })
    );

    // Grouper les stations par île
    this.stationsByIsland$ = this.allStations$.pipe(
      map(stationDisplays => this.groupStationsByIsland(stationDisplays)),
      catchError(error => {
        console.error('Erreur lors du groupement des stations par île:', error);
        return of({});
      })
    );

    // Souscrire pour mettre à jour les propriétés (même approche que schedules)
    this.dataSubscription = this.allStations$.subscribe({
      next: (stationDisplays) => {
        this.allStationsData = stationDisplays;
        this.stationsByIslandData = this.groupStationsByIsland(stationDisplays);
        this.updateDerivedData();
        this.loading = false;
        console.log('Données stations chargées:', {
          totalStations: this.allStationsData.length,
          byIsland: Object.keys(this.stationsByIslandData).map(island => ({
            island,
            count: this.stationsByIslandData[island].length
          }))
        });
      },
      error: (error) => {
        console.error('Erreur lors de la souscription aux données des stations:', error);
        this.loading = false;
        this.allStationsData = [];
        this.stationsByIslandData = {};
        this.updateDerivedData();
      }
    });
  }

  /**
   * Met à jour toutes les données dérivées (îles uniques, statistiques, etc.)
   */
  private updateDerivedData(): void {
    // Mettre à jour les îles uniques
    this.uniqueIslands = [...new Set(this.allStationsData.map(sd => sd.station.island_fr))].sort();
    
    // Mettre à jour les statistiques
    this.updateStationStatistics();
    
    // Mettre à jour les stations filtrées
    this.updateFilteredStations();
    
    // Mettre à jour les hubs de transport
    this.updateTransportHubs();
  }

  /**
   * Met à jour les statistiques des stations
   */
  private updateStationStatistics(): void {
    if (this.allStationsData.length === 0) {
      this.stationStatistics = null;
      return;
    }

    // Compter par île
    const islandCounts = this.allStationsData.reduce((counts, sd) => {
      const island = sd.station.island_fr;
      counts[island] = (counts[island] || 0) + 1;
      return counts;
    }, {} as { [key: string]: number });

    // Calculer les moyennes
    const totalLines = this.allStationsData.reduce((sum, sd) => sum + sd.linesServed.length, 0);
    const totalSchedules = this.allStationsData.reduce((sum, sd) => sum + sd.scheduleCount, 0);
    
    const avgLines = this.allStationsData.length > 0 ? totalLines / this.allStationsData.length : 0;
    const avgSchedules = this.allStationsData.length > 0 ? totalSchedules / this.allStationsData.length : 0;

    // Compter les hubs de transport
    const hubs = this.allStationsData.filter(sd => sd.linesServed.length > 2 && sd.scheduleCount > 10);

    // Station la plus connectée
    const mostConnected = this.allStationsData.reduce((max, current) => 
      (!max || current.connectionsCount > max.connectionsCount) ? current : max, 
      null as StationDisplay | null
    );

    this.stationStatistics = {
      totalStations: this.allStationsData.length,
      stationsByIsland: islandCounts,
      averageLinesPerStation: Math.round(avgLines * 10) / 10,
      averageSchedulesPerStation: Math.round(avgSchedules * 10) / 10,
      transportHubsCount: hubs.length,
      mostConnectedStation: mostConnected
    };
  }

  /**
   * Met à jour les stations filtrées
   */
  private updateFilteredStations(): void {
    let filtered = [...this.allStationsData];

    // Filtrer par île si sélectionnée
    if (this.selectedIsland !== 'all') {
      filtered = filtered.filter(sd => sd.station.island_fr === this.selectedIsland);
    }

    // Filtrer par terme de recherche
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(sd =>
        sd.station.name_fr.toLowerCase().includes(term) ||
        sd.station.name_en.toLowerCase().includes(term) ||
        sd.station.island_fr.toLowerCase().includes(term)
      );
    }

    // Trier selon les critères
    this.filteredStations = this.sortStations(filtered);
  }

  /**
   * Met à jour les hubs de transport
   */
  private updateTransportHubs(): void {
    this.transportHubs = this.allStationsData
      .filter(sd => sd.linesServed.length > 2 && sd.scheduleCount > 10)
      .sort((a, b) => b.scheduleCount - a.scheduleCount);
  }

  /**
   * Groupe les stations par île en utilisant filter()
   */
  private groupStationsByIsland(stationDisplays: StationDisplay[]): StationsByIsland {
    // Obtenir toutes les îles uniques
    const islands = [...new Set(stationDisplays.map(sd => sd.station.island_fr))];
    
    return islands.reduce((grouped, island) => {
      // Filtrer les stations par île
      grouped[island] = stationDisplays.filter(sd => sd.station.island_fr === island);
      return grouped;
    }, {} as StationsByIsland);
  }

  /**
   * Compte les horaires qui passent par une station donnée
   */
  private countSchedulesForStation(stationId: string, lineSchedules: LineSchedule[]): number {
    return lineSchedules.reduce((count, lineSchedule) => {
      const stationSchedules = lineSchedule.schedules.filter((schedule: any) =>
        schedule.stops.some((stop: any) => stop.station_id === stationId)
      );
      return count + stationSchedules.length;
    }, 0);
  }

  /**
   * Compte les connexions possibles depuis une station
   */
  private countConnectionsForStation(stationId: string, lines: Line[], stations: Station[]): number {
    // Trouver toutes les lignes qui passent par cette station
    const stationLines = lines.filter(line => line.station_ids.includes(stationId));
    
    // Compter toutes les stations accessibles via ces lignes
    const accessibleStations = new Set<string>();
    stationLines.forEach(line => {
      line.station_ids.forEach(id => {
        if (id !== stationId) {
          accessibleStations.add(id);
        }
      });
    });
    
    return accessibleStations.size;
  }

  /**
   * Filtre les stations selon les critères de recherche
   */
  getFilteredStations(): Observable<StationDisplay[]> {
    return this.allStations$.pipe(
      map(stations => {
        let filtered = stations;

        // Filtrer par île si sélectionnée
        if (this.selectedIsland !== 'all') {
          filtered = filtered.filter(sd => sd.station.island_fr === this.selectedIsland);
        }

        // Filtrer par terme de recherche
        if (this.searchTerm.trim()) {
          const term = this.searchTerm.toLowerCase();
          filtered = filtered.filter(sd =>
            sd.station.name_fr.toLowerCase().includes(term) ||
            sd.station.name_en.toLowerCase().includes(term) ||
            sd.station.island_fr.toLowerCase().includes(term)
          );
        }

        // Trier selon les critères
        filtered = this.sortStations(filtered);

        return filtered;
      })
    );
  }

  /**
   * Trie les stations selon le critère sélectionné
   */
  private sortStations(stations: StationDisplay[]): StationDisplay[] {
    return stations.sort((a, b) => {
      let comparison = 0;
      
      switch (this.sortBy) {
        case 'name':
          comparison = a.station.name_fr.localeCompare(b.station.name_fr);
          break;
        case 'schedules':
          comparison = a.scheduleCount - b.scheduleCount;
          break;
        case 'lines':
          comparison = a.linesServed.length - b.linesServed.length;
          break;
      }
      
      return this.sortOrder === 'asc' ? comparison : -comparison;
    });
  }

  /**
   * Obtient toutes les îles uniques pour le filtre
   */
  getUniqueIslands(): Observable<string[]> {
    return this.allStations$.pipe(
      map(stations => {
        const islands = [...new Set(stations.map(sd => sd.station.island_fr))];
        return islands.sort();
      })
    );
  }

  /**
   * Filtre les stations par nombre minimum de lignes
   */
  getStationsWithMinLines(minLines: number): Observable<StationDisplay[]> {
    return this.allStations$.pipe(
      map(stations => stations.filter(sd => sd.linesServed.length >= minLines))
    );
  }

  /**
   * Filtre les stations par nombre minimum d'horaires
   */
  getStationsWithMinSchedules(minSchedules: number): Observable<StationDisplay[]> {
    return this.allStations$.pipe(
      map(stations => stations.filter(sd => sd.scheduleCount >= minSchedules))
    );
  }

  /**
   * Obtient les stations principales (hubs de transport)
   */
  getTransportHubs(): Observable<StationDisplay[]> {
    return this.allStations$.pipe(
      map(stations => {
        // Critères pour être un hub : plus de 2 lignes ET plus de 10 horaires
        return stations.filter(sd => 
          sd.linesServed.length > 2 && sd.scheduleCount > 10
        ).sort((a, b) => b.scheduleCount - a.scheduleCount);
      })
    );
  }

  /**
   * Calcule des statistiques globales sur les stations
   */
  getStationStatistics(): Observable<{
    totalStations: number;
    stationsByIsland: { [key: string]: number };
    averageLinesPerStation: number;
    averageSchedulesPerStation: number;
    transportHubsCount: number;
    mostConnectedStation: StationDisplay | null;
  }> {
    return this.allStations$.pipe(
      map(stations => {
        // Compter par île
        const islandCounts = stations.reduce((counts, sd) => {
          const island = sd.station.island_fr;
          counts[island] = (counts[island] || 0) + 1;
          return counts;
        }, {} as { [key: string]: number });

        // Calculer les moyennes
        const totalLines = stations.reduce((sum, sd) => sum + sd.linesServed.length, 0);
        const totalSchedules = stations.reduce((sum, sd) => sum + sd.scheduleCount, 0);
        
        const avgLines = stations.length > 0 ? totalLines / stations.length : 0;
        const avgSchedules = stations.length > 0 ? totalSchedules / stations.length : 0;

        // Compter les hubs de transport
        const hubs = stations.filter(sd => sd.linesServed.length > 2 && sd.scheduleCount > 10);

        // Station la plus connectée
        const mostConnected = stations.reduce((max, current) => 
          (!max || current.connectionsCount > max.connectionsCount) ? current : max, 
          null as StationDisplay | null
        );

        return {
          totalStations: stations.length,
          stationsByIsland: islandCounts,
          averageLinesPerStation: Math.round(avgLines * 10) / 10,
          averageSchedulesPerStation: Math.round(avgSchedules * 10) / 10,
          transportHubsCount: hubs.length,
          mostConnectedStation: mostConnected
        };
      })
    );
  }

  // Méthodes d'interface utilisateur

  toggleStationDetails(stationId: string): void {
    this.expandedStationId = this.expandedStationId === stationId ? null : stationId;
  }

  isExpanded(stationId: string): boolean {
    return this.expandedStationId === stationId;
  }

  onIslandChange(): void {
    // Réinitialiser la recherche lors du changement d'île
    this.searchTerm = '';
    this.updateFilteredStations();
  }

  onSortChange(): void {
    // Le tri se met à jour automatiquement via updateFilteredStations()
    this.updateFilteredStations();
  }

  toggleSortOrder(): void {
    this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
    this.updateFilteredStations();
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.updateFilteredStations();
  }

  onSearchChange(): void {
    this.updateFilteredStations();
  }

  resetFilters(): void {
    this.searchTerm = '';
    this.selectedIsland = 'all';
    this.updateFilteredStations();
  }

  // Méthodes pour les onglets
  switchTab(tabName: string): void {
    this.activeTab = tabName;
  }

  getTabKey(island: string): string {
    return island.toLowerCase().replace(/[^a-z0-9]/g, '-');
  }

  getStationsForTab(tabKey: string): StationDisplay[] {
    if (tabKey === 'grande-terre') {
      return this.stationsByIslandData['Grande-Terre'] || [];
    } else if (tabKey === 'loyaute') {
      // Regrouper Lifou, Maré et Ouvéa sous "Îles Loyauté"
      return [
        ...(this.stationsByIslandData['Lifou'] || []),
        ...(this.stationsByIslandData['Maré'] || []),
        ...(this.stationsByIslandData['Ouvéa'] || [])
      ];
    } else if (tabKey === 'ile-des-pins') {
      return this.stationsByIslandData['Île des Pins'] || [];
    }
    return [];
  }

  toggleMapView(): void {
    this.showMap = !this.showMap;
  }

  // Méthodes utilitaires pour le template

  trackByStation(index: number, item: StationDisplay): string {
    return item.station.id;
  }

  trackByLine(index: number, item: Line): string {
    return item.id;
  }

  getStationTypeIcon(station: StationDisplay): string {
    if (station.linesServed.length > 3) return '🚉'; // Gare principale
    if (station.linesServed.length > 1) return '🚇'; // Station de correspondance
    return '🚏'; // Arrêt simple
  }
}
