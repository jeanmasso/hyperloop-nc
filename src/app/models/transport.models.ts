// Interface pour les coordonnées géographiques
export interface Coordinates {
  lat: number;
  lon: number;
}

// Interface pour les stations
export interface Station {
  id: string;
  name_fr: string;
  name_en: string;
  island_fr: string;
  island_en: string;
  coordinates: Coordinates;
}

// Interface pour les lignes de transport
export interface Line {
  id: string;
  name: string;
  description_fr: string;
  description_en: string;
  station_ids: string[];
}

// Interface pour les arrêts dans un horaire
export interface Stop {
  station_id: string;
  departure_time?: string;
  arrival_time?: string;
}

// Interface pour les horaires individuels
export interface Schedule {
  trip_id: string;
  direction: string;
  description_fr: string;
  description_en: string;
  days_of_week: string[];
  stops: Stop[];
}

// Interface pour les horaires par ligne
export interface LineSchedule {
  line_id: string;
  schedules: Schedule[];
}

// Interface pour les prix par classe
export interface PriceByClass {
  first_class: number;
  second_class: number;
  third_class: number;
}

// Interface pour les tarifs
export interface Price {
  origin_station_id: string;
  destination_station_id: string;
  prices: PriceByClass;
}

// Types utilitaires
export type ServiceClass = 'first_class' | 'second_class' | 'third_class';
export type Direction = 'northbound' | 'southbound' | 'outbound' | 'inbound';

// Interface pour les résultats de recherche
export interface SearchResult {
  origin: Station;
  destination: Station;
  schedule: Schedule;
  price: PriceByClass;
  duration?: string;
  distance?: number;
}
