import { Injectable } from '@angular/core';
import { ServiceClass } from '../models/transport.models';

@Injectable({
  providedIn: 'root'
})
export class UtilsService {

  constructor() { }

  /**
   * Formate un prix en XPF
   */
  formatPrice(amount: number): string {
    return `${amount.toLocaleString('fr-FR')} XPF`;
  }

  /**
   * Formate une heure au format 24h
   */
  formatTime(time: string): string {
    if (!time || !time.includes(':')) return time;
    
    const [hours, minutes] = time.split(':');
    return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`;
  }

  /**
   * Retourne le nom français de la classe de service
   */
  getServiceClassName(serviceClass: ServiceClass): string {
    switch (serviceClass) {
      case 'first_class':
        return '1ère classe';
      case 'second_class':
        return '2ème classe';
      case 'third_class':
        return '3ème classe';
      default:
        return 'Classe inconnue';
    }
  }

  /**
   * Retourne l'emoji associé à la classe de service
   */
  getServiceClassIcon(serviceClass: ServiceClass): string {
    switch (serviceClass) {
      case 'first_class':
        return '💎';
      case 'second_class':
        return '🥈';
      case 'third_class':
        return '🥉';
      default:
        return '🎫';
    }
  }

  /**
   * Calcule la distance approximative entre deux coordonnées (en km)
   */
  calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Rayon de la Terre en km
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    
    return Math.round(distance * 10) / 10; // Arrondi à 1 décimale
  }

  /**
   * Convertit les degrés en radians
   */
  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Formate la distance
   */
  formatDistance(distance: number): string {
    if (distance < 1) {
      return `${Math.round(distance * 1000)} m`;
    }
    return `${distance} km`;
  }

  /**
   * Retourne l'emoji pour la direction
   */
  getDirectionIcon(direction: string): string {
    switch (direction.toLowerCase()) {
      case 'northbound':
        return '⬆️';
      case 'southbound':
        return '⬇️';
      case 'outbound':
        return '➡️';
      case 'inbound':
        return '⬅️';
      default:
        return '🚄';
    }
  }

  /**
   * Retourne une description français de la direction
   */
  getDirectionDescription(direction: string): string {
    switch (direction.toLowerCase()) {
      case 'northbound':
        return 'Direction Nord';
      case 'southbound':
        return 'Direction Sud';
      case 'outbound':
        return 'Aller';
      case 'inbound':
        return 'Retour';
      default:
        return direction;
    }
  }

  /**
   * Vérifie si une station est une île
   */
  isIslandStation(island: string): boolean {
    const islands = ['lifou', 'maré', 'ouvéa', 'île des pins'];
    return islands.some(i => island.toLowerCase().includes(i.toLowerCase()));
  }

  /**
   * Retourne l'emoji pour l'île
   */
  getIslandIcon(island: string): string {
    const islandLower = island.toLowerCase();
    
    if (islandLower.includes('grande-terre')) {
      return '🏝️';
    } else if (islandLower.includes('lifou')) {
      return '🌺';
    } else if (islandLower.includes('maré')) {
      return '🐚';
    } else if (islandLower.includes('ouvéa')) {
      return '🏖️';
    } else if (islandLower.includes('pins')) {
      return '🌲';
    }
    
    return '🏝️';
  }
}
