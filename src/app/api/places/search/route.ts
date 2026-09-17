import { NextResponse } from "next/server";
import type { Place } from "@/types/common";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("query");

  if (!query?.trim()) {
    return NextResponse.json({ places: [] });
  }

  const kakaoApiKey = process.env.KAKAO_REST_API_KEY;

  if (!kakaoApiKey) {
    return NextResponse.json(
      { error: "KAKAO_REST_API_KEY 누락" },
      { status: 500 }
    );
  }

  try {
    const cleanQuery = query.trim();

    // 💡 특정 지역(서울 등) 좌표나 반경 제한 없이 전국 단위로 검색
    const params = new URLSearchParams({
      query: cleanQuery,
      size: "8",
    });

    const res = await fetch(
      `https://dapi.kakao.com/v2/local/search/keyword.json?${params.toString()}`,
      {
        headers: {
          Authorization: `KakaoAK ${kakaoApiKey}`,
        },
      }
    );

    if (!res.ok) {
      return NextResponse.json(
        { error: "카카오 API 오류" },
        { status: res.status }
      );
    }

    const data = await res.json();

    const places: Place[] = (data.documents || []).map((doc: any) => {
      const catGroup = doc.category_group_code;
      const catName = doc.category_name || "";
      const placeName = doc.place_name || "";

      let category: Place["category"] = "ACTIVITY";

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
        address: doc.road_address_name || doc.address_name || "",
        lat: parseFloat(doc.y),
        lng: parseFloat(doc.x),
        placeUrl:
          doc.place_url ||
          `https://map.kakao.com/link/search/${encodeURIComponent(placeName)}`,
      };
    });

    return NextResponse.json({ places });
  } catch (error: any) {
    console.error("장소 검색 오류:", error);

    return NextResponse.json(
      {
        error:
          error?.message ||
          "장소 검색 중 오류가 발생했습니다.",
      },
      { status: 500 }
    );
  }
}