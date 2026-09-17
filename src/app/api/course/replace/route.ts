import { NextResponse } from "next/server";
import type { Place } from "@/types/common";

interface SearchOptions {
  count?: number;
  lat?: number;
  lng?: number;
  radius?: number;
  sort?: "accuracy" | "distance";
}

// 거리/길목/골목 지명 POI 제외 함수
function isStreetOrAreaName(name: string): boolean {
  const clean = (name || "").trim();
  const streetPatterns = [
    /카페거리$/,
    /거리$/,
    /길$/,
    /골목$/,
    /먹자골목$/,
    /특화거리$/,
    /산책로$/,
    /테마거리$/,
    /문화거리$/,
  ];
  if (streetPatterns.some((pattern) => pattern.test(clean))) {
    return true;
  }
  if (
    clean.includes("카페거리") ||
    clean.includes("먹자골목") ||
    clean === "서울숲카페거리" ||
    clean === "성수동카페거리" ||
    clean === "신사동가로수길" ||
    clean === "연트럴파크" ||
    clean === "홍대걷고싶은거리"
  ) {
    return true;
  }
  return false;
}

// 부적합 시설(화장실, 편의점, 주차장 등) 제외
function isInvalidDatePlace(name: string, categoryName: string, categoryGroupCode?: string): boolean {
  const cleanName = (name || "").toLowerCase();
  const cleanCat = (categoryName || "").toLowerCase();

  if (categoryGroupCode === "CS2") return true;

  const bannedKeywords = [
    "화장실", "개방화장실", "공중화장실", "간이화장실", "남녀공용화장실",
    "편의점", "gs25", "cu", "세븐일레븐", "이마트24", "미니스톱", "c스페이스",
    "주차장", "공영주차장", "민영주차장", "타워주차장",
    "관리사무소", "관리실", "주민센터", "파출소", "치안센터", "소방서", "우체국",
    "철물", "설비", "샤시", "공업사", "정비소", "세차장", "주유소", "충전소",
    "인테리어", "부동산", "공인중개사", "창고", "물류센터", "스크린골프",
    "지하철", "전철역", "역사", "흡연구역", "자판기", "물품보관소"
  ];

  return bannedKeywords.some(
    (banned) => cleanName.includes(banned) || cleanCat.includes(banned)
  );
}

// 💡 놀거리 단계에서 카페/음식점이 섞여 들어오지 않도록 판별하는 전용 함수
function isFoodOrDrinkPlace(name: string, categoryName: string, categoryGroupCode?: string): boolean {
  if (categoryGroupCode === "FD6" || categoryGroupCode === "CE7") return true;

  const cleanName = (name || "").toLowerCase();
  const cleanCat = (categoryName || "").toLowerCase();

  const foodCafeIndicators = [
    "카페", "커피", "디저트", "베이커리", "제과", "음료", "찻집", "티룸",
    "음식점", "식당", "레스토랑", "주점", "호프", "술집", "포차", "치킨", "피자",
    "분식", "한식", "중식", "일식", "양식", "아시안", "고기", "구이", "브런치"
  ];

  // 보드게임카페, 방탈출카페, 룸카페, 만화카페 등 복합 놀이시설은 ACTIVITY 허용
  const allowedActivityCafe = ["보드게임", "방탈출", "룸카페", "만화", "드로잉카페", "도자기공방"];
  if (allowedActivityCafe.some((act) => cleanName.includes(act) || cleanCat.includes(act))) {
    return false;
  }

  return foodCafeIndicators.some((kw) => cleanCat.includes(kw) || cleanName.endsWith(kw));
}

function cleanLocationKeyword(location: string): string {
  let cleaned = (location || "").trim();
  cleaned = cleaned
    .replace(/카페거리/g, "")
    .replace(/먹자골목/g, "")
    .replace(/로데오거리/g, "")
    .replace(/거리/g, "")
    .replace(/골목/g, "")
    .trim();
  return cleaned || location;
}

async function searchKakaoPlacesRaw(
  query: string,
  options: SearchOptions = {}
): Promise<any[]> {
  const kakaoApiKey = process.env.KAKAO_REST_API_KEY;
  if (!kakaoApiKey) return [];

  const { count = 15, lat, lng, radius = 2000, sort = "distance" } = options;

  try {
    const params = new URLSearchParams({
      query,
      size: String(Math.min(count, 15)),
      sort,
    });

    if (lat && lng && lat > 0 && lng > 0) {
      params.append("y", String(lat));
      params.append("x", String(lng));
      if (radius) {
        params.append("radius", String(radius));
      }
    }

    const res = await fetch(
      `https://dapi.kakao.com/v2/local/search/keyword.json?${params.toString()}`,
      { headers: { Authorization: `KakaoAK ${kakaoApiKey}` } }
    );

    if (!res.ok) return [];
    const data = await res.json();
    return data.documents || [];
  } catch (error) {
    console.error("카카오 raw 검색 실패:", error);
    return [];
  }
}

async function searchNearbyCategory(
  categoryCode: "CE7" | "FD6" | "AT4" | "CT1",
  lat: number,
  lng: number,
  radius: number = 2000,
  count: number = 15
): Promise<Place[]> {
  const kakaoApiKey = process.env.KAKAO_REST_API_KEY;
  if (!kakaoApiKey || !lat || !lng) return [];

  try {
    const params = new URLSearchParams({
      category_group_code: categoryCode,
      x: String(lng),
      y: String(lat),
      radius: String(radius),
      sort: "distance",
      size: String(Math.min(count, 15)),
    });

    const res = await fetch(
      `https://dapi.kakao.com/v2/local/search/category.json?${params.toString()}`,
      { headers: { Authorization: `KakaoAK ${kakaoApiKey}` } }
    );

    if (!res.ok) return [];
    const data = await res.json();

    const catType: "RESTAURANT" | "CAFE" | "ACTIVITY" =
      categoryCode === "CE7"
        ? "CAFE"
        : categoryCode === "FD6"
        ? "RESTAURANT"
        : "ACTIVITY";

    return (data.documents || [])
      .filter((doc: any) => !isStreetOrAreaName(doc.place_name))
      .filter((doc: any) => !isInvalidDatePlace(doc.place_name, doc.category_name, doc.category_group_code))
      .map((doc: any) => ({
        id: String(doc.id),
        name: doc.place_name || "",
        category: catType,
        subCategory: doc.category_name?.split(">").pop()?.trim() || "",
        address: doc.road_address_name || doc.address_name,
        lat: parseFloat(doc.y),
        lng: parseFloat(doc.x),
        imageUrl: "",
        placeUrl:
          doc.place_url ||
          `https://map.kakao.com/link/search/${encodeURIComponent(doc.place_name)}`,
      }));
  } catch (error) {
    console.error("카테고리 반경 검색 실패:", error);
    return [];
  }
}

function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
  const R = 6371e3;
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLon = (lon2 - lon1) * rad;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * rad) *
      Math.cos(lat2 * rad) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

const CUISINE_KEYWORD_MAP: Record<string, { query: string; allowedSub: string[]; bannedSub: string[] }> = {
  "중식": {
    query: "중식당",
    allowedSub: ["중식", "중국요리", "양꼬치", "딤섬"],
    bannedSub: ["일식", "초밥", "돈가스", "라멘", "한식", "양식", "분식", "카페"],
  },
  "일식": {
    query: "일식당",
    allowedSub: ["일식", "초밥", "돈가스", "우동", "라멘", "일식집", "이자카야"],
    bannedSub: ["중식", "중국요리", "한식", "양식", "분식"],
  },
  "고기/구이": {
    query: "고기집",
    allowedSub: ["육류,고기", "삼겹살", "갈비", "고기"],
    bannedSub: ["해물,생선", "낙지", "오징어", "해산물", "카페", "디저트", "중식", "일식"],
  },
  "한식": {
    query: "한식당",
    allowedSub: ["한식", "한정식", "찌개", "백반", "국밥"],
    bannedSub: ["중식", "일식", "양식", "카페"],
  },
  "양식": {
    query: "양식",
    allowedSub: ["양식", "이탈리안", "프렌치", "패밀리레스토랑"],
    bannedSub: ["중식", "일식", "한식", "분식"],
  },
  "분식": {
    query: "분식",
    allowedSub: ["분식", "떡볶이"],
    bannedSub: ["고기", "회", "일식", "중식"],
  },
  "족발/보쌈": {
    query: "족발",
    allowedSub: ["족발", "보쌈"],
    bannedSub: ["해물", "카페", "일식", "중식"],
  },
  "주점": {
    query: "술집",
    allowedSub: ["술집", "호프", "요리주점", "포장마차"],
    bannedSub: ["카페", "디저트"],
  },
  "아시안": {
    query: "아시안",
    allowedSub: ["아시아음식", "베트남", "태국"],
    bannedSub: ["카페", "디저트"],
  },
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      location = "성수동",
      targetCategory = "DINING",
      stepPref = {},
      excludePlaceIds = [],
      excludePlaceNames = [],
      neighborCoords,
    } = body;

    const searchBaseLocation = cleanLocationKeyword(location);
    const bannedNames = new Set([...excludePlaceNames].map((n: string) => n.trim().toLowerCase()));
    const bannedIds = new Set([...excludePlaceIds].map((id: any) => String(id)));

    const normalizedCategory = String(targetCategory).toUpperCase();

    const anchorOptions: SearchOptions =
      neighborCoords?.lat && neighborCoords?.lng
        ? {
            lat: neighborCoords.lat,
            lng: neighborCoords.lng,
            radius: 2000,
            sort: "distance" as const,
          }
        : {};

    let candidates: Place[] = [];

    // ==========================================
    // 1. DINING / RESTAURANT 교체
    // ==========================================
    if (normalizedCategory === "DINING" || normalizedCategory === "RESTAURANT") {
      const targetCuisine = stepPref.cuisine?.[0] || "";
      const matchedConfig = CUISINE_KEYWORD_MAP[targetCuisine];
      const searchWord = matchedConfig ? matchedConfig.query : "맛집";

      const rawDocs = await searchKakaoPlacesRaw(`${searchBaseLocation} ${searchWord}`, { ...anchorOptions, count: 15 });

      const diningBanned = [
        "카페", "디저트", "아이스크림", "찻집", "티룸", "베이커리", "제과", "커피"
      ];

      candidates = rawDocs
        .filter((doc: any) => {
          if (isStreetOrAreaName(doc.place_name)) return false;
          if (isInvalidDatePlace(doc.place_name, doc.category_name, doc.category_group_code)) return false;
          if (doc.category_group_code && doc.category_group_code !== "FD6") return false;

          const catName = (doc.category_name || "").toLowerCase();
          const placeName = (doc.place_name || "").toLowerCase();

          if (diningBanned.some((bad) => catName.includes(bad) || placeName.includes(bad))) return false;
          if (matchedConfig?.bannedSub?.some((badSub) => catName.includes(badSub.toLowerCase()))) return false;
          return true;
        })
        .map((doc: any) => ({
          id: String(doc.id),
          name: doc.place_name || "",
          category: "RESTAURANT" as const,
          subCategory: doc.category_name?.split(">").pop()?.trim() || "",
          address: doc.road_address_name || doc.address_name,
          lat: parseFloat(doc.y),
          lng: parseFloat(doc.x),
          imageUrl: "",
          placeUrl: doc.place_url || `https://map.kakao.com/link/search/${encodeURIComponent(doc.place_name)}`,
        }));

      if (candidates.length < 4 && anchorOptions.lat && anchorOptions.lng) {
        const catDining = await searchNearbyCategory("FD6", anchorOptions.lat, anchorOptions.lng, 2000, 15);
        candidates = [...candidates, ...catDining];
      }
    }

    // ==========================================
    // 2. CAFE 교체
    // ==========================================
    else if (normalizedCategory === "CAFE") {
      const rawTheme = (stepPref.cafeDessert || "").trim();
      let searchTheme = "디저트 카페";
      if (rawTheme.includes("베이커리") || rawTheme.includes("빵")) searchTheme = "베이커리 카페";
      else if (rawTheme.includes("조용") || rawTheme.includes("대화")) searchTheme = "조용한 카페";
      else if (rawTheme.includes("감성") || rawTheme.includes("분위기")) searchTheme = "감성 카페";

      if (anchorOptions.lat && anchorOptions.lng) {
        const catCafes = await searchNearbyCategory("CE7", anchorOptions.lat, anchorOptions.lng, 2000, 15);
        candidates = [...candidates, ...catCafes];
      }

      const rawDocs = await searchKakaoPlacesRaw(`${searchBaseLocation} ${searchTheme}`, { ...anchorOptions, count: 15 });
      const majorBrands = ["스타벅스", "투썸플레이스", "메가커피", "컴포즈커피", "빽다방", "이디야"];

      const keywordCafes: Place[] = rawDocs
        .filter((doc: any) => {
          if (isStreetOrAreaName(doc.place_name)) return false;
          if (isInvalidDatePlace(doc.place_name, doc.category_name, doc.category_group_code)) return false;
          if (doc.category_group_code === "FD6") return false;

          const catName = doc.category_name || "";
          const pName = doc.place_name || "";
          const isCafeType =
            doc.category_group_code === "CE7" ||
            catName.includes("카페") ||
            catName.includes("커피") ||
            catName.includes("디저트") ||
            catName.includes("제과") ||
            catName.includes("베이커리") ||
            pName.includes("카페") ||
            pName.includes("커피");

          if (!isCafeType) return false;
          if (stepPref.cafeType?.includes("개인") && majorBrands.some((b) => pName.includes(b))) return false;
          return true;
        })
        .map((doc: any) => ({
          id: String(doc.id),
          name: doc.place_name || "",
          category: "CAFE" as const,
          subCategory: doc.category_name?.split(">").pop()?.trim() || "",
          address: doc.road_address_name || doc.address_name,
          lat: parseFloat(doc.y),
          lng: parseFloat(doc.x),
          imageUrl: "",
          placeUrl: doc.place_url || `https://map.kakao.com/link/search/${encodeURIComponent(doc.place_name)}`,
        }));

      candidates = [...candidates, ...keywordCafes];

      if (candidates.length < 4) {
        const fallbackDocs = await searchKakaoPlacesRaw(`${searchBaseLocation} 감성 카페`, { count: 15 });
        const fallbackCafes = fallbackDocs
          .filter((doc: any) => !isInvalidDatePlace(doc.place_name, doc.category_name, doc.category_group_code))
          .filter((doc: any) => doc.category_group_code === "CE7" || (doc.category_name || "").includes("카페"))
          .map((doc: any) => ({
            id: String(doc.id),
            name: doc.place_name || "",
            category: "CAFE" as const,
            subCategory: doc.category_name?.split(">").pop()?.trim() || "",
            address: doc.road_address_name || doc.address_name,
            lat: parseFloat(doc.y),
            lng: parseFloat(doc.x),
            imageUrl: "",
            placeUrl: doc.place_url || `https://map.kakao.com/link/search/${encodeURIComponent(doc.place_name)}`,
          }));
        candidates = [...candidates, ...fallbackCafes];
      }
    }

    // ==========================================
    // 3. ACTIVITY 교체 (카페·식당 철저 차단 및 부족 지역 반경 확장)
    // ==========================================
    else {
      const pace = stepPref.activityPace || "액티비티";
      const env = stepPref.activityEnvironment || "실내";
      const keywordMap: Record<string, string[]> = {
        "액티비티_실내": ["방탈출", "보드게임카페", "볼링장", "원데이클래스", "공방", "실내데이트", "오락실", "영화관"],
        "액티비티_야외": ["테마파크", "유원지", "자전거대여", "수목원", "도시공원"],
        "잔잔한 힐링_실내": ["미술관", "전시관", "독립서점", "소품샵", "공방", "편집샵", "영화관"],
        "잔잔한 힐링_야외": ["수목원", "호수공원", "도시공원", "자연휴양림"],
      };

      const kwList = keywordMap[`${pace}_${env}`] || ["미술관", "전시관", "공방", "방탈출", "볼링장"];

      // 1순위: 문화시설(CT1) 및 관광명소(AT4) 카테고리 검색 (신뢰도 높음)
      if (anchorOptions.lat && anchorOptions.lng) {
        const catCT1 = await searchNearbyCategory("CT1", anchorOptions.lat, anchorOptions.lng, 3000, 10);
        const catAT4 = await searchNearbyCategory("AT4", anchorOptions.lat, anchorOptions.lng, 3000, 10);
        candidates = [...catCT1, ...catAT4];
      }

      // 2순위: 세부 키워드 검색
      let rawDocs: any[] = [];
      for (const kw of shuffleArray(kwList).slice(0, 3)) {
        const docs = await searchKakaoPlacesRaw(`${searchBaseLocation} ${kw}`, { ...anchorOptions, count: 12 });
        rawDocs = [...rawDocs, ...docs];
        if (rawDocs.length >= 15) break;
      }

      const filteredRawActs: Place[] = rawDocs
        .filter((doc: any) => {
          if (isStreetOrAreaName(doc.place_name)) return false;
          if (isInvalidDatePlace(doc.place_name, doc.category_name, doc.category_group_code)) return false;

          // 💡 카페/음식점/디저트 완벽 차단
          if (isFoodOrDrinkPlace(doc.place_name, doc.category_name || "", doc.category_group_code)) {
            return false;
          }

          const catName = (doc.category_name || "").toLowerCase();
          if (env === "실내" && (catName.includes("도로") || catName.includes("산책로") || catName.includes("공원"))) {
            return false;
          }

          return true;
        })
        .map((doc: any) => ({
          id: String(doc.id),
          name: doc.place_name || "",
          category: "ACTIVITY" as const,
          subCategory: doc.category_name?.split(">").pop()?.trim() || "",
          address: doc.road_address_name || doc.address_name,
          lat: parseFloat(doc.y),
          lng: parseFloat(doc.x),
          imageUrl: "",
          placeUrl: doc.place_url || `https://map.kakao.com/link/search/${encodeURIComponent(doc.place_name)}`,
        }));

      candidates = [...candidates, ...filteredRawActs];

      // 3순위: 놀거리 부족 지역(동네에 시설이 적을 때) - 반경 4,000m 확장 보충
      if (candidates.length < 4 && anchorOptions.lat && anchorOptions.lng) {
        const widerKeywords = env === "실내" ? ["영화관", "볼링장", "미술관", "공방", "전시관"] : ["도시공원", "수목원", "호수공원"];
        for (const kw of widerKeywords) {
          const widerDocs = await searchKakaoPlacesRaw(kw, {
            lat: anchorOptions.lat,
            lng: anchorOptions.lng,
            radius: 4000,
            count: 10,
            sort: "distance",
          });

          const validWider = widerDocs
            .filter((doc: any) => !isStreetOrAreaName(doc.place_name))
            .filter((doc: any) => !isInvalidDatePlace(doc.place_name, doc.category_name, doc.category_group_code))
            .filter((doc: any) => !isFoodOrDrinkPlace(doc.place_name, doc.category_name || "", doc.category_group_code))
            .map((doc: any) => ({
              id: String(doc.id),
              name: doc.place_name || "",
              category: "ACTIVITY" as const,
              subCategory: doc.category_name?.split(">").pop()?.trim() || "",
              address: doc.road_address_name || doc.address_name,
              lat: parseFloat(doc.y),
              lng: parseFloat(doc.x),
              imageUrl: "",
              placeUrl: doc.place_url || `https://map.kakao.com/link/search/${encodeURIComponent(doc.place_name)}`,
            }));

          candidates = [...candidates, ...validWider];
          if (candidates.length >= 8) break;
        }
      }
    }

    // 중복 및 비적합 장소 최종 필터링
    const uniqueMap = new Map<string, Place>();
    candidates.forEach((p) => {
      const cleanName = (p.name || "").trim().toLowerCase();
      if (!isStreetOrAreaName(p.name) && !isInvalidDatePlace(p.name, p.subCategory || "") && !uniqueMap.has(cleanName)) {
        // 놀거리 요청인 경우 카페/식당 최종 방어
        if (normalizedCategory === "ACTIVITY" && isFoodOrDrinkPlace(p.name, p.subCategory || "")) {
          return;
        }
        uniqueMap.set(cleanName, p);
      }
    });

    const uniqueCandidates = Array.from(uniqueMap.values());

    // 현재 코스에 이미 있는 장소 제외
    let available = uniqueCandidates.filter((p) => {
      const pName = (p.name || "").trim().toLowerCase();
      return !bannedIds.has(String(p.id)) && !bannedNames.has(pName);
    });

    if (available.length === 0) {
      const currentTargetName = [...excludePlaceNames][0]?.trim().toLowerCase();
      available = uniqueCandidates.filter((p) => (p.name || "").trim().toLowerCase() !== currentTargetName);
    }

    if (available.length === 0) {
      return NextResponse.json(
        { error: "해당 위치 주변에 조건에 맞는 다른 장소를 찾지 못했습니다." },
        { status: 404 }
      );
    }

    // 도보/이동 거리순 정렬
    if (neighborCoords?.lat && neighborCoords?.lng) {
      available.sort((a, b) => {
        const distA = calculateDistance(neighborCoords.lat, neighborCoords.lng, a.lat, a.lng);
        const distB = calculateDistance(neighborCoords.lat, neighborCoords.lng, b.lat, b.lng);
        return distA - distB;
      });
    }

    const pool = available.slice(0, Math.min(3, available.length));
    const chosenPlace = pool[Math.floor(Math.random() * pool.length)];

    let commentary = "도보 동선과 취향을 고려해 새롭게 추천된 장소입니다.";
    const targetCuisine = stepPref.cuisine?.[0];
    if (normalizedCategory === "DINING" || normalizedCategory === "RESTAURANT") {
      commentary = targetCuisine
        ? `정갈하고 맛있는 ${targetCuisine} 요리를 즐기며 기분 좋은 시간을 보내보세요.`
        : "정갈한 메뉴와 편안한 분위기가 돋보이는 든든한 식사 장소입니다.";
    } else if (normalizedCategory === "CAFE") {
      commentary = "아늑한 분위기에서 향긋한 음료와 달콤한 디저트를 함께 즐겨보세요.";
    } else {
      commentary = "두 사람만의 소중한 추억을 만들 수 있는 매력적인 활동 공간입니다.";
    }

    return NextResponse.json({
      place: chosenPlace,
      commentary,
    });
  } catch (error: any) {
    console.error("단일 장소 교체 에러:", error);
    return NextResponse.json(
      { error: error?.message || "장소 교체에 실패했습니다." },
      { status: 500 }
    );
  }
}