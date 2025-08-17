import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { combineLatest, Subscription } from 'rxjs';

import { DataService } from '../services/data.service';
import { Price, Station, PriceByClass, ServiceClass } from '../models/transport.models';

interface PriceDisplay {
  price: Price;
  originStation: Station;
  destinationStation: Station;
  distance: number | undefined;
  pricePerKm: number | undefined;
}

@Component({
  selector: 'app-prices',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './prices.component.html',
  styleUrl: './prices.component.css'
})
export class PricesComponent implements OnInit, OnDestroy {
  // Constants
  private readonly LOYAUTE_ISLANDS = ['Lifou', 'Maré', 'Ouvéa'];
  
  // Data properties
  prices: Price[] = [];
  stations: Station[] = [];
  pricesDisplay: PriceDisplay[] = [];
  
  // UI State properties
  loading = true;
  activeTab: ServiceClass = 'second_class';
  activeLocationTab: string = 'grande-terre';
  expandedPrices = new Set<string>();
  
  // Subscription
  private subscription?: Subscription;
  
  constructor(private dataService: DataService) {}

  ngOnInit(): void {
    this.loadData();
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  private loadData(): void {
    this.loading = true;
    
    this.subscription = combineLatest([
      this.dataService.getPrices(),
      this.dataService.getStations()
    ]).subscribe({
      next: ([prices, stations]) => {
        this.prices = prices;
        this.stations = stations;
        this.updateDerivedData();
        this.loading = false;
      },
      error: (error) => {
        console.error('Erreur lors du chargement des données:', error);
        this.loading = false;
      }
    });
  }

  private updateDerivedData(): void {
    this.pricesDisplay = this.prices.map(price => {
      const originStation = this.stations.find(s => s.id === price.origin_station_id);
      const destinationStation = this.stations.find(s => s.id === price.destination_station_id);
      
      if (!originStation || !destinationStation) {
        console.warn('Station introuvable pour le prix:', price);
        return null;
      }

      // Calculer la distance approximative (si les coordonnées sont disponibles)
      let distance: number | undefined;
      let pricePerKm: number | undefined;
      
      if (originStation.coordinates && destinationStation.coordinates) {
        distance = this.calculateDistance(
          originStation.coordinates,
          destinationStation.coordinates
        );
        pricePerKm = price.prices.second_class / distance;
      }

      return {
        price,
        originStation,
        destinationStation,
        distance,
        pricePerKm
      };
    }).filter((item): item is PriceDisplay => item !== null);
  }

  private calculateDistance(coord1: {lat: number, lon: number}, coord2: {lat: number, lon: number}): number {
    const R = 6371; // Rayon de la Terre en kilomètres
    const dLat = this.deg2rad(coord2.lat - coord1.lat);
    const dLon = this.deg2rad(coord2.lon - coord1.lon);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.deg2rad(coord1.lat)) * Math.cos(this.deg2rad(coord2.lat)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    return Math.round(distance * 10) / 10; // Arrondir à 1 décimale
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI/180);
  }

  // UI Methods
  switchTab(serviceClass: ServiceClass): void {
    this.activeTab = serviceClass;
  }

  switchLocationTab(locationTab: string): void {
    this.activeLocationTab = locationTab;
  }

  getLocationTabLabel(locationTab: string): string {
    const labels: { [key: string]: string } = {
      'grande-terre': 'Grande-Terre',
      'loyaute': 'Îles Loyauté',
      'ile-des-pins': 'Île des Pins'
    };
    return labels[locationTab] || locationTab;
  }

  getLocationTabIcon(locationTab: string): string {
    const icons: { [key: string]: string } = {
      'grande-terre': '🏔️',
      'loyaute': '🏝️',
      'ile-des-pins': '🌴'
    };
    return icons[locationTab] || '📍';
  }

  getLocationTabCount(locationTab: string): number {
    return this.getFilteredPricesForLocation(locationTab).length;
  }

  private getFilteredPricesForLocation(locationTab: string): PriceDisplay[] {
    return this.pricesDisplay.filter(priceDisplay => {
      const originIsland = priceDisplay.originStation.island_fr;
      const destinationIsland = priceDisplay.destinationStation.island_fr;
      
      switch (locationTab) {
        case 'grande-terre':
          // Trajets internes à Grande-Terre uniquement
          return originIsland === 'Grande-Terre' && destinationIsland === 'Grande-Terre';
        case 'loyaute':
          // Trajets impliquant les îles Loyauté
          const isOriginLoyaute = this.LOYAUTE_ISLANDS.includes(originIsland);
          const isDestinationLoyaute = this.LOYAUTE_ISLANDS.includes(destinationIsland);
          return isOriginLoyaute || isDestinationLoyaute;
        case 'ile-des-pins':
          // Trajets impliquant l'Île des Pins
          return originIsland === 'Île des Pins' || destinationIsland === 'Île des Pins';
        default:
          return [];
      }
    });
  }

  getServiceClassLabel(serviceClass: ServiceClass): string {
    const labels = {
      'first_class': 'Première Classe',
      'second_class': 'Deuxième Classe', 
      'third_class': 'Troisième Classe'
    };
    return labels[serviceClass];
  }

  getServiceClassIcon(serviceClass: ServiceClass): string {
    const icons = {
      'first_class': '✨',
      'second_class': '🚂',
      'third_class': '🎫'
    };
    return icons[serviceClass];
  }

  getPriceForClass(priceByClass: PriceByClass, serviceClass: ServiceClass): number {
    return priceByClass[serviceClass];
  }

  formatPrice(price: number): string {
    return price.toLocaleString('fr-FR') + ' XPF';
  }

  getFilteredPrices(): PriceDisplay[] {
    let filtered = this.pricesDisplay;

    // Filtrer par zone géographique de manière plus restrictive
    filtered = filtered.filter(priceDisplay => {
      const originIsland = priceDisplay.originStation.island_fr;
      const destinationIsland = priceDisplay.destinationStation.island_fr;
      
      switch (this.activeLocationTab) {
        case 'grande-terre':
          // Trajets internes à Grande-Terre uniquement
          return originIsland === 'Grande-Terre' && destinationIsland === 'Grande-Terre';
        case 'loyaute':
          // Trajets impliquant les îles Loyauté (internes ou avec Grande-Terre)
          const isOriginLoyaute = this.LOYAUTE_ISLANDS.includes(originIsland);
          const isDestinationLoyaute = this.LOYAUTE_ISLANDS.includes(destinationIsland);
          return isOriginLoyaute || isDestinationLoyaute;
        case 'ile-des-pins':
          // Trajets impliquant l'Île des Pins
          return originIsland === 'Île des Pins' || destinationIsland === 'Île des Pins';
        default:
          return true;
      }
    });

    // Trier par prix pour la classe active (du moins cher au plus cher)
    return filtered.sort((a, b) => {
      const priceA = this.getPriceForClass(a.price.prices, this.activeTab);
      const priceB = this.getPriceForClass(b.price.prices, this.activeTab);
      return priceA - priceB;
    });
  }

  togglePriceDetails(priceId: string): void {
    if (this.expandedPrices.has(priceId)) {
      this.expandedPrices.delete(priceId);
    } else {
      this.expandedPrices.add(priceId);
    }
  }

  isExpanded(priceId: string): boolean {
    return this.expandedPrices.has(priceId);
  }

  getPriceId(priceDisplay: PriceDisplay): string {
    return `${priceDisplay.price.origin_station_id}-${priceDisplay.price.destination_station_id}`;
  }

  // TrackBy functions for performance
  trackByPrice = (index: number, item: PriceDisplay): string => {
    return this.getPriceId(item);
  }

  trackByStation = (index: number, item: Station): string => {
    return item.id;
  }
}
