import { NextResponse } from "next/server";
import { Place } from "@/types/common";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("query");

  if (!query) {
    return NextResponse.json({ places: [] });
  }

  const kakaoApiKey = process.env.KAKAO_REST_API_KEY;
  if (!kakaoApiKey) {
    return NextResponse.json({ error: "KAKAO_REST_API_KEY 누락" }, { status: 500 });
  }

  try {
    const res = await fetch(
      `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(query)}&size=8`,
      {
        headers: { Authorization: `KakaoAK ${kakaoApiKey}` },
      }
    );

    if (!res.ok) {
      return NextResponse.json({ error: "카카오 API 오류" }, { status: res.status });
    }

    const data = await res.json();
    const places: Place[] = (data.documents || []).map((doc: any) => {
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
      };
    });

    return NextResponse.json({ places });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}