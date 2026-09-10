// src/types/common.ts
export type PlaceCategory = "RESTAURANT" | "CAFE" | "ACTIVITY" | "DINING";

export interface Place {
  id: string;
  name: string;
  category: PlaceCategory;
  subCategory?: string;
  address: string;
  lat: number;
  lng: number;
  imageUrl?: string;
  placeUrl?: string; // 카카오맵 상세 및 길찾기 URL
}
export interface Place {
  id: string;
  name: string;
  category: PlaceCategory;
  subCategory?: string;
  address: string;
  lat: number;
  lng: number;
  imageUrl?: string;
  isLiked?: boolean;
}

