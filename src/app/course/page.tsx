"use client";

import React, { useState, useEffect } from "react";
import {
  ArrowLeft,
  Clock,
  MapPin,
  Sparkles,
  RotateCw,
  Share2,
  Utensils,
  Coffee,
  Footprints,
  Plus,
  Trash2,
  X,
  Search,
  ExternalLink,
  Navigation,
  Copy,
  Check,
  Heart,
} from "lucide-react";
import { Place } from "@/types/common";
import CourseMap from "@/components/CourseMap";

interface CourseStep {
  order: number;
  time: string;
  place: Place;
  commentary: string;
  isFixed?: boolean;
  transitNote?: string;
}

// 💡 코스 확정 & 공유 전용 모달 컴포넌트
function ShareCourseModal({
  isOpen,
  onClose,
  userCode,
  courseTitle,
  steps,
}: {
  isOpen: boolean;
  onClose: () => void;
  userCode: string;
  courseTitle: string;
  steps: CourseStep[];
}) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [savedToMap, setSavedToMap] = useState(false);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }
  }, []);

  if (!isOpen) return null;

  const shareUrl = origin ? `${origin}/course?code=${userCode}` : "";

  const handleCopySummary = async () => {
    const currentOrigin =
      origin || (typeof window !== "undefined" ? window.location.origin : "");
    const finalUrl = `${currentOrigin}/course?code=${userCode}`;

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
      `👉 함께 확인하기: ${finalUrl}`,
    ];

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(textLines.join("\n"));
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = textLines.join("\n");
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch (e) {
      alert("클립보드 복사 권한이 없습니다.");
    }
  };

  const handleSaveToSharedMap = () => {
    setSavedToMap(true);
    setTimeout(() => setSavedToMap(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between border-b pb-3">
          <div>
            <span className="text-[11px] font-bold text-rose-500 uppercase tracking-wider">
              Course Confirmed
            </span>
            <h3 className="text-lg font-extrabold text-neutral-900">
              데이트 코스 확정 & 공유
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full text-neutral-400 hover:bg-neutral-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="rounded-2xl bg-rose-50/70 border border-rose-100 p-4 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-rose-800">우리의 공유 코드</span>
            <span className="text-[10px] bg-rose-200 text-rose-700 px-2 py-0.5 rounded-full font-bold">
              실시간 연동
            </span>
          </div>
          <div className="flex items-center justify-between bg-white rounded-xl px-3.5 py-2.5 border border-rose-200">
            <span className="text-base font-mono font-black tracking-widest text-neutral-800">
              {userCode}
            </span>
            <span className="text-xs text-neutral-400">코드 입력 시 동시 확인</span>
          </div>
        </div>

        <div className="space-y-2.5">
          <button
            type="button"
            onClick={handleSaveToSharedMap}
            className={`flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-xs font-bold transition-all border active:scale-95 ${
              savedToMap
                ? "bg-rose-500 text-white border-rose-500"
                : "bg-white text-rose-600 border-rose-200 hover:bg-rose-50"
            }`}
          >
            <Heart
              className={`h-4 w-4 ${savedToMap ? "fill-white" : "fill-rose-500"}`}
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
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-neutral-950 py-3.5 text-xs font-bold text-white shadow-md hover:bg-neutral-800 transition-all active:scale-95"
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

function CoursePage() {
  const [mounted, setMounted] = useState(false);
  const [viewStep, setViewStep] = useState<"form" | "result">("form");
  const [loading, setLoading] = useState(false);

  // 기본 위치
  const [location, setLocation] = useState("성수동");

  // 코스 진행 순서 관리
  const [courseOrder, setCourseOrder] = useState<string[]>([
    "DINING",
    "CAFE",
    "ACTIVITY",
  ]);

  // 세부 취향 옵션 상태
  const [cuisine, setCuisine] = useState<string[]>(["한식"]);
  const [diningPref, setDiningPref] = useState<string>("밥");
  const [diningWaiting, setDiningWaiting] = useState<string>("웨이팅 없음");

  const [cafeType, setCafeType] = useState<string>("개인 카페");
  const [cafeDessert, setCafeDessert] = useState<string>("디저트 전문");

  const [activityPace, setActivityPace] = useState<string>("액티비티");
  const [activityEnvironment, setActivityEnvironment] = useState<string>("야외");

  // 사전 등록 장소 관리
  const [fixedPlaces, setFixedPlaces] = useState<Place[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [searchResults, setSearchResults] = useState<Place[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // AI 생성 결과 상태
  const [courseTitle, setCourseTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [generatedCourse, setGeneratedCourse] = useState<CourseStep[]>([]);

  // 공유 모달 상태
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [userCode] = useState("REWK33f");

  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleCourseCategory = (id: string) => {
    const targetId = id.toUpperCase();
    const exists = courseOrder.some((item) => item.toUpperCase() === targetId);

    if (exists) {
      if (courseOrder.length === 1) {
        alert("최소 하나의 코스 항목은 선택되어 있어야 합니다.");
        return;
      }
      setCourseOrder((prev) =>
        prev.filter((item) => item.toUpperCase() !== targetId)
      );
    } else {
      setCourseOrder((prev) => [...prev, targetId]);
    }
  };

  const handleSearchPlaces = async () => {
    if (!searchKeyword.trim()) return;
    setIsSearching(true);
    try {
      const res = await fetch(
        `/api/places/search?query=${encodeURIComponent(
          `${location} ${searchKeyword}`
        )}`
      );
      if (!res.ok) return;
      const data = await res.json();
      setSearchResults(data.places || []);
    } catch (err) {
      console.error("장소 검색 오류:", err);
      alert("장소 검색 중 오류가 발생했습니다.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddFixedPlace = (place: Place) => {
    if (fixedPlaces.some((p) => p.name === place.name)) {
      alert("이미 추가된 장소입니다.");
      return;
    }

    const rawCat = String(place.category || "").toUpperCase();
    let targetCat = "ACTIVITY";
    if (rawCat === "RESTAURANT" || rawCat === "DINING") {
      targetCat = "DINING";
    } else if (rawCat === "CAFE") {
      targetCat = "CAFE";
    } else {
      targetCat = "ACTIVITY";
    }

    setCourseOrder((prev) => {
      const alreadyIncluded = prev.some((c) => c.toUpperCase() === targetCat);
      if (alreadyIncluded) return prev;
      return [...prev, targetCat];
    });

    setFixedPlaces([...fixedPlaces, { ...place, category: targetCat as any }]);
    setIsModalOpen(false);
    setSearchKeyword("");
    setSearchResults([]);
  };

  const handleRemoveFixedPlace = (id: string) => {
    setFixedPlaces(fixedPlaces.filter((p) => p.id !== id));
  };

  const handleGenerateCourse = async () => {
    if (!location.trim()) {
      alert("만날 위치를 입력해주세요.");
      return;
    }
    if (courseOrder.length === 0) {
      alert("최소 하나의 코스 항목을 선택해주세요.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/course", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          location,
          courseOrder,
          cuisine,
          diningOption: diningPref,
          diningWaiting,
          cafeType,
          cafeDessert,
          activityPace,
          activityEnvironment,
          fixedPlaces,
        }),
      });

      if (!res.ok) {
        const rawText = await res.text();
        let errMsg = `서버 오류 (HTTP ${res.status})`;
        try {
          const parsed = JSON.parse(rawText);
          errMsg = parsed.error || errMsg;
        } catch {
          if (rawText) errMsg = rawText;
        }
        alert(`코스 생성 실패:\n${errMsg}`);
        return;
      }

      const data = await res.json();

      if (data.steps && data.steps.length > 0) {
        setCourseTitle(data.courseTitle || `${location} 데이트 코스`);
        setSummary(
          data.summary || "실제 장소 동선과 분위기를 고려해 완성된 추천 코스입니다."
        );
        setGeneratedCourse(data.steps);
        setViewStep("result");
      } else {
        alert("추천 장소를 찾지 못했습니다. 조건을 조금 변경해 보세요.");
      }
    } catch (error) {
      console.error("Course Generation Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryLabel = (category: any) => {
    const upper = String(category || "").toUpperCase();
    if (upper === "DINING" || upper === "RESTAURANT") return "식사";
    if (upper === "CAFE") return "카페";
    return "놀거리";
  };

  if (!mounted) {
    return (
      <main className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <p className="text-xs text-neutral-400">화면을 불러오는 중...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-50 pb-24">
      {/* 헤더 */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-white px-4">
        {viewStep === "result" ? (
          <button
            type="button"
            onClick={() => setViewStep("form")}
            className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-neutral-100 transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-neutral-800" />
          </button>
        ) : (
          <div className="w-10" />
        )}
        <h1 className="text-base font-bold text-neutral-900">
          {viewStep === "form" ? "데이트 코스 플래너" : "추천 데이트 코스"}
        </h1>
        <div className="w-10" />
      </header>

      {/* 1. 입력 폼 뷰 */}
      {viewStep === "form" && (
        <div className="mx-auto max-w-lg space-y-5 p-4">
          {/* 위치 입력 및 빠른 선택 칩 */}
          <section className="rounded-2xl border bg-white p-5 shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-rose-500 font-semibold">
              <MapPin className="h-4 w-4" />
              <span>어디서 만날까요?</span>
            </div>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="예: 성수동, 홍대, 공릉동"
              className="w-full rounded-xl border border-neutral-200 px-4 py-3 text-sm outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 transition-all"
            />
            {/* 💡 빠른 선택 칩 버튼 */}
            <div className="flex items-center gap-1.5 flex-wrap pt-1">
              <span className="text-[11px] font-medium text-neutral-400">추천:</span>
              {[
                { label: "성수동", value: "성수동" },
                { label: "홍대/연남", value: "연남동" },
                { label: "혜화 대학로", value: "혜화동" },
              ].map((spot) => (
                <button
                  key={spot.value}
                  type="button"
                  onClick={() => setLocation(spot.value)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all active:scale-95 ${
                    location === spot.value
                      ? "bg-rose-50 text-rose-600 border-rose-200 font-semibold"
                      : "bg-neutral-50 text-neutral-600 border-neutral-200 hover:bg-neutral-100"
                  }`}
                >
                  {spot.label}
                </button>
              ))}
            </div>
          </section>

          {/* 코스 순서 정하기 */}
          <section className="rounded-2xl border bg-white p-5 shadow-sm space-y-3">
            <div>
              <h3 className="text-sm font-bold text-neutral-900">코스 순서 정하기</h3>
              <p className="text-xs text-neutral-500 mt-0.5">
                클릭한 순서대로 데이트 동선이 짜여져요! (다시 누르면 제외돼요)
              </p>
            </div>

            <div className="flex gap-2">
              {[
                { id: "DINING", label: "식사", icon: Utensils },
                { id: "CAFE", label: "카페", icon: Coffee },
                { id: "ACTIVITY", label: "놀거리", icon: Footprints },
              ].map((item) => {
                const orderIndex = courseOrder.findIndex(
                  (cat) => cat.toUpperCase() === item.id.toUpperCase()
                );
                const isSelected = orderIndex !== -1;
                const IconComponent = item.icon;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => toggleCourseCategory(item.id)}
                    className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold border transition-all active:scale-95 ${
                      isSelected
                        ? "bg-neutral-900 text-white border-neutral-900 shadow-sm"
                        : "bg-white text-neutral-500 border-neutral-200 hover:bg-neutral-50"
                    }`}
                  >
                    {isSelected && (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-xs font-bold text-white">
                        {orderIndex + 1}
                      </span>
                    )}
                    <IconComponent className="h-4 w-4" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="rounded-xl bg-neutral-100 p-3 text-xs text-neutral-600 flex items-center gap-1.5 flex-wrap">
              <span className="font-semibold text-neutral-800">예정 코스:</span>
              {courseOrder.length > 0 ? (
                courseOrder.map((cat, idx) => {
                  const upper = cat.toUpperCase();
                  const label =
                    upper === "DINING"
                      ? "식사"
                      : upper === "CAFE"
                      ? "카페"
                      : "놀거리";
                  return (
                    <span key={`${cat}-${idx}`} className="flex items-center gap-1">
                      <span className="font-bold text-rose-600">
                        {idx + 1}. {label}
                      </span>
                      {idx < courseOrder.length - 1 && <span>→</span>}
                    </span>
                  );
                })
              ) : (
                <span className="text-rose-500 font-medium">
                  항목을 1개 이상 골라주세요
                </span>
              )}
            </div>
          </section>

          {/* 식사 취향 (옵션 분리 적용) */}
          {courseOrder.some((c) => c.toUpperCase() === "DINING") && (
            <section className="rounded-2xl border bg-white p-5 shadow-sm space-y-4">
              <div className="flex items-center gap-2 font-bold text-amber-700">
                <Utensils className="h-4 w-4" />
                <span>식사 취향</span>
              </div>
              
              {/* 음식 종류 */}
              <div className="space-y-2">
                <span className="text-xs text-neutral-500 font-medium">음식 종류</span>
                <div className="flex gap-2">
                  {["한식", "중식", "일식", "양식"].map((food) => (
                    <button
                      key={food}
                      type="button"
                      onClick={() => setCuisine([food])}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all active:scale-95 ${
                        cuisine.includes(food)
                          ? "bg-neutral-900 text-white border-neutral-900"
                          : "bg-white text-neutral-600 border-neutral-200"
                      }`}
                    >
                      {food}
                    </button>
                  ))}
                </div>
              </div>

              {/* 💡 분리 1: 선호 메뉴 */}
              <div className="space-y-2">
                <span className="text-xs text-neutral-500 font-medium">선호 메뉴</span>
                <div className="flex gap-2">
                  {["밥", "면", "기타"].map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setDiningPref(opt)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all active:scale-95 ${
                        diningPref === opt
                          ? "bg-neutral-900 text-white border-neutral-900"
                          : "bg-white text-neutral-600 border-neutral-200"
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              {/* 💡 분리 2: 웨이팅 성향 */}
              <div className="space-y-2">
                <span className="text-xs text-neutral-500 font-medium">웨이팅 성향</span>
                <div className="flex gap-2">
                  {["웨이팅 없음", "웨이팅 가능"].map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setDiningWaiting(opt)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all active:scale-95 ${
                        diningWaiting === opt
                          ? "bg-neutral-900 text-white border-neutral-900"
                          : "bg-white text-neutral-600 border-neutral-200"
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* 카페 취향 */}
          {courseOrder.some((c) => c.toUpperCase() === "CAFE") && (
            <section className="rounded-2xl border bg-white p-5 shadow-sm space-y-4">
              <div className="flex items-center gap-2 font-bold text-amber-800">
                <Coffee className="h-4 w-4" />
                <span>카페 취향</span>
              </div>
              <div className="space-y-2">
                <span className="text-xs text-neutral-500 font-medium">카페 유형</span>
                <div className="flex gap-2">
                  {["개인 카페", "대형/프랜차이즈"].map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setCafeType(type)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all active:scale-95 ${
                        cafeType === type
                          ? "bg-neutral-900 text-white border-neutral-900"
                          : "bg-white text-neutral-600 border-neutral-200"
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-xs text-neutral-500 font-medium">카페 테마 & 디저트</span>
                <div className="flex gap-2 flex-wrap">
                  {[
                    "디저트 전문",
                    "베이커리 카페",
                    "감성/분위기",
                    "조용한/대화",
                  ].map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setCafeDessert(option)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all active:scale-95 ${
                        cafeDessert === option
                          ? "bg-neutral-900 text-white border-neutral-900"
                          : "bg-white text-neutral-600 border-neutral-200"
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* 놀거리 취향 */}
          {courseOrder.some((c) => c.toUpperCase() === "ACTIVITY") && (
            <section className="rounded-2xl border bg-white p-5 shadow-sm space-y-4">
              <div className="flex items-center gap-2 font-bold text-indigo-600">
                <Sparkles className="h-4 w-4" />
                <span>놀거리 / 활동 취향</span>
              </div>
              <div className="space-y-2">
                <span className="text-xs text-neutral-500 font-medium">분위기</span>
                <div className="flex gap-2">
                  {["액티비티", "잔잔한 힐링"].map((pace) => (
                    <button
                      key={pace}
                      type="button"
                      onClick={() => setActivityPace(pace)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all active:scale-95 ${
                        activityPace === pace
                          ? "bg-neutral-900 text-white border-neutral-900"
                          : "bg-white text-neutral-600 border-neutral-200"
                      }`}
                    >
                      {pace}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <span className="text-xs text-neutral-500 font-medium">장소 환경</span>
                <div className="flex gap-2">
                  {["실내", "야외"].map((env) => (
                    <button
                      key={env}
                      type="button"
                      onClick={() => setActivityEnvironment(env)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all active:scale-95 ${
                        activityEnvironment === env
                          ? "bg-neutral-900 text-white border-neutral-900"
                          : "bg-white text-neutral-600 border-neutral-200"
                      }`}
                    >
                      {env}
                    </button>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* 사전 등록 장소 */}
          <section className="rounded-2xl border bg-white p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-rose-500">
                <MapPin className="h-4 w-4" />
                <span>미리 가기로 한 장소 (선택)</span>
              </div>
              <span className="text-xs text-neutral-400">도보 계산에 자동 반영돼요</span>
            </div>

            {fixedPlaces.length > 0 && (
              <div className="space-y-2">
                {fixedPlaces.map((place) => (
                  <div
                    key={place.id}
                    className="flex items-center justify-between rounded-xl border border-neutral-200 bg-neutral-50 p-3"
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-bold text-neutral-900">
                          {place.name}
                        </p>
                        <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-semibold text-rose-600">
                          {getCategoryLabel(place.category)}
                        </span>
                      </div>
                      <p className="text-xs text-neutral-500 truncate max-w-[240px]">
                        {place.address}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveFixedPlace(place.id)}
                      className="p-1 text-neutral-400 hover:text-rose-500 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-neutral-300 py-3 text-sm font-semibold text-neutral-600 hover:border-neutral-400 hover:bg-neutral-50 transition-all active:scale-95"
            >
              <Plus className="h-4 w-4" />
              <span>가고 싶은 장소 미리 등록하기</span>
            </button>
          </section>

          {/* 하단 생성 버튼 */}
          <div className="sticky bottom-4 pt-2">
            <button
              type="button"
              onClick={handleGenerateCourse}
              disabled={loading}
              className="w-full rounded-2xl bg-neutral-950 py-4 font-bold text-white shadow-lg transition-transform active:scale-[0.98] disabled:opacity-50"
            >
              {loading
                ? "AI가 동선과 도보시간을 계산 중..."
                : "데이트 코스 만들기"}
            </button>
          </div>
        </div>
      )}

      {/* 2. 코스 결과 타임라인 뷰 */}
      {viewStep === "result" && (
        <div className="mx-auto max-w-lg p-4 space-y-4">
          <div className="rounded-2xl border border-rose-100 bg-rose-50/60 p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold tracking-wider text-rose-600">
                AI RECOMMENDED
              </span>
              <span className="rounded-full bg-white px-2.5 py-0.5 text-xs font-semibold text-neutral-600 shadow-sm">
                총 {generatedCourse.length}개 장소
              </span>
            </div>
            <h2 className="mt-2 text-xl font-black text-neutral-900">
              {courseTitle}
            </h2>
            <p className="mt-1 text-xs text-neutral-600">{summary}</p>
          </div>

          <CourseMap steps={generatedCourse} />

          <div className="space-y-4">
            {generatedCourse.map((step, idx) => {
              const kakaoMapUrl =
                step.place.placeUrl ||
                `https://map.kakao.com/link/search/${encodeURIComponent(
                  step.place.name
                )}`;
              const kakaoNaviUrl = `https://map.kakao.com/link/to/${encodeURIComponent(
                step.place.name
              )},${step.place.lat},${step.place.lng}`;

              return (
                <div key={idx} className="relative">
                  {step.transitNote && (
                    <div className="my-2 flex items-center gap-1.5 px-6 text-xs font-medium text-neutral-500">
                      <span className="inline-block h-4 w-4 rounded-full border border-neutral-300 text-center leading-3 text-[10px]">
                        ↳
                      </span>
                      <span className="font-semibold text-neutral-700">
                        {step.transitNote}
                      </span>
                    </div>
                  )}

                  <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between text-xs text-neutral-500">
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" />
                        <span>{step.time}</span>
                      </div>
                      <span className="rounded-md bg-neutral-100 px-2 py-0.5 font-medium text-neutral-700">
                        {step.place.subCategory ||
                          getCategoryLabel(step.place.category)}
                      </span>
                    </div>

                    <div className="mt-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-neutral-900 text-[11px] font-bold text-white">
                          {idx + 1}
                        </span>
                        <h3 className="text-base font-bold text-neutral-900">
                          {step.place.name}
                        </h3>
                        {step.isFixed && (
                          <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-600">
                            내가 고른 장소
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="mt-1 flex items-center gap-1 text-xs text-neutral-500">
                      <MapPin className="h-3 w-3 shrink-0" />
                      <span className="truncate">{step.place.address}</span>
                    </div>

                    <div className="mt-3 rounded-xl bg-rose-50/70 p-3 text-xs leading-relaxed text-rose-950 border border-rose-100/60">
                      💡 {step.commentary}
                    </div>

                    <div className="mt-4 flex gap-2 border-t border-neutral-100 pt-3">
                      <a
                        href={kakaoMapUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-neutral-200 bg-white py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        장소 정보
                      </a>
                      <a
                        href={kakaoNaviUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-neutral-900 py-2 text-xs font-semibold text-white hover:bg-neutral-800 transition-colors"
                      >
                        <Navigation className="h-3.5 w-3.5" />
                        길찾기
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => setViewStep("form")}
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-neutral-300 bg-white py-3.5 text-sm font-bold text-neutral-700 hover:bg-neutral-50 transition-all active:scale-95"
            >
              <RotateCw className="h-4 w-4" />
              다시 추천받기
            </button>
            <button
              type="button"
              onClick={() => setIsShareModalOpen(true)}
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-neutral-950 py-3.5 text-sm font-bold text-white shadow-md hover:bg-neutral-800 transition-all active:scale-95"
            >
              <Share2 className="h-4 w-4" />
              코스 확정 & 공유하기
            </button>
          </div>
        </div>
      )}

      {/* 장소 등록 모달 */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b">
              <h3 className="text-base font-bold text-neutral-900">
                가고 싶은 장소 등록
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 flex gap-2">
              <input
                type="text"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSearchPlaces();
                  }
                }}
                placeholder={`${location}에 있는 상호명/장소명 입력`}
                className="flex-1 rounded-xl border border-neutral-200 px-4 py-2.5 text-sm outline-none focus:border-neutral-900"
              />
              <button
                type="button"
                onClick={handleSearchPlaces}
                className="rounded-xl bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-neutral-800 transition-colors"
              >
                <Search className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 max-h-60 overflow-y-auto space-y-2">
              {isSearching ? (
                <p className="py-6 text-center text-xs text-neutral-400">
                  카카오 지도에서 위치를 찾는 중...
                </p>
              ) : searchResults.length > 0 ? (
                searchResults.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => handleAddFixedPlace(p)}
                    className="flex cursor-pointer flex-col rounded-xl border border-neutral-100 p-3 transition-colors hover:bg-rose-50/50 hover:border-rose-200"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-neutral-900">
                        {p.name}
                      </span>
                      <span className="text-[10px] rounded bg-neutral-100 px-1.5 py-0.5 text-neutral-600">
                        {getCategoryLabel(p.category)}
                      </span>
                    </div>
                    <span className="text-xs text-neutral-500 mt-0.5">
                      {p.address}
                    </span>
                  </div>
                ))
              ) : (
                <p className="py-6 text-center text-xs text-neutral-400">
                  원하는 장소를 검색한 후 클릭해 선택하세요.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 공유 모달 */}
      {isShareModalOpen && (
        <ShareCourseModal
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          userCode={userCode}
          courseTitle={courseTitle}
          steps={generatedCourse}
        />
      )}
    </main>
  );
}

export default CoursePage;