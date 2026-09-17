// src/types/common.ts

export type PlaceCategory =
  | "RESTAURANT"
  | "CAFE"
  | "ACTIVITY"
  | "DINING";

export interface Place {
  id: string;
  name: string;

  // 장소 분류
  category: PlaceCategory;
  subCategory?: string;

  // 위치 정보
  address: string;
  lat: number;
  lng: number;

  // 카카오 장소 정보
  imageUrl?: string;
  placeUrl?: string;

  // 지도/코스 상태
  isLiked?: boolean;
  isVisited?: boolean;
  group?: string;
}

// 저장된 코스 단계 인터페이스
export interface CourseStepItem {
  order: number;
  time: string;
  place: Place;
  commentary: string;
  isFixed?: boolean;
  transitNote?: string;
}

// 코스 보관함(폴더)에 저장되는 전체 플랜 데이터 구조
export interface SavedCoursePlan {
  id: string;
  roomCode: string; // 저장된 약속 방 코드
  folderName: string; // 저장된 폴더명 (기본 폴더, 데이트, 기념일 등)
  courseTitle: string;
  summary: string;
  location: string;
  steps: CourseStepItem[];
  createdAt: number;
  author: string;
}