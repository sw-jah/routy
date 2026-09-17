"use client";

import { useEffect, useRef, useState } from "react";
import type { Place } from "@/types/common";

interface CourseStep {
  order: number;
  time: string;
  place: Place;
}

interface CourseMapProps {
  steps: CourseStep[];
}

export default function CourseMap({ steps }: CourseMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const polylineRef = useRef<any>(null);
  const overlaysRef = useRef<any[]>([]);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const kakaoKey = process.env.NEXT_PUBLIC_KAKAO_MAP_API_KEY;

    if (!kakaoKey) {
      const err =
        "NEXT_PUBLIC_KAKAO_MAP_API_KEY 환경변수를 찾을 수 없습니다. .env.local을 확인한 뒤 npm run dev를 재시작해주세요.";
      console.error(err);
      setErrorMsg(err);
      return;
    }

    const clearMapObjects = () => {
      overlaysRef.current.forEach((overlay) => overlay.setMap(null));
      overlaysRef.current = [];

      if (polylineRef.current) {
        polylineRef.current.setMap(null);
        polylineRef.current = null;
      }
    };

    const renderMap = () => {
      if (!mapRef.current) return;

      const validSteps = steps.filter(
        (step) =>
          Number.isFinite(step.place.lat) &&
          Number.isFinite(step.place.lng) &&
          step.place.lat > 0 &&
          step.place.lng > 0
      );

      if (validSteps.length === 0) {
        setMapLoaded(false);
        setErrorMsg("표시할 수 있는 유효한 장소 좌표가 없습니다.");
        return;
      }

      try {
        clearMapObjects();

        const firstPosition = new window.kakao.maps.LatLng(
          validSteps[0].place.lat,
          validSteps[0].place.lng
        );

        const map = new window.kakao.maps.Map(mapRef.current, {
          center: firstPosition,
          level: 4,
        });

        mapInstanceRef.current = map;

        const bounds = new window.kakao.maps.LatLngBounds();
        const linePath: any[] = [];

        validSteps.forEach((step, index) => {
          const position = new window.kakao.maps.LatLng(
            step.place.lat,
            step.place.lng
          );

          bounds.extend(position);
          linePath.push(position);

          const content = document.createElement("div");
          content.innerHTML = `
            <div style="
              display:flex;
              align-items:center;
              justify-content:center;
              width:32px;
              height:32px;
              background:#2D241E;
              color:#fff;
              border-radius:9999px;
              border:2px solid #fff;
              box-shadow:0 4px 8px rgba(45,36,30,.28);
              font-size:13px;
              font-weight:700;
            ">
              ${index + 1}
            </div>
          `;

          const overlay = new window.kakao.maps.CustomOverlay({
            map,
            position,
            content,
            yAnchor: 0.5,
            xAnchor: 0.5,
          });

          overlaysRef.current.push(overlay);
        });

        if (linePath.length > 1) {
          polylineRef.current = new window.kakao.maps.Polyline({
            map,
            path: linePath,
            strokeWeight: 4,
            strokeColor: "#C25E3E",
            strokeOpacity: 0.8,
            strokeStyle: "shortdash",
          });
        }

        if (validSteps.length > 1) {
          map.setBounds(bounds, 50, 50, 50, 50);
        } else {
          map.setCenter(firstPosition);
          map.setLevel(4);
        }

        setErrorMsg(null);
        setMapLoaded(true);
      } catch (error: any) {
        console.error("카카오 맵 렌더링 에러:", error);
        setMapLoaded(false);
        setErrorMsg(
          `지도 생성 오류: ${error?.message || "알 수 없는 오류"}`
        );
      }
    };

    const loadKakaoMap = () => {
      if (!window.kakao?.maps) return;

      window.kakao.maps.load(() => {
        renderMap();
      });
    };

    const existingScript = document.getElementById(
      "kakao-course-map-script"
    ) as HTMLScriptElement | null;

    if (window.kakao?.maps) {
      loadKakaoMap();
      return clearMapObjects;
    }

    let script = existingScript;

    if (!script) {
      script = document.createElement("script");
      script.id = "kakao-course-map-script";
      script.src =
        `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(
          kakaoKey
        )}&autoload=false`;
      script.async = true;
      script.referrerPolicy = "origin";

      script.onload = loadKakaoMap;
      script.onerror = () => {
        const msg =
          "카카오 맵 SDK를 불러오지 못했습니다. API 키와 카카오 개발자 콘솔의 웹 도메인 허용 설정을 확인해주세요.";
        console.error(msg);
        setErrorMsg(msg);
      };

      document.head.appendChild(script);
    } else {
      script.addEventListener("load", loadKakaoMap, { once: true });
    }

    return clearMapObjects;
  }, [steps]);

  return (
    <div className="relative w-full overflow-hidden rounded-2xl border border-[#EADFCF] bg-white shadow-sm">
      <div ref={mapRef} className="h-64 w-full bg-[#F4EEE7]" />

      {!mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#F4EEE7] p-4 text-center text-xs text-[#8C7A6B]">
          {errorMsg ? (
            <span className="font-medium whitespace-pre-line text-[#C25E3E]">
              {errorMsg}
            </span>
          ) : (
            "지도를 불러오는 중..."
          )}
        </div>
      )}

      <div className="absolute left-3 top-3 z-10 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-bold text-[#2D241E] shadow backdrop-blur-sm">
        🗺️ 추천 동선 지도
      </div>
    </div>
  );
}
