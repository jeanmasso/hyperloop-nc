import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Observable, Subject, combineLatest } from 'rxjs';
import { takeUntil, map } from 'rxjs/operators';

import { DataService } from '../services/data.service';
import { SearchService, SearchCriteria } from '../services/search.service';
import { Station, SearchResult, ServiceClass } from '../models/transport.models';

@Component({
  selector: 'app-search',
  imports: [CommonModule, FormsModule],
  templateUrl: './search.component.html',
  styleUrl: './search.component.css'
})
export class SearchComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  // Données
  stations$!: Observable<Station[]>;
  searchResults: SearchResult[] = [];
  
  // État du composant
  loading = false;
  searchPerformed = false;
  
  // Critères de recherche
  searchCriteria: SearchCriteria = {
    originId: '',
    destinationId: '',
    departureDate: undefined,
    serviceClass: 'second_class',
    timePreference: 'any'
  };
  
  // Options pour les sélecteurs
  serviceClassOptions = [
    { value: 'first_class', label: '✨ Première Classe', icon: '✨' },
    { value: 'second_class', label: '🚂 Deuxième Classe', icon: '🚂' },
    { value: 'third_class', label: '🎫 Troisième Classe', icon: '🎫' }
  ];
  
  timePreferenceOptions = [
    { value: 'any', label: 'Toute la journée', icon: '🕐' },
    { value: 'morning', label: 'Matin (6h-12h)', icon: '🌅' },
    { value: 'afternoon', label: 'Après-midi (12h-18h)', icon: '☀️' },
    { value: 'evening', label: 'Soir (18h-22h)', icon: '🌆' }
  ];

  constructor(
    private dataService: DataService,
    private searchService: SearchService
  ) {}

  ngOnInit(): void {
    // Initialiser les observables
    this.stations$ = this.dataService.getStations();
    
    // Initialiser la date à aujourd'hui
    this.searchCriteria.departureDate = new Date();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Effectue une recherche avec les critères actuels
   */
  performSearch(): void {
    if (!this.isSearchValid()) {
      return;
    }

    this.loading = true;
    this.searchResults = [];

    this.searchService.searchWithCriteria(this.searchCriteria)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (results) => {
          this.searchResults = results;
          this.searchPerformed = true;
          this.loading = false;
        },
        error: (error) => {
          console.error('Erreur lors de la recherche:', error);
          this.loading = false;
        }
      });
  }

  /**
   * Vérifie si les critères de recherche sont valides
   */
  isSearchValid(): boolean {
    return !!(this.searchCriteria.originId && 
              this.searchCriteria.destinationId && 
              this.searchCriteria.originId !== this.searchCriteria.destinationId);
  }

  /**
   * Échange origin et destination
   */
  swapStations(): void {
    const tempOrigin = this.searchCriteria.originId;
    this.searchCriteria.originId = this.searchCriteria.destinationId;
    this.searchCriteria.destinationId = tempOrigin;
  }

  /**
   * Remet à zéro le formulaire de recherche
   */
  resetSearch(): void {
    this.searchCriteria = {
      originId: '',
      destinationId: '',
      departureDate: new Date(),
      serviceClass: 'second_class',
      timePreference: 'any'
    };
    this.searchResults = [];
    this.searchPerformed = false;
  }

  /**
   * Formate le prix selon la classe
   */
  formatPrice(amount: number): string {
    return `${amount.toLocaleString('fr-FR')} XPF`;
  }

  /**
   * Retourne l'icône pour une classe de service
   */
  getServiceClassIcon(serviceClass: ServiceClass): string {
    const icons = {
      'first_class': '✨',
      'second_class': '🚂',
      'third_class': '🎫'
    };
    return icons[serviceClass] || '🚂';
  }

  /**
   * Retourne le label pour une classe de service
   */
  getServiceClassLabel(serviceClass: ServiceClass): string {
    const labels = {
      'first_class': 'Première Classe',
      'second_class': 'Deuxième Classe',
      'third_class': 'Troisième Classe'
    };
    return labels[serviceClass] || 'Deuxième Classe';
  }

  /**
   * TrackBy function pour les résultats
   */
  trackByResult(index: number, result: SearchResult): string {
    return `${result.origin.id}-${result.destination.id}-${result.schedule.trip_id}`;
  }
}
