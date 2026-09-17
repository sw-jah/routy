"use client";

import { useState } from "react";
import { X, Copy, Check, Heart } from "lucide-react";

interface PlaceInfo {
  id?: string;
  name: string;
  address: string;
  lat?: number;
  lng?: number;
  category?: string;
  subCategory?: string;
  imageUrl?: string;
  placeUrl?: string;
}

interface StepInfo {
  order: number;
  time: string;
  place: PlaceInfo;
  transitNote?: string;
}

interface ShareCourseModalProps {
  isOpen: boolean;
  onClose: () => void;
  userCode: string;
  courseTitle: string;
  steps: StepInfo[];
}

const ROOMS_STORAGE_KEY = "routy_rooms_v2";

export default function ShareCourseModal({
  isOpen,
  onClose,
  userCode,
  courseTitle,
  steps,
}: ShareCourseModalProps) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [savedToMap, setSavedToMap] = useState(false);

  if (!isOpen) return null;

  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/course?code=${userCode}`
      : "";

  // 카카오톡/메신저 전송용 텍스트 복사
  const handleCopySummary = async () => {
    try {
      const textLines = [
        `💌 [${courseTitle}] 데이트 코스가 확정되었어요!`,
        `공유 코드: ${userCode}`,
        `-----------------------`,
        ...steps.map(
          (s) =>
            `${s.order}. [${s.time}] ${s.place.name}${
              s.transitNote ? ` (${s.transitNote})` : ""
            }`
        ),
        `-----------------------`,
        `👉 함께 확인하기: ${shareUrl}`,
      ];

      await navigator.clipboard.writeText(textLines.join("\n"));

      setCopiedLink(true);

      setTimeout(() => {
        setCopiedLink(false);
      }, 2000);
    } catch (error) {
      console.error("공유 텍스트 복사 오류:", error);
      alert("텍스트를 복사하지 못했습니다.");
    }
  };

  // 현재 참여 중인 공유 지도에 확정 장소들을 저장
  const handleSaveToSharedMap = () => {
    if (typeof window === "undefined") return;

    if (!userCode) {
      alert(
        "현재 참여 중인 공유 지도가 없습니다.\n먼저 지도에서 공유 방을 만들어 주세요."
      );
      return;
    }

    try {
      const saved = localStorage.getItem(ROOMS_STORAGE_KEY);

      const allRooms = saved ? JSON.parse(saved) : [];

      const roomIndex = allRooms.findIndex(
        (room: any) => room.code === userCode
      );

      if (roomIndex === -1) {
        alert("현재 공유 지도 방을 찾을 수 없습니다.");
        return;
      }

      const room = allRooms[roomIndex];

      const existingPlaceIds = new Set(
        (room.places || []).map((place: any) => String(place.id))
      );

      const newPlaces = steps
        .filter((step) => step.place)
        .map((step) => step.place)
        .filter((place) => place.id)
        .filter((place) => !existingPlaceIds.has(String(place.id)))
        .map((place) => ({
          id: String(place.id),
          name: place.name,
          category:
            place.category === "RESTAURANT" ||
            place.category === "CAFE" ||
            place.category === "ACTIVITY" ||
            place.category === "DINING"
              ? place.category
              : "ACTIVITY",
          subCategory: place.subCategory,
          address: place.address || "",
          lat: Number(place.lat) || 0,
          lng: Number(place.lng) || 0,
          imageUrl: place.imageUrl,
          placeUrl: place.placeUrl,
          isVisited: true,
          group: "기본 그룹",
        }));

      if (newPlaces.length === 0) {
        setSavedToMap(true);

        setTimeout(() => {
          setSavedToMap(false);
        }, 2500);

        return;
      }

      allRooms[roomIndex] = {
        ...room,
        places: [...newPlaces, ...(room.places || [])],
        updatedAt: Date.now(),
      };

      localStorage.setItem(
        ROOMS_STORAGE_KEY,
        JSON.stringify(allRooms)
      );

      setSavedToMap(true);

      setTimeout(() => {
        setSavedToMap(false);
      }, 2500);
    } catch (error) {
      console.error("공유 지도 저장 오류:", error);
      alert("공유 지도에 장소를 저장하지 못했습니다.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm sm:items-center">
      <div className="w-full max-w-md space-y-5 rounded-3xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* 모달 헤더 */}
        <div className="flex items-center justify-between border-b pb-3">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-500">
              Course Confirmed
            </span>

            <h3 className="text-lg font-extrabold text-neutral-900">
              데이트 코스 확정 & 공유
            </h3>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-neutral-400 hover:bg-neutral-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 고유 공유 코드 카드 */}
        <div className="space-y-2 rounded-2xl border border-rose-100 bg-rose-50/70 p-4">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-rose-800">
              우리의 공유 코드
            </span>

            <span className="rounded-full bg-rose-200 px-2 py-0.5 text-[10px] font-bold text-rose-700">
              실시간 연동
            </span>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-rose-200 bg-white px-3.5 py-2.5">
            <span className="font-mono text-base font-black tracking-widest text-neutral-800">
              {userCode || "공유 지도 없음"}
            </span>

            <span className="text-xs text-neutral-400">
              {userCode
                ? "현재 공유 지도와 연결됨"
                : "먼저 공유 지도를 만들어 주세요"}
            </span>
          </div>
        </div>

        {/* 확정 코스 미리보기 */}
        {steps.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-bold text-neutral-700">
              확정된 장소
            </p>

            <div className="max-h-40 space-y-1.5 overflow-y-auto rounded-2xl bg-neutral-50 p-3">
              {steps.map((step) => (
                <div
                  key={`${step.order}-${step.place.name}`}
                  className="flex items-center gap-2 text-xs"
                >
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-rose-100 text-[10px] font-bold text-rose-600">
                    {step.order}
                  </span>

                  <span className="shrink-0 text-neutral-400">
                    {step.time}
                  </span>

                  <span className="truncate font-semibold text-neutral-700">
                    {step.place.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 액션 버튼 */}
        <div className="space-y-2.5">
          <button
            type="button"
            onClick={handleSaveToSharedMap}
            className={`flex w-full items-center justify-center gap-2 rounded-2xl border py-3.5 text-xs font-bold transition-all ${
              savedToMap
                ? "border-rose-500 bg-rose-500 text-white"
                : "border-rose-200 bg-white text-rose-600 hover:bg-rose-50"
            }`}
          >
            <Heart
              className={`h-4 w-4 ${
                savedToMap ? "fill-white" : "fill-rose-500"
              }`}
            />

            <span>
              {savedToMap
                ? "공유 지도에 하트 등록 완료!"
                : "공유 지도에 확정 장소들(하트) 등록"}
            </span>
          </button>

          <button
            type="button"
            onClick={handleCopySummary}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-neutral-950 py-3.5 text-xs font-bold text-white shadow-md transition-all hover:bg-neutral-800 active:scale-95"
          >
            {copiedLink ? (
              <Check className="h-4 w-4 text-emerald-400" />
            ) : (
              <Copy className="h-4 w-4" />
            )}

            <span>
              {copiedLink
                ? "요약 텍스트와 링크가 복사되었어요!"
                : "카카오톡 공유 텍스트 & 링크 복사"}
            </span>
          </button>
        </div>

        <p className="text-center text-[11px] text-neutral-400">
          상대방이 공유 코드를 등록하면 동일한 동선과 장소를 확인할 수 있어요.
        </p>
      </div>
    </div>
  );
}