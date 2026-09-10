import { NextResponse } from "next/server";
import { GoogleGenAI, Type } from "@google/genai";
import { Place } from "@/types/common";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

interface SearchOptions {
  count?: number;
  lat?: number;
  lng?: number;
  radius?: number;
  sort?: "accuracy" | "distance";
}

// 1. 카카오 카테고리 전용 반경 검색 (CE7: 카페, FD6: 음식점)
async function searchNearbyCategory(
  categoryCode: "CE7" | "FD6",
  lat: number,
  lng: number,
  radius: number = 700,
  count: number = 10
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

    return (data.documents || []).map((doc: any) => ({
      id: String(doc.id),
      name: doc.place_name || "",
      category: categoryCode === "CE7" ? "CAFE" : "RESTAURANT",
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

// 2. 카카오 키워드 검색
async function searchKakaoPlaces(
  query: string,
  options: SearchOptions = {}
): Promise<Place[]> {
  const kakaoApiKey = process.env.KAKAO_REST_API_KEY;
  if (!kakaoApiKey) return [];

  const { count = 10, lat, lng, radius, sort = "accuracy" } = options;

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
      {
        headers: { Authorization: `KakaoAK ${kakaoApiKey}` },
      }
    );

    if (!res.ok) return [];
    const data = await res.json();

    return (data.documents || []).map((doc: any) => {
      const catGroup = doc.category_group_code;
      const catName = doc.category_name || "";
      const placeName = doc.place_name || "";

      let category: "RESTAURANT" | "CAFE" | "ACTIVITY" = "ACTIVITY";
      if (
        placeName.includes("숲") ||
        placeName.includes("공원") ||
        catName.includes("공원") ||
        catGroup === "AT4" ||
        catGroup === "CT1"
      ) {
        category = "ACTIVITY";
      } else if (catGroup === "CE7" || catName.includes("카페")) {
        category = "CAFE";
      } else if (catGroup === "FD6" || catName.includes("음식점")) {
        category = "RESTAURANT";
      }

      return {
        id: String(doc.id),
        name: placeName,
        category,
        subCategory: catName.split(">").pop()?.trim() || "",
        address: doc.road_address_name || doc.address_name,
        lat: parseFloat(doc.y),
        lng: parseFloat(doc.x),
        imageUrl: "",
        placeUrl:
          doc.place_url ||
          `https://map.kakao.com/link/search/${encodeURIComponent(placeName)}`,
      };
    });
  } catch (error) {
    console.error("Kakao API 에러:", error);
    return [];
  }
}

// 3. 고정 장소의 실제 좌표 보정
async function resolvePlaceCoordinates(
  place: Place,
  location: string
): Promise<Place> {
  if (place.lat && place.lng && place.lat > 0 && place.lng > 0) {
    return place;
  }

  const kakaoApiKey = process.env.KAKAO_REST_API_KEY;
  if (!kakaoApiKey) return place;

  try {
    if (place.address && place.address.length > 5) {
      const addrRes = await fetch(
        `https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(
          place.address
        )}`,
        { headers: { Authorization: `KakaoAK ${kakaoApiKey}` } }
      );
      if (addrRes.ok) {
        const addrData = await addrRes.json();
        const doc = addrData.documents?.[0];
        if (doc) {
          return {
            ...place,
            lat: parseFloat(doc.y),
            lng: parseFloat(doc.x),
          };
        }
      }
    }

    const query = place.name.includes(location)
      ? place.name
      : `${location} ${place.name}`;
    const res = await fetch(
      `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(
        query
      )}&size=1`,
      { headers: { Authorization: `KakaoAK ${kakaoApiKey}` } }
    );

    if (res.ok) {
      const data = await res.json();
      const doc = data.documents?.[0];
      if (doc) {
        return {
          ...place,
          id: place.id || String(doc.id),
          lat: parseFloat(doc.y),
          lng: parseFloat(doc.x),
          address: place.address || doc.road_address_name || doc.address_name,
        };
      }
    }
  } catch (err) {
    console.warn(`좌표 보정 실패 (${place.name}):`, err);
  }

  return place;
}

function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
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

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      location = "성수동",
      courseOrder = ["DINING", "CAFE", "ACTIVITY"],
      cuisine = [],
      diningWaiting = "웨이팅 없음",
      diningOption = "",
      cafeType = "개인 카페",
      cafeDessert = "",
      dessert = "",
      cafeAtmosphere = "",
      activityPace = "액티비티",
      activityEnvironment = "실내",
      fixedPlaces = [],
    } = body;

    // 카카오 로컬 검색 최적화 테마 키워드
    const rawDessertOption = (cafeDessert || dessert || cafeAtmosphere || "").trim();
    let searchCategoryKeyword = "디저트 카페";
    if (rawDessertOption.includes("베이커리") || rawDessertOption.includes("빵")) {
      searchCategoryKeyword = "베이커리 카페";
    } else if (rawDessertOption.includes("조용") || rawDessertOption.includes("대화")) {
      searchCategoryKeyword = "조용한 카페";
    } else if (rawDessertOption.includes("분위기") || rawDessertOption.includes("감성")) {
      searchCategoryKeyword = "감성 카페";
    } else if (
      rawDessertOption.includes("디저트") ||
      rawDessertOption.includes("케이크") ||
      rawDessertOption.includes("구움과자")
    ) {
      searchCategoryKeyword = "디저트 카페";
    }

    // 1. 고정 장소 카테고리 정규화 및 실제 좌표 보정
    const normalizedFixedPlaces: Place[] = await Promise.all(
      (fixedPlaces || []).map(async (p: Place) => {
        let cat = String(p.category || "").toUpperCase();
        if (
          p.name.includes("숲") ||
          p.name.includes("공원") ||
          p.name.includes("박람회")
        ) {
          cat = "ACTIVITY";
        } else if (cat === "RESTAURANT" || cat === "DINING") {
          cat = "DINING";
        } else if (cat === "CAFE") {
          cat = "CAFE";
        } else {
          cat = "ACTIVITY";
        }

        const normalized = { ...p, category: cat as any };
        return await resolvePlaceCoordinates(normalized, location);
      })
    );

    const fixedDining = normalizedFixedPlaces.find(
      (p: Place) => String(p.category).toUpperCase() === "DINING"
    );
    const fixedCafe = normalizedFixedPlaces.find(
      (p: Place) => String(p.category).toUpperCase() === "CAFE"
    );
    const fixedActivity = normalizedFixedPlaces.find(
      (p: Place) => String(p.category).toUpperCase() === "ACTIVITY"
    );

    const upperCourseOrder: string[] = (courseOrder || []).map((c: string) =>
      c.toUpperCase()
    );
    const includeDining = upperCourseOrder.includes("DINING");
    const includeCafe = upperCourseOrder.includes("CAFE");
    const includeActivity = upperCourseOrder.includes("ACTIVITY");

    let diningCandidates: Place[] = [];
    let cafeCandidates: Place[] = [];
    let activityCandidates: Place[] = [];

// [1단계: 식사 후보군 검색]
    if (includeDining) {
      if (fixedDining) {
        diningCandidates = [fixedDining];
      } else {
        let menuSuffix = "";
        if (diningOption === "밥") menuSuffix = " 덮밥 솥밥 백반 가정식";
        else if (diningOption === "면") menuSuffix = " 파스타 라멘 국수";
        else if (diningOption === "기타") menuSuffix = " 수제버거 타코 피자 멕시칸 화덕피자";

        const baseFood = cuisine?.[0] ? `${cuisine[0]}` : "";
        const foodKeyword = `${location} ${baseFood}${menuSuffix} 맛집`.replace(/\s+/g, " ").trim();

        // 1차: 키워드 검색
        let rawResults = await searchKakaoPlaces(foodKeyword, { count: 15 });

        // 💡 카페/제과/음료 관련 일체 배제
        const diningBannedWords = [
          "카페", "베이커리", "제과", "빵", "커피", "디저트", "아이스크림", 
          "호프", "주점", "포차", "술집", "찻집", "티룸", "샌드위치"
        ];

        let filteredDining = rawResults.filter((p) => {
          const sub = (p.subCategory || "").toLowerCase();
          const name = (p.name || "").toLowerCase();
          const isBanned = diningBannedWords.some(
            (bad) => sub.includes(bad) || name.includes(bad)
          );
          return p.category === "RESTAURANT" && !isBanned;
        });

        if (filteredDining.length < 3) {
          const backupDining = await searchKakaoPlaces(`${location} ${baseFood || "식당"} 맛집`, { count: 10 });
          const extra = backupDining.filter((p) => {
            const sub = (p.subCategory || "").toLowerCase();
            const name = (p.name || "").toLowerCase();
            return p.category === "RESTAURANT" && !diningBannedWords.some(b => sub.includes(b) || name.includes(b));
          });
          filteredDining = [...filteredDining, ...extra];
        }

        // 중복 장소 제거
        const uniqueDining = Array.from(
          new Map(filteredDining.map((p) => [p.name, p])).values()
        );

        diningCandidates = shuffleArray(uniqueDining).slice(0, 5);
      }
    }

    // [2단계: 연쇄 기준점(Anchor) 도출]
    const resolvedAnchorPlace =
      fixedDining ||
      diningCandidates[0] ||
      fixedActivity ||
      fixedCafe ||
      normalizedFixedPlaces[0];

    const chainAnchor: SearchOptions =
      resolvedAnchorPlace && resolvedAnchorPlace.lat > 0 && resolvedAnchorPlace.lng > 0
        ? {
            lat: resolvedAnchorPlace.lat,
            lng: resolvedAnchorPlace.lng,
            radius: 900, // 800m 반경 제한
            sort: "distance" as const,
          }
        : {};

    // [3단계: 카페 후보군 검색]
    if (includeCafe) {
      if (fixedCafe) {
        cafeCandidates = [fixedCafe];
      } else {
        let results: Place[] = [];
        const majorBrands = [
          "스타벅스", "투썸플레이스", "메가커피", "컴포즈커피", "빽다방", "이디야", "할리스"
        ];

        const scopedCafeQuery = `${location} ${searchCategoryKeyword}`.trim();

        results = await searchKakaoPlaces(scopedCafeQuery, {
          ...chainAnchor,
          count: 15,
        });

        if (results.length < 3 && chainAnchor.lat && chainAnchor.lng) {
          const categoryResults = await searchNearbyCategory(
            "CE7",
            chainAnchor.lat,
            chainAnchor.lng,
            800,
            12
          );
          results = [...results, ...categoryResults];
        }

        if (results.length === 0) {
          results = await searchKakaoPlaces(`${location} 카페`, { count: 10 });
        }

        const uniqueResults = Array.from(
          new Map(results.map((p) => [p.name, p])).values()
        );

        if (cafeType.includes("개인")) {
          const filtered = uniqueResults.filter(
            (p) => !majorBrands.some((brand) => p.name.includes(brand))
          );
          results = filtered.length > 0 ? filtered : uniqueResults;
        } else {
          results = uniqueResults;
        }

        cafeCandidates = shuffleArray(results).slice(0, 5);
      }
    }

    // [4단계: 놀거리 후보군 검색 - 실내/야외 엄격 분리]
    if (includeActivity) {
      if (fixedActivity) {
        activityCandidates = [fixedActivity];
      } else {
        const activityKeywordMap: Record<string, string[]> = {
          "액티비티_실내": ["방탈출", "보드게임카페", "볼링장", "원데이클래스", "실내양궁"],
          "액티비티_야외": ["자전거대여", "테마파크", "유원지"],
          "잔잔한 힐링_실내": ["소품샵", "독립서점", "미술관", "전시관", "공방", "편집샵"],
          "잔잔한 힐링_야외": ["도시공원", "수목원", "호수공원"],
        };

        const key = `${activityPace}_${activityEnvironment}`;
        const targetKeywords = activityKeywordMap[key] || ["소품샵", "공방"];
        const pickedKeyword = targetKeywords[Math.floor(Math.random() * targetKeywords.length)];
        const actQuery = `${location} ${pickedKeyword}`;

        let results = await searchKakaoPlaces(actQuery, {
          count: 15,
          ...chainAnchor,
        });

        const actBannedWords = [
          "인테리어", "부동산", "철물", "설비", "샤시", "관리사무소", "주차장", "공업사"
        ];
        
        if (activityEnvironment === "실내") {
          actBannedWords.push("도로", "길", "도보여행", "산책로", "산책", "공원", "숲길", "코스", "골목");
        }

        const validResults = results.filter((p) => {
          const name = (p.name || "").toLowerCase();
          const sub = (p.subCategory || "").toLowerCase();
          const isBanned = actBannedWords.some(
            (bad) => name.includes(bad) || sub.includes(bad)
          );
          return !isBanned;
        });

        if (validResults.length === 0) {
          const fallbackKeyword = activityEnvironment === "실내" ? "소품샵" : "공원";
          const fallback = await searchKakaoPlaces(`${location} ${fallbackKeyword}`, {
            count: 8,
            ...chainAnchor,
          });
          activityCandidates = shuffleArray(fallback).slice(0, 5);
        } else {
          activityCandidates = shuffleArray(validResults).slice(0, 5);
        }
      }
    }

    const allCandidates = [
      ...diningCandidates,
      ...cafeCandidates,
      ...activityCandidates,
    ];

    if (allCandidates.length === 0) {
      return NextResponse.json(
        { error: "조건에 맞는 장소 검색 결과가 없습니다." },
        { status: 400 }
      );
    }

    const categoryNameMap: Record<string, string> = {
      DINING: "식사 (식당 후보군)",
      CAFE: "카페 (카페 후보군)",
      ACTIVITY: "놀거리/활동 (활동 후보군)",
    };

    const sequencePromptGuide = upperCourseOrder
      .map(
        (cat: string, idx: number) =>
          `   - ${idx + 1}단계: 반드시 [${categoryNameMap[cat]}] 목록에서 1곳 선택`
      )
      .join("\n");

    const validCandidateInfo = allCandidates.map((c: Place) => ({
      placeId: String(c.id),
      placeName: c.name,
      category: c.category,
      subCategory: c.subCategory,
      address: c.address,
      lat: c.lat,
      lng: c.lng,
    }));

    const prompt = `
당신은 실제 도보 동선과 취향 조건을 세심하게 맞추는 전문 데이트 코스 플래너입니다.
반드시 아래 [제공된 실제 후보 장소 목록]에 존재하는 장소들 중에서만 코스를 구성해야 합니다.

[사용자 선호 조건]
- 식사 웨이팅 성향: ${diningWaiting}
- 식사 선호: ${cuisine.join(", ") || "전체"} (선호 메뉴: ${diningOption === "기타" ? "밥/면 외의 수제버거, 피자, 타코, 핑거푸드, 브런치 등" : diningOption})
- 카페 선호: ${cafeType || "개인 카페"} (특징: ${searchCategoryKeyword})
- 활동 선호: ${activityEnvironment} (${activityPace})

[동선 및 선정 절대 규칙 - 위반 금지]
1. 전체 코스는 반드시 정확히 ${upperCourseOrder.length}단계로만 구성해야 합니다.
2. 사용자가 지정한 순서대로 각 카테고리에서 정확히 1곳씩 선택하세요:
${sequencePromptGuide}
3. [식사(DINING)]에는 절대로 제과점, 빵집, 디저트/카페 전문점을 선택하지 마세요. 든든한 식사(식당 요리)가 가능한 곳이어야 합니다.
4. [실내 활동(ACTIVITY)] 선택 시에는 길거리, 산책로, 도로, 공원을 절대 선택할 수 없습니다. 소품샵, 전시관, 독립서점, 공방 등 '실내 건축물 내부 장소'만 선택하세요.
5. 각 코스 항목은 반드시 서로 다른 장소여야 하며 동일한 장소를 중복 선택할 수 없습니다.
6. 각 단계 간의 도보 이동 거리가 최소화되도록 서로 가장 가까운 위치의 장소를 우선 선정하세요.
7. 후보군에 1곳만 존재하는 고정 장소(사용자가 직접 고른 장소)는 반드시 해당 단계에 누락 없이 포함하세요.
8. placeId와 placeName은 아래 [제공된 실제 후보 장소 목록]의 문자열 그대로 입력하세요.
9. 각 장소마다 순서와 시간대에 어울리는 다정한 한 줄 코멘터리를 작성하세요.

[제공된 실제 후보 장소 목록]
${JSON.stringify(validCandidateInfo, null, 2)}
`;

    const callGeminiWithModel = async (modelName: string) => {
      return await ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              courseTitle: { type: Type.STRING },
              summary: { type: Type.STRING },
              steps: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    order: { type: Type.INTEGER },
                    time: { type: Type.STRING },
                    placeId: { type: Type.STRING },
                    placeName: { type: Type.STRING },
                    category: { type: Type.STRING },
                    commentary: { type: Type.STRING },
                  },
                  required: [
                    "order",
                    "time",
                    "placeId",
                    "placeName",
                    "category",
                    "commentary",
                  ],
                },
              },
            },
            required: ["courseTitle", "summary", "steps"],
          },
        },
      });
    };

    let aiResult: any = null;
    const targetModel = "gemini-2.5-flash";
    const maxAttempts = 2;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const response = await callGeminiWithModel(targetModel);
        if (response?.text) {
          aiResult = JSON.parse(response.text);
          break;
        }
      } catch (err: any) {
        console.warn(`Gemini 호출 시도 ${attempt} 실패: ${err?.message}`);
        if (attempt < maxAttempts) {
          await new Promise((res) => setTimeout(res, 1000));
        }
      }
    }

    if (!aiResult || !aiResult.steps || aiResult.steps.length === 0) {
      console.warn("AI 응답 실패 또는 Fallback 구동: 최근접 거리 & 중복 제거 알고리즘 가동");
      const defaultTimes = ["12:00", "14:00", "16:00", "18:00"];
      let lastPlace: Place | null = null;
      const usedPlaceIds = new Set<string>();

      const fallbackSteps = upperCourseOrder.map((cat: string, idx: number) => {
        let candidatesPool: Place[] = [];
        let defaultCommentary = "";

        if (cat === "DINING") {
          candidatesPool = fixedDining ? [fixedDining] : diningCandidates;
          defaultCommentary = "정갈하고 든든한 식사로 즐거운 데이트를 시작해보세요.";
        } else if (cat === "CAFE") {
          candidatesPool = fixedCafe ? [fixedCafe] : cafeCandidates;
          defaultCommentary = "향긋한 커피와 맛있는 디저트를 즐기며 편안한 대화를 나눠보세요.";
        } else {
          candidatesPool = fixedActivity ? [fixedActivity] : activityCandidates;
          defaultCommentary = "특별한 실내 공간에서 함께 여유로운 시간을 만끽해보세요.";
        }

        let availableCandidates = candidatesPool.filter(
          (p) => !usedPlaceIds.has(String(p.id)) && (!lastPlace || p.name !== lastPlace.name)
        );

        if (availableCandidates.length === 0) {
          availableCandidates = candidatesPool;
        }

        let selected = availableCandidates[0] || allCandidates[0];

        if (
          lastPlace &&
          lastPlace.lat &&
          lastPlace.lng &&
          lastPlace.lat > 0 &&
          availableCandidates.length > 1
        ) {
          const sorted = [...availableCandidates].sort((a, b) => {
            const distA = calculateDistance(lastPlace!.lat, lastPlace!.lng, a.lat, a.lng);
            const distB = calculateDistance(lastPlace!.lat, lastPlace!.lng, b.lat, b.lng);
            return distA - distB;
          });
          selected = sorted[0];
        }

        usedPlaceIds.add(String(selected.id));
        lastPlace = selected;

        return {
          order: idx + 1,
          time: defaultTimes[idx] || "15:00",
          placeId: String(selected.id),
          placeName: selected.name,
          category: selected.category,
          commentary: defaultCommentary,
        };
      });

      aiResult = {
        courseTitle: `${location} 맞춤 데이트 코스`,
        summary: "장소 간 이동 동선과 취향 조건을 정밀하게 고려해 구성한 최적 코스입니다.",
        steps: fallbackSteps,
      };
    }

    // 도보 이동 시간 계산 및 최종 응답 조립
    const finalSteps = (aiResult.steps || []).map(
      (step: any, index: number) => {
        const placeDetail =
          allCandidates.find(
            (p: Place) => String(p.id) === String(step.placeId)
          ) || {
            id: String(step.placeId),
            name: step.placeName,
            category: step.category,
            address: location,
            lat: 0,
            lng: 0,
          };

        let transitNote: string | undefined;
        if (index > 0) {
          const prevStep = aiResult.steps[index - 1];
          const prevPlace = allCandidates.find(
            (p: Place) => String(p.id) === String(prevStep.placeId)
          );
          if (
            prevPlace &&
            prevPlace.lat &&
            prevPlace.lng &&
            placeDetail.lat &&
            placeDetail.lng
          ) {
            const meters = calculateDistance(
              prevPlace.lat,
              prevPlace.lng,
              placeDetail.lat,
              placeDetail.lng
            );
            const walkMinutes = Math.max(1, Math.round(meters / 67));
            transitNote = `도보 약 ${walkMinutes}분 (${meters}m)`;
          }
        }

        const isFixed = normalizedFixedPlaces.some(
          (p: Place) =>
            String(p.id) === String(placeDetail.id) ||
            p.name === placeDetail.name
        );

        return {
          order: step.order,
          time: step.time,
          place: placeDetail,
          commentary: step.commentary,
          isFixed,
          transitNote,
        };
      }
    );

    return NextResponse.json({
      courseTitle: aiResult.courseTitle,
      summary: aiResult.summary,
      steps: finalSteps,
    });
  } catch (error: any) {
    console.error("Course Route 에러:", error);
    return NextResponse.json(
      { error: error?.message || "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}