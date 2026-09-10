"use client";

import { useEffect, useRef, useState } from "react";
import { Place } from "@/types/common";

interface CourseStep {
  order: number;
  time: string;
  place: Place;
}

interface CourseMapProps {
  steps: CourseStep[];
}

declare global {
  interface Window {
    kakao: any;
  }
}

export default function CourseMap({ steps }: CourseMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const kakaoKey = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY;
    
    // 1. 환경변수 미주입 체크
    if (!kakaoKey) {
      const err = "NEXT_PUBLIC_KAKAO_MAP_KEY 환경변수를 찾을 수 없습니다. (.env.local 수정 후 npm run dev 재시작 필요)";
      console.error(err);
      setErrorMsg(err);
      return;
    }

    const renderMap = () => {
      if (!mapRef.current || steps.length === 0) return;

      try {
        const validSteps = steps.filter(
          (s) => s.place.lat && s.place.lng && s.place.lat > 0 && s.place.lng > 0
        );

        if (validSteps.length === 0) {
          setErrorMsg("표시할 수 있는 유효한 장소 좌표가 없습니다.");
          return;
        }

        const firstPos = new window.kakao.maps.LatLng(
          validSteps[0].place.lat,
          validSteps[0].place.lng
        );

        const map = new window.kakao.maps.Map(mapRef.current, {
          center: firstPos,
          level: 4,
        });

        const bounds = new window.kakao.maps.LatLngBounds();
        const linePath: any[] = [];

        validSteps.forEach((step, index) => {
          const position = new window.kakao.maps.LatLng(step.place.lat, step.place.lng);
          bounds.extend(position);
          linePath.push(position);

          const content = document.createElement("div");
          content.innerHTML = `
            <div style="
              display: flex;
              align-items: center;
              justify-content: center;
              width: 32px;
              height: 32px;
              background-color: #171717;
              color: #ffffff;
              border-radius: 9999px;
              border: 2px solid #ffffff;
              box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3);
              font-size: 13px;
              font-weight: 700;
            ">
              ${index + 1}
            </div>
          `;

          new window.kakao.maps.CustomOverlay({
            map: map,
            position: position,
            content: content,
            yAnchor: 0.5,
            xAnchor: 0.5,
          });
        });

        if (linePath.length > 1) {
          const polyline = new window.kakao.maps.Polyline({
            map: map,
            path: linePath,
            strokeWeight: 4,
            strokeColor: "#e11d48",
            strokeOpacity: 0.85,
            strokeStyle: "shortdash",
          });
          polyline.setMap(map);
        }

        map.setBounds(bounds);
        setMapLoaded(true);
      } catch (err: any) {
        console.error("카카오 맵 렌더링 에러:", err);
        setErrorMsg(`지도 생성 오류: ${err?.message || err}`);
      }
    };

    const startLoadingMap = () => {
      if (window.kakao && window.kakao.maps) {
        window.kakao.maps.load(() => {
          renderMap();
        });
      }
    };

    // 2. 이미 window.kakao 객체가 로드되어 있는 경우
    if (window.kakao && window.kakao.maps) {
      startLoadingMap();
      return;
    }

    // 3. 스크립트 동적 주입
    const scriptId = "kakao-map-script";
    let script = document.getElementById(scriptId) as HTMLScriptElement;

    if (!script) {
      script = document.createElement("script");
      script.id = scriptId;
      script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${kakaoKey}&autoload=false`;
      script.async = true;

      script.referrerPolicy = "origin";

      script.onload = () => {
        console.log("✅ 카카오 맵 SDK 스크립트 로드 완료");
        startLoadingMap();
      };

      script.onerror = (e) => {
        const msg = "카카오 맵 SDK 스크립트 다운로드 실패 (키 또는 도메인 허용 상태를 확인하세요)";
        console.error(msg, e);
        setErrorMsg(msg);
      };

      document.head.appendChild(script);
    } else {
      // 기존 스크립트가 이미 문서에 붙어있는 경우
      script.addEventListener("load", () => {
        startLoadingMap();
      });
    }
  }, [steps]);

  return (
    <div className="relative w-full overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
      <div ref={mapRef} className="h-64 w-full bg-neutral-100" />
      
      {!mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-neutral-100 p-4 text-center text-xs text-neutral-500">
          {errorMsg ? (
            <span className="text-rose-500 font-medium whitespace-pre-line">{errorMsg}</span>
          ) : (
            "지도를 불러오는 중..."
          )}
        </div>
      )}

      <div className="absolute top-3 left-3 z-10 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-bold text-neutral-800 shadow backdrop-blur-sm">
        🗺️ 추천 동선 지도
      </div>
    </div>
  );
}