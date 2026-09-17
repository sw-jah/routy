import { NextResponse } from "next/server";
import { GoogleGenAI, Type } from "@google/genai";
import type { Place } from "@/types/common";

interface SearchOptions {
  count?: number;
  lat?: number;
  lng?: number;
  radius?: number;
  sort?: "accuracy" | "distance";
}

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

async function searchNearbyCategory(
  categoryCode: "CE7" | "FD6",
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

    return (data.documents || [])
      .filter((doc: any) => !isStreetOrAreaName(doc.place_name))
      .map((doc: any) => ({
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

    return (data.documents || [])
      .filter((doc: any) => !isStreetOrAreaName(doc.place_name))
      .map((doc: any) => {
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

    const cleanLoc = cleanLocationKeyword(location);
    const query = place.name.includes(cleanLoc)
      ? place.name
      : `${cleanLoc} ${place.name}`;
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
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY가 설정되지 않았습니다." },
        { status: 500 }
      );
    }

    const ai = new GoogleGenAI({ apiKey: geminiApiKey });

    const body = await req.json();
    const {
      mode = "custom",
      location = "", // 💡 서울 기본값("성수동") 제거
      startCoords,
      startTime = "12:00",
      courseOrder = ["DINING", "CAFE", "ACTIVITY"],
      stepPreferences = [],
      fixedPlaces = [],
      savedPlaces = [],
    } = body;

    const searchBaseLocation = cleanLocationKeyword(location);

    const initialAnchorOptions: SearchOptions =
      startCoords?.lat && startCoords?.lng
        ? {
            lat: startCoords.lat,
            lng: startCoords.lng,
            radius: 2000,
            sort: "distance" as const,
          }
        : {};

    const normalizedFixedPlaces: Place[] = await Promise.all(
      (fixedPlaces || []).map(async (p: Place) => {
        let cat = String(p.category || "").toUpperCase();
        if (cat === "RESTAURANT" || cat === "DINING") cat = "DINING";
        else if (cat === "CAFE") cat = "CAFE";
        else cat = "ACTIVITY";

        const normalized = { ...p, category: cat as any };
        return await resolvePlaceCoordinates(normalized, searchBaseLocation);
      })
    );

    const upperCourseOrder: string[] = (courseOrder || []).map((c: string) => c.toUpperCase());
    const includeCafe = upperCourseOrder.includes("CAFE");
    const includeActivity = upperCourseOrder.includes("ACTIVITY");

    const defaultBanned = [
      "카페", "디저트", "아이스크림", "호프", "포차", "찻집", "티룸", 
      "베이커리", "제과", "빵", "커피", "샌드위치", "도넛", "노래", "당구"
    ];

    const stepDiningCandidatesMap: Record<number, Place[]> = {};
    let allDiningCandidates: Place[] = [];

    for (let i = 0; i < upperCourseOrder.length; i++) {
      if (upperCourseOrder[i] === "DINING") {
        const fixedAtThisStep = normalizedFixedPlaces.find((p) => p.category === "DINING" && (p as any).targetStepIndex === i);
        if (fixedAtThisStep) {
          stepDiningCandidatesMap[i] = [fixedAtThisStep];
          allDiningCandidates.push(fixedAtThisStep);
          continue;
        }

        const prefAtStep = stepPreferences[i] || {};
        const targetCuisine = prefAtStep.cuisine?.[0] || ""; 
        const matchedConfig = CUISINE_KEYWORD_MAP[targetCuisine];
        const searchWord = matchedConfig ? matchedConfig.query : "맛집";

        let raw = await searchKakaoPlaces(`${searchBaseLocation} ${searchWord}`, { ...initialAnchorOptions, count: 15 });

        if (targetCuisine === "고기/구이" && raw.length < 5) {
          const extraPork = await searchKakaoPlaces(`${searchBaseLocation} 삼겹살`, { ...initialAnchorOptions, count: 15 });
          raw = [...raw, ...extraPork];
        }

        let filtered = raw.filter((p) => {
          const sub = (p.subCategory || "").toLowerCase();
          const name = (p.name || "").toLowerCase();

          if (defaultBanned.some((bad) => sub.includes(bad) || name.includes(bad))) return false;
          if (matchedConfig?.bannedSub?.some((badSub) => sub.includes(badSub.toLowerCase()))) return false;
          return p.category === "RESTAURANT";
        });

        if (matchedConfig?.allowedSub?.length) {
          const priorityList = filtered.filter((p) =>
            matchedConfig.allowedSub.some((okSub) => (p.subCategory || "").includes(okSub))
          );
          if (priorityList.length >= 3) {
            filtered = priorityList;
          }
        }

        if (filtered.length < 3) {
          const backup = await searchKakaoPlaces(`${searchBaseLocation} ${searchWord}`, { count: 15 });
          const backupFiltered = backup.filter((p) => {
            const sub = (p.subCategory || "").toLowerCase();
            const isBanned = defaultBanned.some((b) => sub.includes(b)) ||
              (matchedConfig?.bannedSub?.some((b) => sub.includes(b.toLowerCase())) ?? false);
            return p.category === "RESTAURANT" && !isBanned;
          });
          filtered = [...filtered, ...backupFiltered];
        }

        const unique = Array.from(new Map(filtered.map((p) => [p.name, p])).values());
        const selectedSlice = shuffleArray(unique).slice(0, 5);
        stepDiningCandidatesMap[i] = selectedSlice;
        allDiningCandidates.push(...selectedSlice);
      }
    }

    const firstDining = allDiningCandidates[0] || normalizedFixedPlaces[0];
    const chainAnchor: SearchOptions =
      firstDining && firstDining.lat > 0 && firstDining.lng > 0
        ? {
            lat: firstDining.lat,
            lng: firstDining.lng,
            radius: 2000,
            sort: "distance" as const,
          }
        : initialAnchorOptions;

    let cafeCandidates: Place[] = [];
    if (includeCafe) {
      const fixedCafePlaces = normalizedFixedPlaces.filter((p) => p.category === "CAFE");
      
      const cafePref = stepPreferences.find((s: any) => s.category === "CAFE") || {};
      const rawTheme = (cafePref.cafeDessert || "").trim();
      let searchTheme = "디저트 카페";
      if (rawTheme.includes("베이커리")) searchTheme = "베이커리 카페";
      else if (rawTheme.includes("조용")) searchTheme = "조용한 카페";
      else if (rawTheme.includes("감성")) searchTheme = "감성 카페";

      let results: Place[] = [];
      if (chainAnchor.lat && chainAnchor.lng) {
        results = await searchNearbyCategory("CE7", chainAnchor.lat, chainAnchor.lng, 2000, 15);
      }

      if (results.length < 3) {
        const kwResults = await searchKakaoPlaces(`${searchBaseLocation} ${searchTheme}`, { ...chainAnchor, count: 15 });
        results = [...results, ...kwResults];
      }

      if (results.length < 3) {
        const fallback = await searchKakaoPlaces(`${searchBaseLocation} 카페`, { ...chainAnchor, count: 15 });
        results = [...results, ...fallback];
      }

      const unique = Array.from(new Map(results.map((p) => [p.name, p])).values());
      cafeCandidates = [...fixedCafePlaces, ...shuffleArray(unique).slice(0, 6)];
    }

    let activityCandidates: Place[] = [];
    if (includeActivity) {
      const fixedActPlaces = normalizedFixedPlaces.filter((p) => p.category === "ACTIVITY");
      
      const actPref = stepPreferences.find((s: any) => s.category === "ACTIVITY") || {};
      const pace = actPref.activityPace || "액티비티";
      const env = actPref.activityEnvironment || "실내";

      const keywordMap: Record<string, string[]> = {
        "액티비티_실내": ["방탈출", "보드게임카페", "볼링장", "공방", "실내데이트"],
        "액티비티_야외": ["자전거대여", "테마파크", "공원"],
        "잔잔한 힐링_실내": ["소품샵", "독립서점", "미술관", "전시관", "공방"],
        "잔잔한 힐링_야외": ["수목원", "호수공원", "산책로"],
      };

      const key = `${pace}_${env}`;
      const targetKws = keywordMap[key] || ["소품샵", "공방", "전시관"];
      let collected: Place[] = [];

      for (const kw of targetKws.slice(0, 3)) {
        const raw = await searchKakaoPlaces(`${searchBaseLocation} ${kw}`, { count: 10, ...chainAnchor });
        collected = [...collected, ...raw];
        if (collected.length >= 8) break;
      }

      const actBanned = ["인테리어", "부동산", "철물", "설비", "샤시", "관리사무소", "주차장", "공업사", "스크린골프", "카페거리"];
      let valid = collected.filter((p) => !actBanned.some((bad) => (p.name || "").includes(bad)));

      if (valid.length < 3) {
        const fallback = await searchKakaoPlaces(`${searchBaseLocation} 소품샵 공방`, { ...chainAnchor, count: 12 });
        valid = [...valid, ...fallback];
      }

      const unique = Array.from(new Map(valid.map((p) => [p.name, p])).values());
      activityCandidates = [...fixedActPlaces, ...shuffleArray(unique).slice(0, 6)];
    }

    const allCandidates = [...allDiningCandidates, ...cafeCandidates, ...activityCandidates];

    if (allCandidates.length === 0) {
      return NextResponse.json({ error: "조건에 맞는 장소 검색 결과가 없습니다." }, { status: 400 });
    }

    let stepGuidelineLines: string[] = [];
    let stepCandidatesBlocks: string[] = [];

    upperCourseOrder.forEach((cat, idx) => {
      const stepNum = idx + 1;
      if (cat === "DINING") {
        const pref = stepPreferences[idx] || {};
        const cuisineName = pref.cuisine?.[0] || "식사";
        stepGuidelineLines.push(`   - ${stepNum}단계 [식사 - ${cuisineName}]: 반드시 아래 [${stepNum}단계 식사(${cuisineName}) 전용 후보군]에서 1곳 선택`);

        const placesForThisStep = stepDiningCandidatesMap[idx] || [];
        const placesText = placesForThisStep
          .map((c) => `  * [${c.name}] id: "${c.id}", 분류: "${c.subCategory}", 주소: "${c.address}"`)
          .join("\n");
        stepCandidatesBlocks.push(`[${stepNum}단계 식사(${cuisineName}) 전용 후보군]\n${placesText || "후보 없음"}`);
      } else if (cat === "CAFE") {
        stepGuidelineLines.push(`   - ${stepNum}단계 [카페]: 반드시 아래 [카페 전용 후보군]에서 1곳 선택`);
      } else {
        stepGuidelineLines.push(`   - ${stepNum}단계 [놀거리]: 반드시 아래 [놀거리 전용 후보군]에서 1곳 선택`);
      }
    });

    const cafeListText = cafeCandidates
      .map((c) => `  * [${c.name}] id: "${c.id}", 분류: "${c.subCategory}", 주소: "${c.address}"`)
      .join("\n");
    const activityListText = activityCandidates
      .map((c) => `  * [${c.name}] id: "${c.id}", 분류: "${c.subCategory}", 주소: "${c.address}"`)
      .join("\n");

    const savedPlacesGuide =
      savedPlaces.length > 0
        ? `- 사용자가 찜해둔 관심 장소 목록: [${savedPlaces.join(", ")}]\n- 해당 단계의 카테고리/취향에 부합하면서 찜 목록에 있는 장소가 후보에 있다면 우선 선정하세요.`
        : "";

    const prompt = `
당신은 한국의 실제 데이트 문화와 도보 동선, 시간 흐름을 정밀하게 설계하는 전문 데이트 코스 플래너입니다.

[약속 기본 정보]
- 만나는 위치: ${location || "선택한 약속 장소"}
- 첫 시작 시간: ${startTime}
- 구성할 코스 단계 순서 (${upperCourseOrder.length}단계):
${stepGuidelineLines.join("\n")}

${savedPlacesGuide}

[현실적인 시간 배분 절대 규칙 - 위반 금지!]
1. 1단계의 시작 시간은 반드시 사용자가 지정한 [${startTime}]입니다.
2. 각 장소마다 현실적인 체류 시간을 반영하여 다음 장소 시간을 계산하세요:
   - 식사(DINING): 약 1시간 20분 ~ 1시간 30분 소요
   - 카페(CAFE): 약 1시간 30분 ~ 2시간 소요
   - 놀거리(ACTIVITY): 약 1시간 30분 ~ 2시간 소요
3. [식사 ➔ 카페 ➔ 식사] 같은 일정인 경우:
   - 시작이 12:00경이면 1단계는 [점심 식사 (12:00)], 2단계는 [오후 카페/티타임 (13:40~14:00)], 3단계 식사는 3~4시가 아니라 반드시 [저녁 식사 시간대인 17:30 ~ 18:30]으로 배치해야 합니다!

[장소 선정 절대 규칙 - 위반 금지!]
1. 각 단계별로 지정된 전용 후보군에서만 정확히 1곳씩 선택해야 합니다.
   - 예: 1단계 식사가 중식이면 중식 전용 후보군에서만 선택, 3단계 식사가 고기/구이면 반드시 고기/구이 전용 후보군에서 선택!
   - 3단계 식사 자리에 1단계 중식을 재사용하거나 카페를 넣는 것을 엄격히 금지합니다.
2. 각 코스 항목은 서로 다른 장소여야 하며 장소 중복을 금지합니다.
3. placeId와 placeName은 제공된 목록의 문자열 그대로 입력하세요.
4. commentary는 시간대(점심 식사, 나른한 오후, 든든한 저녁 구이 등)에 어울리는 다정하고 감성적인 한 줄 코멘트를 작성하세요.

${stepCandidatesBlocks.join("\n\n")}

[카페 전용 후보군]
${cafeListText || "후보 없음"}

[놀거리 전용 후보군]
${activityListText || "후보 없음"}
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
                  required: ["order", "time", "placeId", "placeName", "category", "commentary"],
                },
              },
            },
            required: ["courseTitle", "summary", "steps"],
          },
        },
      });
    };

    let aiResult: any = null;
    try {
      const response = await callGeminiWithModel("gemini-2.5-flash");
      if (response?.text) {
        aiResult = JSON.parse(response.text);
      }
    } catch (err: any) {
      console.warn("Gemini 호출 실패, Fallback 가동:", err?.message);
    }

    if (!aiResult || !aiResult.steps || aiResult.steps.length === 0) {
      const [shStr, smStr] = startTime.split(":");
      let currentHour = parseInt(shStr, 10) || 12;
      let currentMin = parseInt(smStr, 10) || 0;

      let lastPlace: Place | null = null;
      const usedPlaceIds = new Set<string>();

      const fallbackSteps = upperCourseOrder.map((cat: string, idx: number) => {
        let pool: Place[] = [];
        let defaultCommentary = "";
        let durationMinutes = 90;

        if (cat === "DINING") {
          pool = stepDiningCandidatesMap[idx] || allDiningCandidates;
          const pref = stepPreferences[idx] || {};
          const cuisineName = pref.cuisine?.[0] || "식사";
          defaultCommentary = idx === 0 ? `맛있는 ${cuisineName} 식사로 기분 좋게 일정을 시작해보세요.` : `하루를 마무리하는 든든한 ${cuisineName} 시간입니다.`;
          durationMinutes = 90;
        } else if (cat === "CAFE") {
          pool = cafeCandidates;
          defaultCommentary = "향긋한 음료와 달콤한 디저트를 즐기며 편안한 대화를 나눠보세요.";
          durationMinutes = 120;
        } else {
          pool = activityCandidates;
          defaultCommentary = "특별한 공간에서 함께 시간을 보내며 추억을 쌓아보세요.";
          durationMinutes = 90;
        }

        let available = pool.filter((p) => !usedPlaceIds.has(String(p.id)));
        if (available.length === 0) available = pool;

        let selected = available[0] || allCandidates[0];
        if (lastPlace && lastPlace.lat && lastPlace.lng && available.length > 1) {
          const sorted = [...available].sort((a, b) => {
            const distA = calculateDistance(lastPlace!.lat, lastPlace!.lng, a.lat, a.lng);
            const distB = calculateDistance(lastPlace!.lat, lastPlace!.lng, b.lat, b.lng);
            return distA - distB;
          });
          selected = sorted[0];
        }

        usedPlaceIds.add(String(selected.id));
        lastPlace = selected;

        const timeStr = `${String(currentHour).padStart(2, "0")}:${String(currentMin).padStart(2, "0")}`;

        if (idx === 1 && upperCourseOrder[2] === "DINING" && currentHour < 17) {
          currentHour = 18;
          currentMin = 0;
        } else {
          currentMin += durationMinutes;
          while (currentMin >= 60) {
            currentMin -= 60;
            currentHour += 1;
          }
        }

        return {
          order: idx + 1,
          time: timeStr,
          placeId: String(selected.id),
          placeName: selected.name,
          category: selected.category,
          commentary: defaultCommentary,
        };
      });

      aiResult = {
        courseTitle: `${location || "맞춤"} 데이트 코스`,
        summary: "각 단계별 음식 취향과 이동 동선을 정밀하게 고려해 구성한 최적의 코스입니다.",
        steps: fallbackSteps,
      };
    }

    const finalSteps = (aiResult.steps || []).map((step: any, index: number) => {
      const placeDetail =
        allCandidates.find((p: Place) => String(p.id) === String(step.placeId)) || {
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
        const prevPlace = allCandidates.find((p: Place) => String(p.id) === String(prevStep.placeId));
        if (prevPlace && prevPlace.lat && prevPlace.lng && placeDetail.lat && placeDetail.lng) {
          const meters = calculateDistance(prevPlace.lat, prevPlace.lng, placeDetail.lat, placeDetail.lng);
          const walkMinutes = Math.max(1, Math.round(meters / 67));
          transitNote = `도보 약 ${walkMinutes}분 (${meters}m)`;
        }
      }

      const isFixed = normalizedFixedPlaces.some(
        (p: Place) => String(p.id) === String(placeDetail.id) || p.name === placeDetail.name
      );

      return {
        order: step.order,
        time: step.time,
        place: placeDetail,
        commentary: step.commentary,
        isFixed,
        transitNote,
      };
    });

    return NextResponse.json({
      courseTitle: aiResult.courseTitle,
      summary: aiResult.summary,
      steps: finalSteps,
    });
  } catch (error: any) {
    console.error("Course Route 에러:", error);
    return NextResponse.json({ error: error?.message || "서버 오류가 발생했습니다." }, { status: 500 });
  }
}