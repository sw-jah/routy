"use client";

import { useState } from "react";
import { X, Copy, Check, Heart } from "lucide-react";

interface PlaceInfo {
  name: string;
  address: string;
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

  const shareUrl = typeof window !== "undefined" 
    ? `${window.location.origin}/course?code=${userCode}` 
    : "";

  // 카카오톡/메신저 전송용 텍스트 복사
  const handleCopySummary = async () => {
    const textLines = [
      `💌 [${courseTitle}] 데이트 코스가 확정되었어요!`,
      `공유 코드: ${userCode}`,
      `-----------------------`,
      ...steps.map((s) => `${s.order}. [${s.time}] ${s.place.name}${s.transitNote ? ` (${s.transitNote})` : ""}`),
      `-----------------------`,
      `👉 함께 확인하기: ${shareUrl}`,
    ];

    await navigator.clipboard.writeText(textLines.join("\n"));
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // 팀원의 지도 하트 연동 트리거
  const handleSaveToSharedMap = () => {
    // TODO: 팀원의 공유 지도 API 또는 localStorage 동기화
    setSavedToMap(true);
    setTimeout(() => setSavedToMap(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
        
        {/* 모달 헤더 */}
        <div className="flex items-center justify-between border-b pb-3">
          <div>
            <span className="text-[11px] font-bold text-rose-500 uppercase tracking-wider">Course Confirmed</span>
            <h3 className="text-lg font-extrabold text-neutral-900">데이트 코스 확정 & 공유</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-full text-neutral-400 hover:bg-neutral-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 고유 공유 코드 카드 */}
        <div className="rounded-2xl bg-rose-50/70 border border-rose-100 p-4 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-rose-800">우리의 공유 코드</span>
            <span className="text-[10px] bg-rose-200 text-rose-700 px-2 py-0.5 rounded-full font-bold">실시간 연동</span>
          </div>
          <div className="flex items-center justify-between bg-white rounded-xl px-3.5 py-2.5 border border-rose-200">
            <span className="text-base font-mono font-black tracking-widest text-neutral-800">{userCode}</span>
            <span className="text-xs text-neutral-400">코드 입력 시 동시 확인</span>
          </div>
        </div>

        {/* 액션 버튼 */}
        <div className="space-y-2.5">
          <button
            type="button"
            onClick={handleSaveToSharedMap}
            className={`flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-xs font-bold transition-all border ${
              savedToMap
                ? "bg-rose-500 text-white border-rose-500"
                : "bg-white text-rose-600 border-rose-200 hover:bg-rose-50"
            }`}
          >
            <Heart className={`h-4 w-4 ${savedToMap ? "fill-white" : "fill-rose-500"}`} />
            <span>{savedToMap ? "공유 지도에 하트 등록 완료!" : "공유 지도에 확정 장소들(하트) 등록"}</span>
          </button>

          <button
            type="button"
            onClick={handleCopySummary}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-neutral-950 py-3.5 text-xs font-bold text-white shadow-md hover:bg-neutral-800"
          >
            {copiedLink ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
            <span>{copiedLink ? "요약 텍스트와 링크가 복사되었어요!" : "카카오톡 공유 텍스트 & 링크 복사"}</span>
          </button>
        </div>

        <p className="text-center text-[11px] text-neutral-400">
          상대방이 공유 코드를 등록하면 동일한 동선과 장소를 확인할 수 있어요.
        </p>
      </div>
    </div>
  );
}