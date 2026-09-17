"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Clock,
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
  Copy,
  Check,
  Heart,
  FolderCheck,
  ChevronRight,
  Folder,
  Download,
  Image as ImageIcon,
  RefreshCw,
} from "lucide-react";
import type { Place, SavedCoursePlan, CourseStepItem } from "@/types/common";
import CourseMap from "@/components/CourseMap";
import { getCurrentUser } from "@/lib/authMock";

export interface StepPreference {
  id: string;
  category: "DINING" | "CAFE" | "ACTIVITY";
  cuisine?: string[];
  diningPref?: string;
  diningWaiting?: string;
  cafeType?: string;
  cafeDessert?: string;
  activityPace?: string;
  activityEnvironment?: string;
}

export interface FixedPlaceItem extends Place {
  targetStepIndex: number;
}

function getDistrictBadge(address?: string): string {
  if (!address) return "";
  const parts = address.trim().split(" ");
  if (parts.length >= 2) {
    return `${parts[0]} ${parts[1]}`;
  }
  return parts[0] || "";
}

function AlertModal({
  isOpen,
  onClose,
  title = "안내",
  message,
  emoji = "💡",
}: {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message: string;
  emoji?: string;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[#2D241E]/60 p-4 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-xs rounded-[28px] bg-[#FAF7F2] p-6 shadow-2xl border-2 border-[#EADFCF] flex flex-col items-center gap-3 text-center animate-in zoom-in-95 duration-150">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white border border-[#EADFCF] text-2xl shadow-2xs">
          {emoji}
        </div>
        <div>
          <h3 className="font-title text-base text-[#2D241E]">{title}</h3>
          <p className="font-body text-xs text-[#8C7A6B] mt-1.5 leading-relaxed break-keep whitespace-pre-line">
            {message}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="font-title w-full mt-1 py-2.5 bg-[#2D241E] hover:bg-[#43362E] active:scale-95 text-[#F3D5B5] text-xs rounded-xl transition shadow-xs"
        >
          확인
        </button>
      </div>
    </div>
  );
}

function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = "확인",
  message,
  confirmText = "확인",
  cancelText = "취소",
  emoji = "⚠️",
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  emoji?: string;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[#2D241E]/60 p-4 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-xs rounded-[28px] bg-[#FAF7F2] p-6 shadow-2xl border-2 border-[#EADFCF] flex flex-col items-center gap-3 text-center animate-in zoom-in-95 duration-150">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white border border-[#EADFCF] text-2xl shadow-2xs">
          {emoji}
        </div>
        <div>
          <h3 className="font-title text-base text-[#2D241E]">{title}</h3>
          <p className="font-body text-xs text-[#8C7A6B] mt-1.5 leading-relaxed break-keep whitespace-pre-line">
            {message}
          </p>
        </div>
        <div className="flex gap-2 w-full mt-1">
          <button
            type="button"
            onClick={onClose}
            className="font-title flex-1 py-2.5 bg-white hover:bg-[#FAF7F2] border-2 border-[#EADFCF] text-[#7A6251] text-xs rounded-xl transition active:scale-95"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="font-title flex-1 py-2.5 bg-[#C25E3E] hover:bg-[#B04E30] text-white text-xs rounded-xl transition active:scale-95 shadow-xs"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

function TimePickerModal({
  isOpen,
  onClose,
  currentTime,
  onSelectTime,
}: {
  isOpen: boolean;
  onClose: () => void;
  currentTime: string;
  onSelectTime: (timeStr: string) => void;
}) {
  const [meridiem, setMeridiem] = useState<"AM" | "PM">("PM");
  const [hour12, setHour12] = useState<number>(12);
  const [minute, setMinute] = useState<number>(0);

  const hoursList = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  const minutesList = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

  const hourScrollRef = useRef<HTMLDivElement>(null);
  const minScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      const [hStr, mStr] = (currentTime || "12:00").split(":");
      const h = parseInt(hStr, 10) || 12;
      const m = parseInt(mStr, 10) || 0;

      if (h >= 12) {
        setMeridiem("PM");
        setHour12(h === 12 ? 12 : h - 12);
      } else {
        setMeridiem("AM");
        setHour12(h === 0 ? 12 : h);
      }
      setMinute(m);

      setTimeout(() => {
        const itemHeight = 42;
        if (hourScrollRef.current) {
          const targetH = h === 0 || h === 12 ? 12 : h > 12 ? h - 12 : h;
          const hIdx = hoursList.indexOf(targetH);
          if (hIdx !== -1) hourScrollRef.current.scrollTop = hIdx * itemHeight;
        }
        if (minScrollRef.current) {
          const closestMin = Math.round(m / 5) * 5;
          const mIdx = minutesList.indexOf(closestMin >= 60 ? 55 : closestMin);
          if (mIdx !== -1) minScrollRef.current.scrollTop = mIdx * itemHeight;
        }
      }, 60);
    }
  }, [isOpen, currentTime]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    let finalHour24 = hour12;
    if (meridiem === "PM") {
      finalHour24 = hour12 === 12 ? 12 : hour12 + 12;
    } else {
      finalHour24 = hour12 === 12 ? 0 : hour12;
    }
    const formatted = `${String(finalHour24).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
    onSelectTime(formatted);
    onClose();
  };

  const handleQuickPreset = (h24: number, m: number) => {
    if (h24 >= 12) {
      setMeridiem("PM");
      setHour12(h24 === 12 ? 12 : h24 - 12);
    } else {
      setMeridiem("AM");
      setHour12(h24 === 0 ? 12 : h24);
    }
    setMinute(m);

    const targetH12 = h24 === 0 || h24 === 12 ? 12 : h24 > 12 ? h24 - 12 : h24;
    const hIdx = hoursList.indexOf(targetH12);
    if (hourScrollRef.current && hIdx !== -1) hourScrollRef.current.scrollTop = hIdx * 42;
    const mIdx = minutesList.indexOf(m);
    if (minScrollRef.current && mIdx !== -1) minScrollRef.current.scrollTop = mIdx * 42;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#2D241E]/60 p-4 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-sm rounded-[32px] bg-[#FAF7F2] p-6 shadow-2xl border-2 border-[#EADFCF] flex flex-col gap-4 animate-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-[#EADFCF]">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-[#C25E3E]" />
            <h3 className="font-title text-base text-[#2D241E]">만날 시간 설정</h3>
          </div>
          <button type="button" onClick={onClose} className="text-[#A89889] hover:text-[#2D241E] p-1 transition">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex rounded-2xl bg-[#EFE8DC] p-1 border border-[#E2D5C3]">
          <button
            type="button"
            onClick={() => setMeridiem("AM")}
            className={`flex-1 py-2.5 rounded-xl font-title text-xs transition-all flex items-center justify-center gap-1 active:scale-95 ${
              meridiem === "AM" ? "bg-[#2D241E] text-[#F3D5B5] shadow-xs font-bold" : "text-[#7A6251] hover:text-[#2D241E]"
            }`}
          >
            <span>☀️ 오전 (AM)</span>
          </button>
          <button
            type="button"
            onClick={() => setMeridiem("PM")}
            className={`flex-1 py-2.5 rounded-xl font-title text-xs transition-all flex items-center justify-center gap-1 active:scale-95 ${
              meridiem === "PM" ? "bg-[#2D241E] text-[#F3D5B5] shadow-xs font-bold" : "text-[#7A6251] hover:text-[#2D241E]"
            }`}
          >
            <span>🌙 오후 (PM)</span>
          </button>
        </div>

        <div className="relative h-44 bg-white rounded-2xl border-2 border-[#EADFCF] overflow-hidden flex shadow-inner">
          <div className="pointer-events-none absolute left-3 right-3 h-[42px] top-1/2 -translate-y-1/2 rounded-xl bg-[#FAF7F2] border-2 border-[#E2D5C3] shadow-2xs z-0" />

          <div
            ref={hourScrollRef}
            className="flex-1 h-full overflow-y-auto py-[65px] text-center z-10 scroll-smooth [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
          >
            {hoursList.map((h) => (
              <div
                key={h}
                onClick={() => {
                  setHour12(h);
                  const idx = hoursList.indexOf(h);
                  if (hourScrollRef.current && idx !== -1) hourScrollRef.current.scrollTop = idx * 42;
                }}
                className={`h-[42px] flex items-center justify-center font-title cursor-pointer transition-all select-none ${
                  hour12 === h ? "text-xl text-[#2D241E] font-black scale-110" : "text-xs text-[#B5A595] hover:text-[#7A6251]"
                }`}
              >
                {String(h).padStart(2, "0")}시
              </div>
            ))}
          </div>

          <div className="w-[1px] h-28 my-auto bg-[#F0E7DA] z-10" />

          <div
            ref={minScrollRef}
            className="flex-1 h-full overflow-y-auto py-[65px] text-center z-10 scroll-smooth [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
          >
            {minutesList.map((m) => (
              <div
                key={m}
                onClick={() => {
                  setMinute(m);
                  const idx = minutesList.indexOf(m);
                  if (minScrollRef.current && idx !== -1) minScrollRef.current.scrollTop = idx * 42;
                }}
                className={`h-[42px] flex items-center justify-center font-title cursor-pointer transition-all select-none ${
                  minute === m ? "text-xl text-[#2D241E] font-black scale-110" : "text-xs text-[#B5A595] hover:text-[#7A6251]"
                }`}
              >
                {String(m).padStart(2, "0")}분
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap justify-between">
          {[
            { label: "12:00 점심", h: 12, m: 0 },
            { label: "14:00 오후", h: 14, m: 0 },
            { label: "17:30 저녁", h: 17, m: 30 },
            { label: "19:00 퇴근", h: 19, m: 0 },
          ].map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => handleQuickPreset(preset.h, preset.m)}
              className="font-title flex-1 py-1.5 px-2 bg-white hover:bg-[#FAF7F2] border border-[#EADFCF] text-[#7A6251] rounded-xl text-[11px] transition active:scale-95 shadow-2xs whitespace-nowrap"
            >
              {preset.label}
            </button>
          ))}
        </div>

        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="font-title flex-1 rounded-xl border-2 border-[#EADFCF] py-3 text-xs text-[#7A6251] hover:bg-white transition active:scale-95"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="font-title flex-1 rounded-xl bg-[#2D241E] hover:bg-[#43362E] py-3 text-xs text-[#F3D5B5] shadow-xs transition active:scale-95"
          >
            {meridiem === "AM" ? "오전" : "오후"} {String(hour12).padStart(2, "0")}:{String(minute).padStart(2, "0")} 적용
          </button>
        </div>
      </div>
    </div>
  );
}

function PlaceLikeModal({
  isOpen,
  onClose,
  place,
  onSaved,
}: {
  isOpen: boolean;
  onClose: () => void;
  place: Place | null;
  onSaved: (placeId: string) => void;
}) {
  const [rooms, setRooms] = useState<any[]>([]);
  const [selectedRoomCode, setSelectedRoomCode] = useState("");
  const [selectedGroup, setSelectedGroup] = useState("기본 찜");
  const [isSuccess, setIsSuccess] = useState(false);

  const [showAddGroupInput, setShowAddGroupInput] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [isLoadingRooms, setIsLoadingRooms] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    setIsSuccess(false);
    setShowAddGroupInput(false);
    setNewGroupName("");
    setAlertMessage(null);

    const user = getCurrentUser() || "";
    if (!user) {
      setRooms([]);
      return;
    }

    const fetchRooms = async () => {
      setIsLoadingRooms(true);
      try {
        const res = await fetch(`/api/rooms?username=${encodeURIComponent(user)}`, {
          cache: "no-store",
        });

        if (!res.ok) {
          throw new Error("약속 방 목록을 불러오지 못했습니다.");
        }

        const data = await res.json();
        const myRooms = data.rooms || [];
        setRooms(myRooms);

        const activeCode =
          localStorage.getItem("routy_current_room_code") ||
          myRooms[0]?.code ||
          "";

        const validActiveCode = myRooms.some((r: any) => r.code === activeCode)
          ? activeCode
          : myRooms[0]?.code || "";

        setSelectedRoomCode(validActiveCode);
        setSelectedGroup("기본 찜");
      } catch (error) {
        console.error("찜 모달 방 목록 조회 실패:", error);
        setRooms([]);
        setAlertMessage("약속 방 목록을 불러오는 중 오류가 발생했습니다.");
      } finally {
        setIsLoadingRooms(false);
      }
    };

    fetchRooms();
  }, [isOpen]);

  if (!isOpen || !place) return null;

  const currentRoom = rooms.find((r) => r.code === selectedRoomCode);
  const groupsList = currentRoom?.groups?.map((g: any) => g.name) || [];

  const handleCreateNewGroup = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmed = newGroupName.trim();
    if (!trimmed || !selectedRoomCode) return;

    if (trimmed === "기본 찜" || trimmed === "전체" || groupsList.includes(trimmed)) {
      setAlertMessage("이미 존재하거나 사용할 수 없는 그룹 이름입니다.");
      return;
    }

    try {
      const res = await fetch("/api/places/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "addGroup",
          roomCode: selectedRoomCode,
          groupName: trimmed,
          colorId: "pastel-pink",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setAlertMessage(data.error || "그룹 추가에 실패했습니다.");
        return;
      }

      setRooms((prev) =>
        prev.map((room) =>
          room.code === selectedRoomCode
            ? {
                ...room,
                groups: [...(room.groups || []), data.group],
              }
            : room
        )
      );

      setSelectedGroup(trimmed);
      setNewGroupName("");
      setShowAddGroupInput(false);
    } catch (error) {
      console.error("찜 그룹 추가 실패:", error);
      setAlertMessage("그룹 추가 중 오류가 발생했습니다.");
    }
  };

  const handleSave = async () => {
    if (!selectedRoomCode) return;

    setIsSaving(true);
    try {
      const finalGroup = selectedGroup === "기본 찜" ? null : selectedGroup;

      const placeToSave: Place = {
        ...place,
        id: String(place.id || ""),
        isVisited: false,
        group: finalGroup ?? undefined,
      };

      const res = await fetch("/api/places/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "addPlace",
          roomCode: selectedRoomCode,
          place: placeToSave,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setAlertMessage(data.error || "찜 저장에 실패했습니다.");
        return;
      }

      setIsSuccess(true);
      onSaved(String(place.id));
      setTimeout(() => {
        setIsSuccess(false);
        onClose();
      }, 1100);
    } catch (error) {
      console.error("찜 저장 실패:", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#2D241E]/60 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-sm rounded-[30px] bg-[#FAF7F2] p-5 shadow-2xl border-2 border-[#EADFCF] space-y-4 animate-in fade-in zoom-in-95 duration-150">
        {isSuccess && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center rounded-[28px] bg-[#FAF7F2]/95 backdrop-blur-xs space-y-1 animate-in fade-in">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#C25E3E] text-white shadow-md">
              <Check className="h-6 w-6" />
            </div>
            <p className="font-title text-sm text-[#2D241E] pt-1">
              약속 찜 지도에 저장 완료! 💖
            </p>
            <p className="font-body text-xs text-[#8C7A6B]">
              지도 화면에서 바로 확인할 수 있어요
            </p>
          </div>
        )}

        <div className="flex items-center justify-between border-b border-[#EADFCF] pb-2">
          <div className="flex items-center gap-1.5">
            <Heart className="h-4 w-4 text-[#C25E3E] fill-[#C25E3E]" />
            <h3 className="font-title text-base text-[#2D241E]">장소 찜하기</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full text-[#A89889] hover:text-[#2D241E]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="rounded-2xl bg-white border-2 border-[#EADFCF] p-3 shadow-2xs">
          <span className="font-title text-[10px] text-[#C25E3E] uppercase block">
            선택한 장소
          </span>
          <p className="font-title text-sm text-[#2D241E] mt-0.5 truncate">
            {place.name}
          </p>
          <p className="font-body text-[11px] text-[#8C7A6B] truncate">
            {place.address}
          </p>
        </div>

        {isLoadingRooms ? (
          <div className="p-5 bg-white rounded-2xl border border-[#EADFCF] text-center">
            <div className="mx-auto w-5 h-5 border-2 border-[#C25E3E] border-t-transparent rounded-full animate-spin" />
            <p className="font-body text-[11px] text-[#8C7A6B] mt-2">
              약속 방을 불러오는 중...
            </p>
          </div>
        ) : rooms.length === 0 ? (
          <div className="p-4 bg-white rounded-2xl border border-dashed border-[#DFCBB5] text-center">
            <p className="font-title text-xs text-[#2D241E]">
              참여 중인 약속 방이 없습니다.
            </p>
            <p className="font-body text-[11px] text-[#8C7A6B] mt-1">
              먼저 약속 찜 지도에서 방을 만들어주세요!
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="font-title text-xs text-[#7A6251] block mb-1">
                어느 약속 방 지도에 넣을까요?
              </label>
              <select
                value={selectedRoomCode}
                onChange={(e) => {
                  const nextCode = e.target.value;
                  setSelectedRoomCode(nextCode);
                  setSelectedGroup("기본 찜");
                  localStorage.setItem("routy_current_room_code", nextCode);
                }}
                className="font-title w-full bg-white border-2 border-[#EADFCF] text-xs text-[#2D241E] p-2.5 rounded-xl outline-none focus:border-[#C25E3E]"
              >
                {rooms.map((r) => (
                  <option key={r.code} value={r.code}>
                    {r.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-title text-xs text-[#7A6251]">
                  지도 찜 그룹 선택
                </label>
                <button
                  type="button"
                  onClick={() => setShowAddGroupInput((prev) => !prev)}
                  className="font-title text-[11px] text-[#C25E3E] hover:underline flex items-center gap-0.5"
                >
                  <Plus className="h-3 w-3" />
                  <span>새 그룹 만들기</span>
                </button>
              </div>

              {showAddGroupInput && (
                <form onSubmit={handleCreateNewGroup} className="mb-2 flex gap-1.5">
                  <input
                    type="text"
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    placeholder="새 그룹 이름 입력 (예: 건대 맛집)"
                    className="font-body flex-1 bg-white border-2 border-[#EADFCF] text-xs px-2.5 py-1.5 rounded-xl outline-none focus:border-[#C25E3E]"
                    autoFocus
                  />
                  <button
                    type="submit"
                    className="font-title bg-[#2D241E] text-[#F3D5B5] text-xs px-3 py-1.5 rounded-xl shrink-0 active:scale-95"
                  >
                    추가
                  </button>
                </form>
              )}

              <div className="flex gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => setSelectedGroup("기본 찜")}
                  className={`font-title px-3 py-1.5 rounded-xl text-xs border transition-all active:scale-95 ${
                    selectedGroup === "기본 찜"
                      ? "bg-[#2D241E] text-[#F3D5B5] border-[#2D241E]"
                      : "bg-white text-[#7A6251] border-[#EADFCF] hover:bg-[#FAF7F2]"
                  }`}
                >
                  🤍 기본 찜
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedGroup("기본 그룹")}
                  className={`font-title px-3 py-1.5 rounded-xl text-xs border transition-all active:scale-95 ${
                    selectedGroup === "기본 그룹"
                      ? "bg-[#2D241E] text-[#F3D5B5] border-[#2D241E]"
                      : "bg-white text-[#7A6251] border-[#EADFCF] hover:bg-[#FAF7F2]"
                  }`}
                >
                  📁 기본 그룹
                </button>

                {groupsList.map((gName: string) => (
                  <button
                    key={gName}
                    type="button"
                    onClick={() => setSelectedGroup(gName)}
                    className={`font-title px-3 py-1.5 rounded-xl text-xs border transition-all active:scale-95 ${
                      selectedGroup === gName
                        ? "bg-[#2D241E] text-[#F3D5B5] border-[#2D241E]"
                        : "bg-white text-[#7A6251] border-[#EADFCF] hover:bg-[#FAF7F2]"
                    }`}
                  >
                    📁 {gName}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {alertMessage && (
          <div className="rounded-xl bg-[#FFF4EF] border border-[#F2D1C5] p-2.5 text-xs text-[#C25E3E] whitespace-pre-line">
            {alertMessage}
          </div>
        )}

        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="font-title flex-1 rounded-xl border-2 border-[#EADFCF] py-3 text-xs text-[#7A6251] hover:bg-[#FAF7F2] transition active:scale-95"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={rooms.length === 0 || isSaving || isLoadingRooms}
            className="font-title flex-1 rounded-xl bg-[#C25E3E] hover:bg-[#B04E30] py-3 text-xs text-white shadow-xs transition disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            {isSaving ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>저장 중...</span>
              </>
            ) : (
              <span>지도에 찜 저장</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function SaveCourseToFolderModal({
  isOpen,
  onClose,
  courseTitle,
  summary,
  location,
  steps,
  onSuccess,
  showAlert,
}: {
  isOpen: boolean;
  onClose: () => void;
  courseTitle: string;
  summary: string;
  location: string;
  steps: CourseStepItem[];
  onSuccess: () => void;
  showAlert: (message: string, title?: string, emoji?: string) => void; 
}) {
  const [rooms, setRooms] = useState<any[]>([]);
  const [selectedRoomCode, setSelectedRoomCode] = useState("");
  const [existingFolders, setExistingFolders] = useState<string[]>(["기본 폴더"]);
  const [selectedFolder, setSelectedFolder] = useState("기본 폴더");
  const [showAddFolderInput, setShowAddFolderInput] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsSuccess(false);
      setShowAddFolderInput(false);
      setNewFolderName("");

      const user = getCurrentUser() || "";
      const fetchRooms = async () => {
        try {
          const res = await fetch(`/api/rooms?username=${encodeURIComponent(user)}`);
          if (!res.ok) return;
          const data = await res.json();
          const myRooms = data.rooms || [];
          setRooms(myRooms);

          const activeCode = localStorage.getItem("routy_current_room_code") || (myRooms[0]?.code ?? "");
          setSelectedRoomCode(activeCode);
        } catch (e) {
          console.error(e);
        }
      };

      fetchRooms();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!selectedRoomCode) {
      setExistingFolders(["기본 폴더"]);
      setSelectedFolder("기본 폴더");
      return;
    }

    const fetchFolders = async () => {
      try {
        const res = await fetch(`/api/rooms/${encodeURIComponent(selectedRoomCode)}/courses`);
        if (!res.ok) return;
        const data = await res.json();
        const serverFolders: string[] = data.folders || ["기본 폴더"];
        const usedFolders: string[] = (data.courses || []).map((c: any) => c.folderName || "기본 폴더");

        const mergedFolders = Array.from(new Set(["기본 폴더", ...serverFolders, ...usedFolders]));
        setExistingFolders(mergedFolders);
        setSelectedFolder((prev) => (mergedFolders.includes(prev) ? prev : mergedFolders[0] || "기본 폴더"));
      } catch (e) {
        console.error(e);
      }
    };

    fetchFolders();
  }, [selectedRoomCode]);

  if (!isOpen) return null;

  const currentRoom = rooms.find((r) => r.code === selectedRoomCode);

  const handleCreateNewFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newFolderName.trim();
    if (!trimmed || !selectedRoomCode) return;

    if (existingFolders.includes(trimmed)) {
      showAlert("이미 존재하는 폴더 이름입니다.", "안내", "💡");
      return;
    }

    try {
      const res = await fetch(`/api/rooms/${encodeURIComponent(selectedRoomCode)}/folders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          folderName: trimmed,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        showAlert(data.error || "폴더 추가에 실패했습니다.", "안내", "💡");
        return;
      }

      setExistingFolders((prev) => [...prev, trimmed]);
      setSelectedFolder(trimmed);
      setNewFolderName("");
      setShowAddFolderInput(false);
    } catch (e) {
      console.error(e);
      showAlert("폴더 추가 중 오류가 발생했습니다.", "안내", "💡");
    }
  };

  const handleSaveCourse = async () => {
    if (!selectedRoomCode) {
      showAlert("코스를 보관할 약속 방을 선택해주세요.", "안내", "💡");
      return;
    }

    const finalFolder = selectedFolder || "기본 폴더";
    const author = getCurrentUser() || "익명";

    setIsSaving(true);
    try {
      const res = await fetch(`/api/rooms/${encodeURIComponent(selectedRoomCode)}/courses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          folderName: finalFolder,
          courseTitle: courseTitle || `${location || "맞춤"} 데이트 코스`,
          summary,
          location: location || "선택 위치",
          steps,
          username: author,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        showAlert(data.error || "코스 저장에 실패했습니다.", "안내", "💡");
        return;
      }

      setIsSuccess(true);
      onSuccess();
      setTimeout(() => {
        setIsSuccess(false);
        onClose();
      }, 1200);
    } catch (e) {
      console.error(e);
      showAlert("코스 저장 중 오류가 발생했습니다.", "안내", "💡");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#2D241E]/60 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-md rounded-[30px] bg-[#FAF7F2] p-6 shadow-2xl border-2 border-[#EADFCF] space-y-4 animate-in fade-in zoom-in-95 duration-150">
        {isSuccess && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center rounded-[28px] bg-[#FAF7F2]/95 backdrop-blur-xs space-y-2 animate-in fade-in">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#C25E3E] text-white shadow-md">
              <Check className="h-6 w-6" />
            </div>
            <p className="font-title text-sm text-[#2D241E]">
              '{currentRoom?.title || "선택한 방"}' 코스 보관함에 저장 완료! 📁
            </p>
            <p className="font-body text-xs text-[#8C7A6B]">코스 보관함 페이지에서 언제든 다시 꺼내볼 수 있어요</p>
          </div>
        )}

        <div className="flex items-center justify-between border-b border-[#EADFCF] pb-3">
          <div className="flex items-center gap-2">
            <Folder className="h-5 w-5 text-[#C25E3E]" />
            <h3 className="font-title text-base text-[#2D241E]">코스 확정 및 보관함 저장</h3>
          </div>
          <button type="button" onClick={onClose} className="p-1 rounded-full text-[#A89889] hover:text-[#2D241E]">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="rounded-2xl bg-white border-2 border-[#EADFCF] p-3.5 shadow-2xs">
          <span className="font-title text-[10px] text-[#C25E3E] uppercase block">저장할 코스 일정</span>
          <p className="font-title text-sm text-[#2D241E] mt-0.5 truncate">{courseTitle}</p>
          <p className="font-body text-xs text-[#8C7A6B] mt-0.5 truncate">{steps.length}개 장소 동선 풀세트</p>
        </div>

        {rooms.length === 0 ? (
          <div className="p-5 bg-white rounded-2xl border border-dashed border-[#DFCBB5] text-center space-y-2">
            <p className="font-title text-xs text-[#2D241E]">참여 중인 약속 방이 없습니다.</p>
            <p className="font-body text-xs text-[#8C7A6B] leading-relaxed">
              약속 찜 지도 또는 홈에서 방을 만들면, 방 멤버들과 함께 볼 수 있는 폴더에 플랜이 보관됩니다.
            </p>
            <Link
              href="/map"
              className="inline-block font-title text-xs text-[#C25E3E] bg-[#F9ECE7] px-3 py-1.5 rounded-xl border border-[#F2D1C5] mt-1"
            >
              약속 방 만들러 가기 →
            </Link>
          </div>
        ) : (
          <div className="space-y-3.5">
            <div>
              <label className="font-title text-xs text-[#7A6251] block mb-1">어느 약속 방 보관함에 넣을까요?</label>
              <select
                value={selectedRoomCode}
                onChange={(e) => setSelectedRoomCode(e.target.value)}
                className="font-title w-full bg-white border-2 border-[#EADFCF] text-xs text-[#2D241E] p-3 rounded-xl outline-none focus:border-[#C25E3E] cursor-pointer"
              >
                {rooms.map((r) => (
                  <option key={r.code} value={r.code}>
                    {r.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="font-title text-xs text-[#7A6251]">폴더 선택</label>
                <button
                  type="button"
                  onClick={() => setShowAddFolderInput((prev) => !prev)}
                  className="font-title text-[11px] text-[#C25E3E] hover:underline flex items-center gap-0.5"
                >
                  <Plus className="h-3 w-3" />
                  <span>새 폴더 만들기</span>
                </button>
              </div>

              {showAddFolderInput && (
                <form onSubmit={handleCreateNewFolder} className="mb-2 flex gap-1.5">
                  <input
                    type="text"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    placeholder="새 폴더 이름 입력 (예: 1주년 기념, 주말 나들이)"
                    className="font-body flex-1 bg-white border-2 border-[#EADFCF] text-xs px-2.5 py-1.5 rounded-xl outline-none focus:border-[#C25E3E]"
                    autoFocus
                  />
                  <button
                    type="submit"
                    className="font-title bg-[#2D241E] text-[#F3D5B5] text-xs px-3 py-1.5 rounded-xl shrink-0 active:scale-95"
                  >
                    추가
                  </button>
                </form>
              )}

              <div className="flex gap-1.5 flex-wrap">
                {existingFolders.map((fName) => (
                  <button
                    key={fName}
                    type="button"
                    onClick={() => setSelectedFolder(fName)}
                    className={`font-title px-3 py-1.5 rounded-xl text-xs border transition-all active:scale-95 ${
                      selectedFolder === fName
                        ? "bg-[#2D241E] text-[#F3D5B5] border-[#2D241E] shadow-2xs"
                        : "bg-white text-[#7A6251] border-[#EADFCF] hover:bg-[#FAF7F2]"
                    }`}
                  >
                    📁 {fName}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="font-title flex-1 rounded-xl border-2 border-[#EADFCF] py-3 text-xs text-[#7A6251] hover:bg-[#FAF7F2] transition"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleSaveCourse}
            disabled={rooms.length === 0 || isSaving}
            className="font-title flex-1 rounded-xl bg-[#C25E3E] hover:bg-[#B04E30] py-3 text-xs text-white shadow-xs transition disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            {isSaving ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>저장 중...</span>
              </>
            ) : (
              <span>보관함에 코스 저장</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function ShareCourseModal({
  isOpen,
  onClose,
  courseTitle,
  location,
  steps,
}: {
  isOpen: boolean;
  onClose: () => void;
  courseTitle: string;
  location: string;
  steps: CourseStepItem[];
}) {
  const [shareFormat, setShareFormat] = useState<"IMAGE" | "TEXT">("IMAGE");
  const [copiedText, setCopiedText] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);

  if (!isOpen) return null;

  const handleCopyText = async () => {
    const textLines = [
      `💌 [${courseTitle || "데이트 코스"}]`,
      `📍 위치: ${location || "선택된 위치"}`,
      `-----------------------`,
      ...steps.map(
        (s) =>
          `${s.order}. [${s.time}] ${s.place.name}${
            s.transitNote ? ` (${s.transitNote})` : ""
          }\n   - ${s.place.address}`
      ),
      `-----------------------`,
      `✨ ROUTY 데이트 플래너로 완성한 맞춤 코스예요!`,
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
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 2000);
    } catch {
      alert("클립보드 복사 권한이 없습니다.");
    }
  };

  const handleDownloadImage = async () => {
    setIsGeneratingImage(true);
    try {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas 생성 실패");

      const width = 640;
      const baseHeight = 330;
      const stepItemHeight = 90;
      const height = baseHeight + steps.length * stepItemHeight;

      canvas.width = width;
      canvas.height = height;

      const drawRoundRect = (
        x: number,
        y: number,
        w: number,
        h: number,
        radius: number,
        fillColor: string,
        strokeColor?: string
      ) => {
        ctx.beginPath();
        if (typeof ctx.roundRect === "function") {
          ctx.roundRect(x, y, w, h, radius);
        } else {
          ctx.moveTo(x + radius, y);
          ctx.arcTo(x + w, y, x + w, y + h, radius);
          ctx.arcTo(x + w, y + h, x, y + h, radius);
          ctx.arcTo(x, y + h, x, y, radius);
          ctx.arcTo(x, y, x + w, y, radius);
          ctx.closePath();
        }
        ctx.fillStyle = fillColor;
        ctx.fill();
        if (strokeColor) {
          ctx.strokeStyle = strokeColor;
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      };

      ctx.fillStyle = "#FAF7F2";
      ctx.fillRect(0, 0, width, height);
      drawRoundRect(30, 30, width - 60, height - 60, 24, "#FFFFFF", "#EADFCF");

      ctx.fillStyle = "#C25E3E";
      ctx.font = "bold 13px sans-serif";
      ctx.fillText("ROUTY · COURSE PLANNER", 54, 76);

      ctx.fillStyle = "#2D241E";
      ctx.font = "bold 26px sans-serif";
      const displayTitle =
        courseTitle.length > 20 ? courseTitle.substring(0, 19) + "..." : courseTitle || `${location || "맞춤"} 데이트 코스`;
      ctx.fillText(displayTitle, 54, 116);

      ctx.fillStyle = "#8C7A6B";
      ctx.font = "14px sans-serif";
      ctx.fillText(`📍 ${location || "선택 위치"} 일대 · 총 ${steps.length}개 코스`, 54, 144);

      ctx.beginPath();
      ctx.setLineDash([6, 6]);
      ctx.moveTo(54, 168);
      ctx.lineTo(width - 54, 168);
      ctx.strokeStyle = "#EADFCF";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.setLineDash([]);

      let currentY = 210;
      steps.forEach((step, idx) => {
        ctx.beginPath();
        ctx.arc(72, currentY - 6, 14, 0, Math.PI * 2);
        ctx.fillStyle = "#2D241E";
        ctx.fill();

        ctx.fillStyle = "#FFFFFF";
        ctx.font = "bold 12px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(String(idx + 1), 72, currentY - 2);
        ctx.textAlign = "left";

        ctx.fillStyle = "#C25E3E";
        ctx.font = "bold 13px sans-serif";
        ctx.fillText(`[${step.time}]`, 96, currentY - 6);

        ctx.fillStyle = "#2D241E";
        ctx.font = "bold 16px sans-serif";
        const pName = step.place.name.length > 18 ? step.place.name.substring(0, 17) + "..." : step.place.name;
        ctx.fillText(pName, 160, currentY - 6);

        ctx.fillStyle = "#8C7A6B";
        ctx.font = "12px sans-serif";
        const extraNote = step.transitNote ? ` (${step.transitNote})` : "";
        const addrText = `${step.place.address}${extraNote}`;
        const finalAddr = addrText.length > 34 ? addrText.substring(0, 33) + "..." : addrText;
        ctx.fillText(finalAddr, 96, currentY + 16);

        currentY += stepItemHeight;
      });

      ctx.beginPath();
      ctx.setLineDash([6, 6]);
      ctx.moveTo(54, height - 90);
      ctx.lineTo(width - 54, height - 90);
      ctx.strokeStyle = "#EADFCF";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = "#A89889";
      ctx.font = "11px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("✨ AI가 도보 동선과 취향을 정밀 계산하여 완성한 코스입니다", width / 2, height - 60);
      ctx.textAlign = "left";

      canvas.toBlob(async (blob) => {
        if (!blob) {
          alert("이미지를 생성하지 못했습니다.");
          setIsGeneratingImage(false);
          return;
        }

        const fileName = `${(courseTitle || "데이트코스").replace(/\s+/g, "_")}.png`;
        const file = new File([blob], fileName, { type: "image/png" });

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              files: [file],
              title: courseTitle,
              text: `💌 [${courseTitle}] 데이트 코스를 공유합니다!`,
            });
            setIsGeneratingImage(false);
            return;
          } catch {
            setIsGeneratingImage(false);
            return;
          }
        }

        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setIsGeneratingImage(false);
      }, "image/png");
    } catch (e) {
      console.error(e);
      alert("이미지 저장 중 오류가 발생했습니다.");
      setIsGeneratingImage(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#2D241E]/60 p-4 backdrop-blur-xs">
      <div className="w-full max-w-md rounded-[30px] bg-[#FAF7F2] p-6 shadow-2xl border-2 border-[#EADFCF] space-y-4 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-[#EADFCF] pb-3">
          <div>
            <span className="font-title text-[10px] text-[#C25E3E] uppercase tracking-wider bg-[#F9ECE7] px-2 py-0.5 rounded-md border border-[#F2D1C5]">
              Share Course
            </span>
            <h3 className="font-title text-base text-[#2D241E] mt-1">데이트 코스 공유하기</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full text-[#A89889] hover:bg-[#F4EEE7] hover:text-[#2D241E] transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex rounded-2xl bg-[#EFE8DC] p-1 text-xs border border-[#E2D5C3]">
          <button
            type="button"
            onClick={() => setShareFormat("IMAGE")}
            className={`flex-1 py-2 rounded-xl font-title transition flex items-center justify-center gap-1.5 active:scale-95 ${
              shareFormat === "IMAGE" ? "bg-[#2D241E] text-[#F3D5B5] shadow-xs" : "text-[#7A6251] hover:text-[#2D241E]"
            }`}
          >
            <ImageIcon className="h-3.5 w-3.5" />
            <span>사진 이미지로 공유</span>
          </button>
          <button
            type="button"
            onClick={() => setShareFormat("TEXT")}
            className={`flex-1 py-2 rounded-xl font-title transition flex items-center justify-center gap-1.5 active:scale-95 ${
              shareFormat === "TEXT" ? "bg-[#2D241E] text-[#F3D5B5] shadow-xs" : "text-[#7A6251] hover:text-[#2D241E]"
            }`}
          >
            <Copy className="h-3.5 w-3.5" />
            <span>텍스트 복사</span>
          </button>
        </div>

        {shareFormat === "IMAGE" ? (
          <div className="rounded-2xl bg-white border-2 border-[#EADFCF] p-4.5 space-y-3 shadow-2xs">
            <div className="flex items-center justify-between border-b border-[#F2EAE0] pb-2">
              <span className="font-title text-xs text-[#2D241E] flex items-center gap-1">📸 코스 플랜 카드 티켓</span>
              <span className="font-title text-[10px] bg-[#FAF7F2] text-[#7A6251] px-2 py-0.5 rounded-full border border-[#EADFCF]">
                고화질 PNG
              </span>
            </div>

            <div className="p-3 bg-[#FAF7F2] rounded-xl border border-[#EADFCF] space-y-2 text-left">
              <p className="font-title text-sm text-[#2D241E] truncate">{courseTitle || `${location || "맞춤"} 데이트 코스`}</p>
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {steps.map((s) => (
                  <div key={s.order} className="flex items-center gap-2 text-xs">
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#2D241E] text-[9px] font-bold text-white shrink-0">
                      {s.order}
                    </span>
                    <span className="font-title text-[11px] text-[#C25E3E] shrink-0">{s.time}</span>
                    <span className="font-title text-xs text-[#2D241E] truncate">{s.place.name}</span>
                  </div>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={handleDownloadImage}
              disabled={isGeneratingImage}
              className="font-title flex w-full items-center justify-center gap-2 rounded-2xl bg-[#C25E3E] hover:bg-[#B04E30] py-3.5 text-xs text-white shadow-xs transition active:scale-[0.98] disabled:opacity-50"
            >
              {isGeneratingImage ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>사진 카드 생성 중...</span>
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  <span>사진(이미지) 저장 및 공유</span>
                </>
              )}
            </button>
            <p className="font-body text-center text-[11px] text-[#A89889]">
              인스타그램 스토리나 카카오톡 사진 전송용 고화질 카드로 저장됩니다.
            </p>
          </div>
        ) : (
          <div className="rounded-2xl bg-white border-2 border-[#EADFCF] p-4.5 space-y-3 shadow-2xs">
            <div className="flex items-center justify-between border-b border-[#F2EAE0] pb-2">
              <span className="font-title text-xs text-[#7A6251]">메신저 전송용 텍스트 미리보기</span>
              <span className="font-title text-[10px] text-[#C25E3E]">총 {steps.length}단계</span>
            </div>

            <div className="p-3 bg-[#FAF7F2] rounded-xl border border-[#EADFCF] text-[11px] font-body text-[#5F5147] max-h-36 overflow-y-auto space-y-1 text-left leading-relaxed">
              <p className="font-title text-xs text-[#2D241E]">💌 [{courseTitle}]</p>
              <p className="text-[#8C7A6B]">📍 위치: {location || "선택 위치"}</p>
              <div className="pt-1 space-y-1">
                {steps.map((s) => (
                  <p key={s.order}>
                    {s.order}. [{s.time}] {s.place.name}
                    {s.transitNote ? ` (${s.transitNote})` : ""}
                  </p>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={handleCopyText}
              className="font-title flex w-full items-center justify-center gap-2 rounded-2xl bg-[#2D241E] hover:bg-[#43362E] py-3.5 text-xs text-[#F3D5B5] shadow-xs transition active:scale-[0.98]"
            >
              {copiedText ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
              <span>{copiedText ? "코스 텍스트가 복사되었어요! ✨" : "코스 요약 텍스트 복사하기"}</span>
            </button>
            <p className="font-body text-center text-[11px] text-[#A89889]">
              복사한 텍스트를 카카오톡이나 메시지 창에 바로 붙여넣기(Ctrl+V) 하세요.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function calculateDistanceBetween(lat1: number, lon1: number, lat2: number, lon2: number): number {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
  const R = 6371e3;
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLon = (lon2 - lon1) * rad;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

export default function CoursePage() {
  const [mounted, setMounted] = useState(false);
  const [viewStep, setViewStep] = useState<"form" | "result">("form");
  const [loading, setLoading] = useState(false);

  const [plannerMode, setPlannerMode] = useState<"quick" | "custom">("custom");

  const [location, setLocation] = useState("");
  const [selectedLocationDetail, setSelectedLocationDetail] = useState<{
    name: string;
    address?: string;
    lat?: number;
    lng?: number;
  } | null>(null);

  const [locationInput, setLocationInput] = useState("");
  const [locationSuggestions, setLocationSuggestions] = useState<any[]>([]);
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const locationContainerRef = useRef<HTMLDivElement>(null);

  const [startTime, setStartTime] = useState<string>("12:00");
  const [isTimePickerOpen, setIsTimePickerOpen] = useState(false);

  const [quickOrder, setQuickOrder] = useState<("DINING" | "CAFE" | "ACTIVITY")[]>([]);
  const [stepPreferences, setStepPreferences] = useState<StepPreference[]>([]);

  const [fixedPlaces, setFixedPlaces] = useState<FixedPlaceItem[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [searchResults, setSearchResults] = useState<Place[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedPlaceToAssign, setSelectedPlaceToAssign] = useState<Place | null>(null);
  const [targetStepIndexToAssign, setTargetStepIndexToAssign] = useState<number>(0);

  const [courseTitle, setCourseTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [generatedCourse, setGeneratedCourse] = useState<CourseStepItem[]>([]);
  const [replacingStepIndex, setReplacingStepIndex] = useState<number | null>(null);

  const [likePlaceTarget, setLikePlaceTarget] = useState<Place | null>(null);
  const [likedPlaceIds, setLikedPlaceIds] = useState<Set<string>>(new Set());
  const [isCourseFolderModalOpen, setIsCourseFolderModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  const [alertConfig, setAlertConfig] = useState<{
    isOpen: boolean;
    title?: string;
    message: string;
    emoji?: string;
  }>({ isOpen: false, message: "" });

  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title?: string;
    message: string;
    emoji?: string;
    onConfirm: () => void;
    confirmText?: string;
    cancelText?: string;
  }>({ isOpen: false, message: "", onConfirm: () => {} });

  const showAlert = (message: string, title = "안내", emoji = "💡") => {
    setAlertConfig({ isOpen: true, title, message, emoji });
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const loadLikedPlacesFromDB = async () => {
      const user = getCurrentUser() || "";
      if (!user) {
        setLikedPlaceIds(new Set());
        return;
      }

      try {
        const res = await fetch(
          `/api/rooms?username=${encodeURIComponent(user)}`,
          { cache: "no-store" }
        );

        if (!res.ok) return;

        const data = await res.json();
        const myRooms = data.rooms || [];

        const activeCode =
          localStorage.getItem("routy_current_room_code") ||
          myRooms[0]?.code ||
          "";

        const currentRoom =
          myRooms.find((r: any) => r.code === activeCode) ||
          myRooms[0];

        if (currentRoom?.code) {
          localStorage.setItem("routy_current_room_code", currentRoom.code);
        }

        const ids = new Set<string>(
          (currentRoom?.places || []).map((p: any) =>
            String(p.kakaoId || p.id)
          )
        );

        setLikedPlaceIds(ids);
      } catch (error) {
        console.error("DB 찜 장소 초기 조회 실패:", error);
      }
    };

    loadLikedPlacesFromDB();
  }, [mounted]);

  useEffect(() => {
    if (!locationInput.trim()) {
      setLocationSuggestions([]);
      setIsSearchingLocation(false);
      return;
    }

    setIsSearchingLocation(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/places/search?query=${encodeURIComponent(locationInput.trim())}`);
        if (res.ok) {
          const data = await res.json();
          setLocationSuggestions(data.places?.slice(0, 8) || []);
          setShowLocationSuggestions(true);
        }
      } catch (err) {
        console.error("위치 검색 오류:", err);
      } finally {
        setIsSearchingLocation(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [locationInput]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (locationContainerRef.current && !locationContainerRef.current.contains(e.target as Node)) {
        setShowLocationSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectLocationSuggestion = (place: any) => {
    const chosenName = place.name || place.place_name;
    const chosenAddress = place.address || place.road_address_name || place.address_name;
    const chosenLat = typeof place.lat === "number" ? place.lat : parseFloat(place.y);
    const chosenLng = typeof place.lng === "number" ? place.lng : parseFloat(place.x);

    setLocation(chosenName);
    setSelectedLocationDetail({
      name: chosenName,
      address: chosenAddress,
      lat: chosenLat,
      lng: chosenLng,
    });
    setLocationInput("");
    setShowLocationSuggestions(false);
  };

  const handleLocationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!locationInput.trim()) return;
    setShowLocationSuggestions(true);
  };

  const getCategoryLabel = (category: any) => {
    const upper = String(category || "").toUpperCase();
    if (upper === "DINING" || upper === "RESTAURANT") return "식사";
    if (upper === "CAFE") return "카페";
    return "놀거리";
  };

  const formatFriendlyTime = (timeStr: string) => {
    const [hStr, mStr] = (timeStr || "12:00").split(":");
    const h = parseInt(hStr, 10) || 12;
    const m = parseInt(mStr, 10) || 0;
    const isPM = h >= 12;
    const displayHour = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${isPM ? "오후" : "오전"} ${String(displayHour).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  };

  const handleToggleQuickCategory = (cat: "DINING" | "CAFE" | "ACTIVITY") => {
    if (quickOrder.length >= 6) {
      showAlert("코스는 최대 6개까지만 구성할 수 있습니다.", "코스 개수 초과", "⚠️");
      return;
    }
    setQuickOrder((prev) => [...prev, cat]);
  };

  const handleRemoveQuickCategory = (indexToRemove: number) => {
    setQuickOrder((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleAddCustomCategory = (category: "DINING" | "CAFE" | "ACTIVITY") => {
    if (stepPreferences.length >= 6) {
      showAlert("코스는 최대 6개까지만 구성할 수 있습니다.\n필요 없는 단계를 먼저 삭제해 주세요.", "코스 개수 초과", "⚠️");
      return;
    }

    const newPref: StepPreference = {
      id: `step-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      category,
      ...(category === "DINING" && { cuisine: ["한식"], diningPref: "밥", diningWaiting: "웨이팅 없음" }),
      ...(category === "CAFE" && { cafeType: "개인 카페", cafeDessert: "디저트 전문" }),
      ...(category === "ACTIVITY" && { activityPace: "잔잔한 힐링", activityEnvironment: "실내" }),
    };

    setStepPreferences((prev) => [...prev, newPref]);
  };

  const handleRemoveCustomStep = (indexToRemove: number) => {
    setStepPreferences((prev) => prev.filter((_, idx) => idx !== indexToRemove));
    setFixedPlaces((prev) =>
      prev
        .filter((fp) => fp.targetStepIndex !== indexToRemove)
        .map((fp) => (fp.targetStepIndex > indexToRemove ? { ...fp, targetStepIndex: fp.targetStepIndex - 1 } : fp))
    );
  };

  const updateStepPref = (index: number, updates: Partial<StepPreference>) => {
    setStepPreferences((prev) => prev.map((step, idx) => (idx === index ? { ...step, ...updates } : step)));
  };

  const handleSearchPlaces = async () => {
    if (!searchKeyword.trim()) return;
    setIsSearching(true);
    try {
      // 💡 "서울" 고정 제거 -> 사용자가 지정한 위치 기반 검색
      const searchTarget = location ? `${location} ${searchKeyword}` : searchKeyword;
      const res = await fetch(`/api/places/search?query=${encodeURIComponent(searchTarget)}`);
      if (!res.ok) return;
      const data = await res.json();
      setSearchResults(data.places || []);
    } catch (err) {
      console.error("장소 검색 오류:", err);
      showAlert("장소 검색 중 오류가 발생했습니다.", "오류", "⚠️");
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectPlaceForAssignment = (place: Place) => {
    const rawCat = String(place.category || "").toUpperCase();
    let normalizedCategory: "DINING" | "CAFE" | "ACTIVITY" = "ACTIVITY";
    if (rawCat === "RESTAURANT" || rawCat === "DINING") {
      normalizedCategory = "DINING";
    } else if (rawCat === "CAFE") {
      normalizedCategory = "CAFE";
    }

    const firstMatchingIdx = stepPreferences.findIndex((s) => s.category === normalizedCategory);
    setSelectedPlaceToAssign({ ...place, category: normalizedCategory });
    setTargetStepIndexToAssign(firstMatchingIdx !== -1 ? firstMatchingIdx : 0);
  };

  const handleConfirmAddFixedPlace = () => {
    if (!selectedPlaceToAssign) return;

    if (fixedPlaces.some((p) => p.name === selectedPlaceToAssign.name)) {
      showAlert("이미 코스에 추가된 장소입니다.", "중복 장소", "⚠️");
      return;
    }

    const existingAtStep = fixedPlaces.find((p) => p.targetStepIndex === targetStepIndexToAssign);

    const executeAssignment = () => {
      const newFixed: FixedPlaceItem = {
        ...selectedPlaceToAssign,
        targetStepIndex: targetStepIndexToAssign,
      };

      setFixedPlaces((prev) => [
        ...prev.filter((p) => p.targetStepIndex !== targetStepIndexToAssign),
        newFixed,
      ]);

      setIsModalOpen(false);
      setSelectedPlaceToAssign(null);
      setSearchKeyword("");
      setSearchResults([]);
    };

    if (existingAtStep) {
      setConfirmConfig({
        isOpen: true,
        title: "장소 교체 확인",
        message: `${targetStepIndexToAssign + 1}번째 코스에 이미 '${existingAtStep.name}'이(가) 지정되어 있습니다.\n이 장소로 교체하시겠습니까?`,
        confirmText: "교체하기",
        cancelText: "취소",
        emoji: "📌",
        onConfirm: executeAssignment,
      });
      return;
    }

    executeAssignment();
  };

  const handleRemoveFixedPlace = (id: string) => {
    setFixedPlaces(fixedPlaces.filter((p) => p.id !== id));
  };

  const handleGenerateCourse = async () => {
    if (!location.trim() || !selectedLocationDetail) {
      showAlert(
        "정확한 도보 동선 계산을 위해,\n검색창에 입력 후 나타나는 목록에서 만날 장소를 선택해주세요!",
        "만날 위치 선택 필요",
        "📍"
      );
      return;
    }

    if (plannerMode === "quick" && quickOrder.length === 0) {
      showAlert("최소 1개 이상의 코스 항목(식사/카페/놀거리)을 선택해주세요.", "코스 항목 필요", "✨");
      return;
    }
    if (plannerMode === "custom" && stepPreferences.length === 0) {
      showAlert("최소 1개 이상의 코스 항목을 선택해주세요.", "코스 항목 필요", "✨");
      return;
    }

    let savedPlaceNames: string[] = [];
    try {
      const user = getCurrentUser() || "";

      if (user) {
        const roomsRes = await fetch(
          `/api/rooms?username=${encodeURIComponent(user)}`,
          { cache: "no-store" }
        );

        if (roomsRes.ok) {
          const roomsData = await roomsRes.json();
          const myRooms = roomsData.rooms || [];

          const activeCode =
            localStorage.getItem("routy_current_room_code") ||
            myRooms[0]?.code ||
            "";

          const currentRoom =
            myRooms.find((r: any) => r.code === activeCode) ||
            myRooms[0];

          if (currentRoom?.code) {
            localStorage.setItem("routy_current_room_code", currentRoom.code);
          }

          savedPlaceNames = (currentRoom?.places || []).map(
            (p: any) => p.name
          );
        }
      }
    } catch (e) {
      console.warn("DB 찜 목록 로드 실패:", e);
    }

    setLoading(true);
    try {
      const res = await fetch("/api/course", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: plannerMode,
          location,
          startCoords:
            selectedLocationDetail?.lat && selectedLocationDetail?.lng
              ? { lat: selectedLocationDetail.lat, lng: selectedLocationDetail.lng }
              : null,
          startTime,
          courseOrder: plannerMode === "quick" ? quickOrder : stepPreferences.map((s) => s.category),
          stepPreferences: plannerMode === "quick" ? [] : stepPreferences,
          fixedPlaces: plannerMode === "quick" ? [] : fixedPlaces,
          savedPlaces: savedPlaceNames,
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
        showAlert(`코스 생성 실패:\n${errMsg}`, "생성 오류", "⚠️");
        return;
      }

      const data = await res.json();

      if (data.steps && data.steps.length > 0) {
        setCourseTitle(data.courseTitle || `${location} 데이트 코스`);
        setSummary(data.summary || "실제 장소 동선과 분위기를 고려해 완성된 추천 코스입니다.");
        setGeneratedCourse(data.steps);
        setViewStep("result");
      } else {
        showAlert("추천 장소를 찾지 못했습니다. 조건을 조금 변경해 보세요.", "결과 없음", "🔍");
      }
    } catch (error) {
      console.error("Course Generation Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleReplaceSingleStep = async (stepIndex: number) => {
    const targetStep = generatedCourse[stepIndex];
    if (!targetStep) return;

    if (targetStep.isFixed) {
      showAlert("직접 고정하신 장소입니다.\n조건 수정 화면에서 변경할 수 있습니다.", "고정 장소", "📌");
      return;
    }

    setReplacingStepIndex(stepIndex);

    try {
      const prevPlace = stepIndex > 0 ? generatedCourse[stepIndex - 1]?.place : null;
      const nextPlace = stepIndex < generatedCourse.length - 1 ? generatedCourse[stepIndex + 1]?.place : null;
      const neighbor = prevPlace?.lat ? prevPlace : nextPlace?.lat ? nextPlace : null;

      const currentIds = generatedCourse.map((s) => s.place.id);
      const currentNames = generatedCourse.map((s) => s.place.name);
      
      const originalCat = stepPreferences[stepIndex]?.category || targetStep.place.category;
      let safeTargetCategory: "DINING" | "CAFE" | "ACTIVITY" = "ACTIVITY";
      const catUpper = String(originalCat).toUpperCase();
      if (catUpper === "DINING" || catUpper === "RESTAURANT") safeTargetCategory = "DINING";
      else if (catUpper === "CAFE") safeTargetCategory = "CAFE";
      else safeTargetCategory = "ACTIVITY";

      const targetPref = stepPreferences[stepIndex] || {};

      const res = await fetch("/api/course/replace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          location,
          targetCategory: safeTargetCategory,
          stepPref: targetPref,
          excludePlaceIds: currentIds,
          excludePlaceNames: currentNames,
          neighborCoords: neighbor ? { lat: neighbor.lat, lng: neighbor.lng } : null,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        showAlert(errData.error || "다른 장소를 찾지 못했습니다.", "교체 실패", "🔍");
        return;
      }

      const { place: newPlace, commentary } = await res.json();

      setGeneratedCourse((prevCourse) => {
        const nextCourse = [...prevCourse];
        nextCourse[stepIndex] = {
          ...nextCourse[stepIndex],
          place: newPlace,
          commentary: commentary || nextCourse[stepIndex].commentary,
        };

        return nextCourse.map((s, idx) => {
          if (idx === 0) return { ...s, transitNote: undefined };
          const pPlace = nextCourse[idx - 1]?.place;
          const cPlace = s.place;

          if (pPlace?.lat && pPlace?.lng && cPlace?.lat && cPlace?.lng) {
            const meters = calculateDistanceBetween(pPlace.lat, pPlace.lng, cPlace.lat, cPlace.lng);
            const walkMinutes = Math.max(1, Math.round(meters / 67));
            return {
              ...s,
              transitNote: `도보 약 ${walkMinutes}분 (${meters}m)`,
            };
          }
          return s;
        });
      });
    } catch (e) {
      console.error(e);
      showAlert("새로운 장소를 추천하는 중 오류가 발생했습니다.", "오류", "⚠️");
    } finally {
      setReplacingStepIndex(null);
    }
  };

  if (!mounted) {
    return (
      <main className="max-w-md mx-auto min-h-screen bg-[#FAF7F2] flex items-center justify-center">
        <p className="font-body text-xs text-[#8C7A6B]">화면을 불러오는 중...</p>
      </main>
    );
  }

  return (
    <main className="max-w-md mx-auto min-h-screen px-5 pt-6 pb-12 flex flex-col gap-4 bg-[#FAF7F2] text-[#2D241E]">
      <header className="flex items-center justify-between pb-3 border-b border-[#EADFCF] gap-2">
        <div className="flex items-center gap-2 overflow-hidden min-w-0">
          {viewStep === "result" ? (
            <button
              type="button"
              onClick={() => setViewStep("form")}
              className="font-title text-xs text-[#7A6251] hover:text-[#2D241E] px-3 py-1.5 bg-white border-2 border-[#EADFCF] rounded-2xl shadow-xs transition active:scale-95 flex items-center gap-1 shrink-0 whitespace-nowrap"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>조건 수정</span>
            </button>
          ) : (
            <Link
              href="/"
              className="font-title text-xs text-[#7A6251] hover:text-[#2D241E] px-3.5 py-1.5 bg-white border-2 border-[#EADFCF] rounded-2xl shadow-xs transition active:scale-95 shrink-0 whitespace-nowrap"
            >
              ← 홈으로
            </Link>
          )}

          <h1 className="font-title text-base sm:text-lg tracking-tight text-[#2D241E] truncate whitespace-nowrap">
            {viewStep === "form" ? "코스 어디가지? ✨" : "추천 데이트 코스"}
          </h1>
        </div>

        {viewStep === "result" && (
          <Link
            href="/"
            className="font-title text-xs text-[#7A6251] hover:text-[#2D241E] px-3 py-1.5 bg-white border-2 border-[#EADFCF] rounded-2xl shadow-xs transition active:scale-95 shrink-0 whitespace-nowrap flex items-center gap-1"
          >
            <span>🏠 홈으로</span>
          </Link>
        )}
      </header>

      {viewStep === "form" && (
        <div className="flex flex-col gap-4">
          <div className="flex rounded-2xl bg-[#EFE8DC] p-1 text-xs border border-[#E2D5C3]">
            <button
              type="button"
              onClick={() => setPlannerMode("quick")}
              className={`flex-1 py-2.5 rounded-xl font-title transition flex items-center justify-center gap-1.5 active:scale-95 ${
                plannerMode === "quick"
                  ? "bg-[#2D241E] text-[#F3D5B5] shadow-xs"
                  : "text-[#7A6251] hover:text-[#2D241E]"
              }`}
            >
              <span>⚡ 퀵 모드</span>
            </button>

            <button
              type="button"
              onClick={() => setPlannerMode("custom")}
              className={`flex-1 py-2.5 rounded-xl font-title transition flex items-center justify-center gap-1.5 active:scale-95 ${
                plannerMode === "custom"
                  ? "bg-[#2D241E] text-[#F3D5B5] shadow-xs"
                  : "text-[#7A6251] hover:text-[#2D241E]"
              }`}
            >
              <span>⚙️ 세부 모드</span>
            </button>
          </div>

          {plannerMode === "quick" && (
            <div className="bg-[#FAF0E6] border-2 border-[#F2D6C6] rounded-[24px] p-4 flex flex-col gap-1 shadow-2xs animate-in fade-in duration-200">
              <span className="font-title text-[11px] text-[#C25E3E] flex items-center gap-1">
                <span>⚡</span> 퀵 모드란?
              </span>
              <p className="font-body text-xs text-[#6F5B4D] leading-relaxed break-keep">
                세부 선택지 없이 빠르게 코스를 짜고 싶을 때, AI가 스스로 분석하여 좋은 조합을 찾아드립니다.
              </p>
            </div>
          )}

          <section
            ref={locationContainerRef}
            className="relative bg-white p-5 rounded-[26px] border-2 border-[#EADFCF] shadow-[0_4px_16px_rgba(74,59,50,0.03)] flex flex-col gap-3 z-30"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="font-title text-[10px] text-[#C25E3E] bg-[#F9ECE7] px-2 py-0.5 rounded-md border border-[#F2D1C5]">
                  만날 위치
                </span>
                <span className="font-title text-xs text-[#2D241E]">어디서 만날까요?</span>
              </div>
              <span className="font-body text-[11px] text-[#A89889]">목록에서 장소를 선택해주세요</span>
            </div>

            {selectedLocationDetail ? (
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#FAF7F2] border-2 border-[#EADFCF]">
                <div className="overflow-hidden pr-2">
                  <div className="flex items-center gap-1.5">
                    <span className="font-title text-xs text-[#2D241E] truncate">
                      📍 {selectedLocationDetail.name}
                    </span>
                    <span className="font-title text-[10px] bg-[#F9ECE7] text-[#C25E3E] px-1.5 py-0.2 rounded border border-[#F2D1C5] shrink-0">
                      선택됨
                    </span>
                  </div>
                  {selectedLocationDetail.address && (
                    <p className="font-body text-[11px] text-[#8C7A6B] mt-0.5 truncate">
                      {selectedLocationDetail.address}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setLocationInput(location);
                    setSelectedLocationDetail(null);
                    setShowLocationSuggestions(true);
                  }}
                  className="font-title text-xs text-[#C25E3E] hover:underline shrink-0 pl-2"
                >
                  변경
                </button>
              </div>
            ) : (
              <form onSubmit={handleLocationSubmit} className="relative flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={locationInput}
                    onChange={(e) => setLocationInput(e.target.value)}
                    onFocus={() => {
                      if (locationSuggestions.length > 0) setShowLocationSuggestions(true);
                    }}
                    placeholder="지하철역, 동네명 검색 (예: 서면역, 동성로, 성수동)"
                    className="font-body w-full rounded-xl border-2 border-[#EADFCF] px-4 py-2.5 text-xs bg-[#FAF7F2] text-[#2D241E] outline-none focus:border-[#C25E3E] transition"
                  />
                  {isSearchingLocation && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 border-2 border-[#C25E3E] border-t-transparent rounded-full animate-spin" />
                  )}
                </div>

                <button
                  type="submit"
                  className="font-title rounded-xl bg-[#2D241E] px-4 py-2.5 text-xs text-white hover:bg-[#43362E] transition flex items-center gap-1 active:scale-95 shrink-0"
                >
                  <Search className="h-3.5 w-3.5" />
                  <span>검색</span>
                </button>

                {showLocationSuggestions && locationSuggestions.length > 0 && (
                  <div className="absolute top-12 left-0 right-0 bg-white border-2 border-[#EADFCF] rounded-2xl shadow-xl overflow-hidden z-50 flex flex-col divide-y divide-[#F2EAE0] animate-in fade-in zoom-in-95 duration-100">
                    <div className="bg-[#FAF7F2] px-3.5 py-2 text-[10px] font-title text-[#7A6251] flex justify-between items-center">
                      <span>👇 만날 장소를 선택해주세요</span>
                      <button
                        type="button"
                        onClick={() => setShowLocationSuggestions(false)}
                        className="text-[#A89889] hover:text-[#2D241E]"
                      >
                        닫기 ✕
                      </button>
                    </div>

                    <div className="max-h-56 overflow-y-auto">
                      {locationSuggestions.map((place, idx) => {
                        const district = getDistrictBadge(place.address || place.road_address_name || place.address_name);
                        return (
                          <button
                            key={`${place.id || idx}`}
                            type="button"
                            onClick={() => handleSelectLocationSuggestion(place)}
                            className="w-full px-3.5 py-3 text-left hover:bg-[#F9ECE7]/50 transition flex flex-col gap-0.5 active:bg-[#F6EFE6] group"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5 overflow-hidden">
                                {district && (
                                  <span className="font-title text-[9px] bg-[#EFE9DF] text-[#7A6251] group-hover:bg-[#C25E3E] group-hover:text-white px-1.5 py-0.5 rounded shrink-0 transition-colors">
                                    {district}
                                  </span>
                                )}
                                <span className="font-title text-xs text-[#2D241E] group-hover:text-[#C25E3E] truncate transition-colors">
                                  {place.name || place.place_name}
                                </span>
                              </div>

                              {place.category && (
                                <span className="font-body text-[10px] text-[#A89889] shrink-0 pl-1">
                                  {getCategoryLabel(place.category)}
                                </span>
                              )}
                            </div>

                            <span className="font-body text-[11px] text-[#8C7A6B] truncate pl-0.5">
                              {place.address || place.road_address_name || place.address_name}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </form>
            )}
          </section>

          <section className="bg-white p-5 rounded-[26px] border-2 border-[#EADFCF] shadow-[0_4px_16px_rgba(74,59,50,0.03)] flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="font-title text-[10px] text-[#C25E3E] bg-[#F9ECE7] px-2 py-0.5 rounded-md border border-[#F2D1C5]">
                  시간 설정
                </span>
                <span className="font-title text-xs text-[#2D241E]">몇 시에 만날까요?</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsTimePickerOpen(true)}
              className="flex items-center justify-between p-3.5 rounded-2xl bg-[#FAF7F2] hover:bg-[#F6EFE6] border-2 border-[#EADFCF] transition-all active:scale-[0.99] text-left group"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white border border-[#EADFCF] text-[#C25E3E] shadow-2xs">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <span className="font-body text-[11px] text-[#8C7A6B]">약속 시작 시간</span>
                  <p className="font-title text-base text-[#2D241E]">{formatFriendlyTime(startTime)}</p>
                </div>
              </div>

              <div className="flex items-center gap-1 font-title text-xs text-[#C25E3E] bg-white border border-[#EADFCF] px-3 py-1.5 rounded-xl shadow-2xs group-hover:border-[#C25E3E] transition">
                <span>시간 변경</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </div>
            </button>
          </section>

          {plannerMode === "quick" && (
            <section className="bg-white p-5 rounded-[26px] border-2 border-[#EADFCF] shadow-[0_4px_16px_rgba(74,59,50,0.03)] flex flex-col gap-3.5 animate-in fade-in duration-150">
              <div>
                <h2 className="font-title text-sm text-[#2D241E]">가고 싶은 코스 고르기</h2>
                <p className="font-body text-xs text-[#8C7A6B] mt-0.5">
                  버튼을 누르는 순서대로 코스가 추가돼요 (중복 선택 가능)
                </p>
              </div>

              <div className="flex gap-2">
                {[
                  { id: "DINING" as const, label: "식사", icon: Utensils },
                  { id: "CAFE" as const, label: "카페", icon: Coffee },
                  { id: "ACTIVITY" as const, label: "놀거리", icon: Footprints },
                ].map((item) => {
                  const IconComponent = item.icon;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleToggleQuickCategory(item.id)}
                      className="font-title flex flex-1 items-center justify-center gap-1.5 rounded-xl border-2 border-[#EADFCF] bg-[#FAF7F2] py-3 text-xs text-[#7A6251] shadow-2xs hover:bg-[#F3ECE0] transition-all active:scale-95"
                    >
                      <Plus className="h-3.5 w-3.5 text-[#C25E3E]" />
                      <IconComponent className="h-3.5 w-3.5" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>

              <div className="rounded-xl bg-[#FAF7F2] border border-[#EADFCF] p-3 text-xs flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="font-title text-[#7A6251]">예정 코스 ({quickOrder.length}단계):</span>
                  <span className="font-body text-[10px] text-[#A89889]">클릭 시 해당 단계 삭제</span>
                </div>

                {quickOrder.length === 0 ? (
                  <p className="font-body text-[11px] text-[#A89889] py-1 text-center">
                    위 버튼을 눌러 원하는 코스를 담아주세요! (예: 식사 → 카페)
                  </p>
                ) : (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {quickOrder.map((cat, idx) => (
                      <button
                        key={`${cat}-${idx}`}
                        type="button"
                        onClick={() => handleRemoveQuickCategory(idx)}
                        className="font-title flex items-center gap-1 bg-white border border-[#EADFCF] px-2.5 py-1.5 rounded-lg text-[#2D241E] shadow-2xs hover:border-[#C25E3E] hover:text-[#C25E3E] group transition-all"
                      >
                        <span className="text-[#C25E3E]">{idx + 1}.</span>
                        <span>{getCategoryLabel(cat)}</span>
                        <X className="h-3 w-3 text-[#A89889] group-hover:text-[#C25E3E] ml-0.5" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </section>
          )}

          {plannerMode === "custom" && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <section className="bg-white p-5 rounded-[26px] border-2 border-[#EADFCF] shadow-[0_4px_16px_rgba(74,59,50,0.03)] flex flex-col gap-3">
                <div>
                  <h2 className="font-title text-sm text-[#2D241E]">코스 순서 직접 구성하기</h2>
                  <p className="font-body text-xs text-[#8C7A6B] mt-0.5">
                    버튼을 누르는 순서대로 코스가 추가돼요 (식사 2회 등 중복 가능)
                  </p>
                </div>

                <div className="flex gap-2">
                  {[
                    { id: "DINING" as const, label: "식사", icon: Utensils },
                    { id: "CAFE" as const, label: "카페", icon: Coffee },
                    { id: "ACTIVITY" as const, label: "놀거리", icon: Footprints },
                  ].map((item) => {
                    const IconComponent = item.icon;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleAddCustomCategory(item.id)}
                        className="font-title flex flex-1 items-center justify-center gap-1.5 rounded-xl border-2 border-[#EADFCF] bg-[#FAF7F2] py-3 text-xs text-[#7A6251] shadow-2xs hover:bg-[#F3ECE0] transition-all active:scale-95"
                      >
                        <Plus className="h-3.5 w-3.5 text-[#C25E3E]" />
                        <IconComponent className="h-3.5 w-3.5" />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="rounded-xl bg-[#FAF7F2] border border-[#EADFCF] p-3 text-xs flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="font-title text-[#7A6251]">예정 코스 ({stepPreferences.length}단계):</span>
                    <span className="font-body text-[10px] text-[#A89889]">클릭 시 해당 단계 삭제</span>
                  </div>

                  {stepPreferences.length === 0 ? (
                    <p className="font-body text-[11px] text-[#A89889] py-1 text-center">
                      위 버튼을 눌러 원하는 순서대로 코스를 추가해주세요!
                    </p>
                  ) : (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {stepPreferences.map((step, idx) => (
                        <button
                          key={step.id}
                          type="button"
                          onClick={() => handleRemoveCustomStep(idx)}
                          className="font-title flex items-center gap-1 bg-white border border-[#EADFCF] px-2.5 py-1.5 rounded-lg text-[#2D241E] shadow-2xs hover:border-[#C25E3E] hover:text-[#C25E3E] group transition-all"
                        >
                          <span className="text-[#C25E3E]">{idx + 1}.</span>
                          <span>{getCategoryLabel(step.category)}</span>
                          <X className="h-3 w-3 text-[#A89889] group-hover:text-[#C25E3E] ml-0.5" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </section>

              {stepPreferences.map((step, idx) => {
                const orderNum = idx + 1;
                const fixedAtThisStep = fixedPlaces.find((p) => p.targetStepIndex === idx);

                if (step.category === "DINING") {
                  return (
                    <section
                      key={step.id}
                      className="bg-white p-5 rounded-[26px] border-2 border-[#EADFCF] shadow-[0_4px_16px_rgba(74,59,50,0.03)] flex flex-col gap-3.5"
                    >
                      <div className="flex items-center justify-between border-b border-[#F2EAE0] pb-2">
                        <div className="flex items-center gap-1.5 font-title text-xs text-[#2D241E]">
                          <Utensils className="h-3.5 w-3.5 text-[#C25E3E]" />
                          <span>{orderNum}번째 코스: 식사 취향</span>
                        </div>
                        <span className="font-title text-[10px] bg-[#F9ECE7] text-[#C25E3E] px-2 py-0.5 rounded-md border border-[#F2D1C5]">
                          Step {orderNum}
                        </span>
                      </div>

                      {fixedAtThisStep ? (
                        <div className="rounded-xl bg-[#FAF7F2] border border-[#EADFCF] p-3 text-xs">
                          <span className="font-title text-[#C25E3E]">📌 고정 장소 지정됨: </span>
                          <span className="font-title text-[#2D241E]">{fixedAtThisStep.name}</span>
                          <p className="font-body text-[11px] text-[#8C7A6B] mt-0.5">
                            이 단계에는 내가 직접 고른 식당이 추천됩니다.
                          </p>
                        </div>
                      ) : (
                        <>
                          <div className="space-y-1.5">
                            <span className="font-body text-xs text-[#8C7A6B]">음식 종류</span>
                            <div className="flex gap-1.5 flex-wrap">
                              {["분식", "한식", "중식", "일식", "양식", "족발/보쌈", "주점", "고기/구이", "아시안"].map(
                                (food) => (
                                  <button
                                    key={food}
                                    type="button"
                                    onClick={() => updateStepPref(idx, { cuisine: [food] })}
                                    className={`font-title px-3 py-1.5 rounded-xl text-xs border transition-all active:scale-95 ${
                                      (step.cuisine || []).includes(food)
                                        ? "bg-[#2D241E] text-[#F3D5B5] border-[#2D241E]"
                                        : "bg-[#FAF7F2] text-[#7A6251] border-[#EADFCF] hover:bg-[#F3ECE0]"
                                    }`}
                                  >
                                    {food}
                                  </button>
                                )
                              )}
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <span className="font-body text-xs text-[#8C7A6B]">선호 메뉴</span>
                            <div className="flex gap-1.5">
                              {["밥", "면", "기타"].map((opt) => (
                                <button
                                  key={opt}
                                  type="button"
                                  onClick={() => updateStepPref(idx, { diningPref: opt })}
                                  className={`font-title px-3 py-1.5 rounded-xl text-xs border transition-all active:scale-95 ${
                                    step.diningPref === opt
                                      ? "bg-[#2D241E] text-[#F3D5B5] border-[#2D241E]"
                                      : "bg-[#FAF7F2] text-[#7A6251] border-[#EADFCF] hover:bg-[#F3ECE0]"
                                  }`}
                                >
                                  {opt}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <span className="font-body text-xs text-[#8C7A6B]">웨이팅 성향</span>
                            <div className="flex gap-1.5">
                              {["웨이팅 없음", "웨이팅 가능"].map((opt) => (
                                <button
                                  key={opt}
                                  type="button"
                                  onClick={() => updateStepPref(idx, { diningWaiting: opt })}
                                  className={`font-title px-3 py-1.5 rounded-xl text-xs border transition-all active:scale-95 ${
                                    step.diningWaiting === opt
                                      ? "bg-[#2D241E] text-[#F3D5B5] border-[#2D241E]"
                                      : "bg-[#FAF7F2] text-[#7A6251] border-[#EADFCF] hover:bg-[#F3ECE0]"
                                  }`}
                                >
                                  {opt}
                                </button>
                              ))}
                            </div>
                          </div>
                        </>
                      )}
                    </section>
                  );
                }

                if (step.category === "CAFE") {
                  return (
                    <section
                      key={step.id}
                      className="bg-white p-5 rounded-[26px] border-2 border-[#EADFCF] shadow-[0_4px_16px_rgba(74,59,50,0.03)] flex flex-col gap-3.5"
                    >
                      <div className="flex items-center justify-between border-b border-[#F2EAE0] pb-2">
                        <div className="flex items-center gap-1.5 font-title text-xs text-[#2D241E]">
                          <Coffee className="h-3.5 w-3.5 text-[#A86F3D]" />
                          <span>{orderNum}번째 코스: 카페 취향</span>
                        </div>
                        <span className="font-title text-[10px] bg-[#FBF5ED] text-[#A86F3D] px-2 py-0.5 rounded-md border border-[#EFE4D6]">
                          Step {orderNum}
                        </span>
                      </div>

                      {fixedAtThisStep ? (
                        <div className="rounded-xl bg-[#FAF7F2] border border-[#EADFCF] p-3 text-xs">
                          <span className="font-title text-[#A86F3D]">📌 고정 장소 지정됨: </span>
                          <span className="font-title text-[#2D241E]">{fixedAtThisStep.name}</span>
                          <p className="font-body text-[11px] text-[#8C7A6B] mt-0.5">
                            이 단계에는 내가 직접 고른 카페가 추천됩니다.
                          </p>
                        </div>
                      ) : (
                        <>
                          <div className="space-y-1.5">
                            <span className="font-body text-xs text-[#8C7A6B]">카페 유형</span>
                            <div className="flex gap-1.5">
                              {["개인 카페", "대형/프랜차이즈"].map((type) => (
                                <button
                                  key={type}
                                  type="button"
                                  onClick={() => updateStepPref(idx, { cafeType: type })}
                                  className={`font-title px-3 py-1.5 rounded-xl text-xs border transition-all active:scale-95 ${
                                    step.cafeType === type
                                      ? "bg-[#2D241E] text-[#F3D5B5] border-[#2D241E]"
                                      : "bg-[#FAF7F2] text-[#7A6251] border-[#EADFCF] hover:bg-[#F3ECE0]"
                                  }`}
                                >
                                  {type}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <span className="font-body text-xs text-[#8C7A6B]">카페 테마 & 디저트</span>
                            <div className="flex gap-1.5 flex-wrap">
                              {["디저트 전문", "베이커리 카페", "감성/분위기", "조용한/대화"].map((option) => (
                                <button
                                  key={option}
                                  type="button"
                                  onClick={() => updateStepPref(idx, { cafeDessert: option })}
                                  className={`font-title px-3 py-1.5 rounded-xl text-xs border transition-all active:scale-95 ${
                                    step.cafeDessert === option
                                      ? "bg-[#2D241E] text-[#F3D5B5] border-[#2D241E]"
                                      : "bg-[#FAF7F2] text-[#7A6251] border-[#EADFCF] hover:bg-[#F3ECE0]"
                                  }`}
                                >
                                  {option}
                                </button>
                              ))}
                            </div>
                          </div>
                        </>
                      )}
                    </section>
                  );
                }

                return (
                  <section
                    key={step.id}
                    className="bg-white p-5 rounded-[26px] border-2 border-[#EADFCF] shadow-[0_4px_16px_rgba(74,59,50,0.03)] flex flex-col gap-3.5"
                  >
                    <div className="flex items-center justify-between border-b border-[#F2EAE0] pb-2">
                      <div className="flex items-center gap-1.5 font-title text-xs text-[#2D241E]">
                        <Sparkles className="h-3.5 w-3.5 text-[#524237]" />
                        <span>{orderNum}번째 코스: 놀거리 / 활동 취향</span>
                      </div>
                      <span className="font-title text-[10px] bg-[#EFE9DF] text-[#524237] px-2 py-0.5 rounded-md border border-[#E3D9CC]">
                        Step {orderNum}
                      </span>
                    </div>

                    {fixedAtThisStep ? (
                      <div className="rounded-xl bg-[#FAF7F2] border border-[#EADFCF] p-3 text-xs">
                        <span className="font-title text-[#524237]">📌 고정 장소 지정됨: </span>
                        <span className="font-title text-[#2D241E]">{fixedAtThisStep.name}</span>
                        <p className="font-body text-[11px] text-[#8C7A6B] mt-0.5">
                          이 단계에는 내가 직접 고른 놀거리 장소가 추천됩니다.
                        </p>
                      </div>
                    ) : (
                      <>
                        <div className="space-y-1.5">
                          <span className="font-body text-xs text-[#8C7A6B]">분위기</span>
                          <div className="flex gap-1.5">
                            {["액티비티", "잔잔한 힐링"].map((pace) => (
                              <button
                                key={pace}
                                type="button"
                                onClick={() => updateStepPref(idx, { activityPace: pace })}
                                className={`font-title px-3 py-1.5 rounded-xl text-xs border transition-all active:scale-95 ${
                                  step.activityPace === pace
                                    ? "bg-[#2D241E] text-[#F3D5B5] border-[#2D241E]"
                                    : "bg-[#FAF7F2] text-[#7A6251] border-[#EADFCF] hover:bg-[#F3ECE0]"
                                }`}
                              >
                                {pace}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <span className="font-body text-xs text-[#8C7A6B]">장소 환경</span>
                          <div className="flex gap-1.5">
                            {["실내", "야외"].map((env) => (
                              <button
                                key={env}
                                type="button"
                                onClick={() => updateStepPref(idx, { activityEnvironment: env })}
                                className={`font-title px-3 py-1.5 rounded-xl text-xs border transition-all active:scale-95 ${
                                  step.activityEnvironment === env
                                    ? "bg-[#2D241E] text-[#F3D5B5] border-[#2D241E]"
                                    : "bg-[#FAF7F2] text-[#7A6251] border-[#EADFCF] hover:bg-[#F3ECE0]"
                                }`}
                              >
                                {env}
                              </button>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </section>
                );
              })}

              <section className="bg-white p-5 rounded-[26px] border-2 border-[#EADFCF] shadow-[0_4px_16px_rgba(74,59,50,0.03)] flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="font-title text-[10px] text-[#C25E3E] bg-[#F9ECE7] px-2 py-0.5 rounded-md border border-[#F2D1C5]">
                      고정 장소
                    </span>
                    <span className="font-title text-xs text-[#2D241E]">미리 가기로 한 장소 (선택)</span>
                  </div>
                  <span className="font-body text-[11px] text-[#A89889]">지정한 코스 순서에 들어갑니다</span>
                </div>

                {fixedPlaces.length > 0 && (
                  <div className="space-y-2">
                    {fixedPlaces.map((place) => (
                      <div
                        key={place.id}
                        className="flex items-center justify-between rounded-xl border border-[#EADFCF] bg-[#FAF7F2] p-3"
                      >
                        <div className="pr-2 overflow-hidden">
                          <div className="flex items-center gap-1.5">
                            <span className="font-title text-[10px] bg-[#2D241E] text-[#F3D5B5] px-2 py-0.5 rounded-md">
                              {place.targetStepIndex + 1}번째 코스
                            </span>
                            <p className="font-title text-xs text-[#2D241E] truncate">{place.name}</p>
                            <span className="font-title text-[10px] rounded bg-[#F9ECE7] text-[#C25E3E] px-1.5 py-0.5 border border-[#F2D1C5] shrink-0">
                              {getCategoryLabel(place.category)}
                            </span>
                          </div>
                          <p className="font-body text-[11px] text-[#8C7A6B] truncate mt-0.5">{place.address}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveFixedPlace(place.id)}
                          className="p-1 text-[#A89889] hover:text-[#C25E3E] transition-colors shrink-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <button
                  type="button"
                  disabled={stepPreferences.length === 0}
                  onClick={() => {
                    setSelectedPlaceToAssign(null);
                    setIsModalOpen(true);
                  }}
                  className="font-title flex w-full items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-[#DFCBB5] py-3 text-xs text-[#7A6251] hover:bg-[#FAF7F2] transition active:scale-95 disabled:opacity-50"
                >
                  <Plus className="h-3.5 w-3.5 text-[#C25E3E]" />
                  <span>
                    {stepPreferences.length === 0 ? "먼저 위에서 코스를 추가해주세요" : "가고 싶은 장소 및 순서 지정하기"}
                  </span>
                </button>
              </section>
            </div>
          )}

          <div className="sticky bottom-4 pt-2">
            <button
              type="button"
              onClick={handleGenerateCourse}
              disabled={loading}
              className="font-title w-full py-4 bg-[#2D241E] hover:bg-[#43362E] active:scale-[0.98] text-[#F3D5B5] text-xs rounded-2xl transition shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-[#F3D5B5] border-t-transparent rounded-full animate-spin" />
                  <span>동선과 찜 목록을 정밀 분석 중...</span>
                </>
              ) : (
                <span>{plannerMode === "quick" ? "⚡ AI 퀵 코스 만들기" : "✨ 맞춤 데이트 코스 만들기"}</span>
              )}
            </button>
          </div>
        </div>
      )}

      {viewStep === "result" && (
        <div className="flex flex-col gap-4">
          <div className="bg-white rounded-[26px] p-5 border-2 border-[#EADFCF] shadow-[0_4px_16px_rgba(74,59,50,0.03)] flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="font-title text-[10px] text-[#C25E3E] bg-[#F9ECE7] px-2 py-0.5 rounded-md border border-[#F2D1C5]">
                AI RECOMMENDED
              </span>
              <span className="font-title text-[10px] bg-[#FAF7F2] text-[#7A6251] px-2.5 py-0.5 rounded-full border border-[#EADFCF]">
                총 {generatedCourse.length}개 장소
              </span>
            </div>
            <h2 className="font-title text-xl text-[#2D241E] tracking-tight mt-1">{courseTitle}</h2>
            <p className="font-body text-xs text-[#8C7A6B] leading-relaxed">{summary}</p>
          </div>

          <CourseMap steps={generatedCourse} />

          <div className="flex flex-col gap-3">
            {generatedCourse.map((step, idx) => {
              const kakaoMapUrl =
                step.place.placeUrl || `https://map.kakao.com/link/search/${encodeURIComponent(step.place.name)}`;
              const isLiked = likedPlaceIds.has(step.place.id);
              const isReplacingThis = replacingStepIndex === idx;

              return (
                <div key={idx} className="relative flex flex-col gap-1.5">
                  {step.transitNote && (
                    <div className="flex items-center gap-1.5 px-4 text-[11px] font-title text-[#7A6251]">
                      <span className="text-[#C25E3E]">↳</span>
                      <span>{step.transitNote}</span>
                    </div>
                  )}

                  <div className="bg-white rounded-[24px] p-4.5 border-2 border-[#EADFCF] shadow-[0_4px_16px_rgba(74,59,50,0.03)] flex flex-col gap-2.5 transition-all">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs text-[#8C7A6B]">
                        <Clock className="h-3.5 w-3.5 text-[#C25E3E]" />
                        <span className="font-title text-xs text-[#2D241E]">{step.time}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="overflow-hidden pr-2">
                        <div className="flex items-center gap-2">
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#2D241E] text-[10px] font-bold text-white shrink-0">
                            {idx + 1}
                          </span>
                          <h3 className="font-title text-sm text-[#2D241E] truncate">{step.place.name}</h3>
                          {step.isFixed && (
                            <span className="font-title text-[10px] rounded bg-[#F9ECE7] text-[#C25E3E] px-1.5 py-0.2 border border-[#F2D1C5] shrink-0">
                              내가 고른 장소
                            </span>
                          )}
                        </div>
                        <p className="font-body text-xs text-[#8C7A6B] mt-1 truncate pl-7">{step.place.address}</p>
                      </div>

                      <button
                        type="button"
                        onClick={() => setLikePlaceTarget(step.place)}
                        className={`p-2 rounded-full transition-transform active:scale-90 border shrink-0 ${
                          isLiked
                            ? "bg-[#F9ECE7] border-[#F2D1C5] text-[#C25E3E]"
                            : "bg-white border-[#EADFCF] text-[#A89889] hover:text-[#C25E3E]"
                        }`}
                        title="이 장소 지도에 찜하기"
                      >
                        <Heart className={`h-4 w-4 ${isLiked ? "fill-current text-[#C25E3E]" : ""}`} />
                      </button>
                    </div>

                    <div className="rounded-xl bg-[#FAF7F2] p-3 text-xs leading-relaxed text-[#5F5147] border border-[#EADFCF]">
                      💡 {step.commentary}
                    </div>

                    <div className="flex gap-2 pt-1 border-t border-[#F2EAE0]">
                      <a
                        href={kakaoMapUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="font-title flex flex-1 items-center justify-center gap-1 rounded-xl border border-[#EADFCF] bg-[#FAF7F2] py-2.5 text-xs text-[#7A6251] hover:bg-[#F3ECE0] transition"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        <span>장소 정보</span>
                      </a>

                      {step.isFixed ? (
                        <div className="font-title flex flex-1 items-center justify-center rounded-xl bg-[#F5EFE6] text-[#A89889] py-2.5 text-xs border border-[#EADFCF] cursor-not-allowed">
                          <span>고정된 장소 🔒</span>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleReplaceSingleStep(idx)}
                          disabled={isReplacingThis || replacingStepIndex !== null}
                          className="font-title flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#2D241E] py-2.5 text-xs text-[#F3D5B5] hover:bg-[#43362E] transition active:scale-95 disabled:opacity-50 shadow-2xs"
                        >
                          <RefreshCw className={`h-3.5 w-3.5 ${isReplacingThis ? "animate-spin text-[#C25E3E]" : ""}`} />
                          <span>{isReplacingThis ? "새 장소 찾는 중..." : "다른 곳 추천"}</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            <button
              type="button"
              onClick={() => setViewStep("form")}
              className="font-title flex items-center justify-center gap-1.5 rounded-2xl border-2 border-[#EADFCF] bg-white py-3 px-4 text-xs text-[#7A6251] hover:bg-[#FAF7F2] transition active:scale-95 shadow-xs"
            >
              <RotateCw className="h-3.5 w-3.5" />
              다시 추천
            </button>

            <button
              type="button"
              onClick={() => setIsCourseFolderModalOpen(true)}
              className="font-title flex flex-1 items-center justify-center gap-1.5 rounded-2xl bg-[#C25E3E] hover:bg-[#B04E30] py-3 text-xs text-white shadow-xs transition active:scale-95"
            >
              <FolderCheck className="h-3.5 w-3.5" />
              코스 확정 (폴더에 저장)
            </button>

            <button
              type="button"
              onClick={() => setIsShareModalOpen(true)}
              className="font-title flex flex-1 items-center justify-center gap-1.5 rounded-2xl bg-[#2D241E] hover:bg-[#43362E] py-3 text-xs text-[#F3D5B5] shadow-xs transition active:scale-95"
            >
              <Share2 className="h-3.5 w-3.5" />
              공유하기
            </button>
          </div>
        </div>
      )}

      <TimePickerModal
        isOpen={isTimePickerOpen}
        onClose={() => setIsTimePickerOpen(false)}
        currentTime={startTime}
        onSelectTime={(newTime) => setStartTime(newTime)}
      />

      <PlaceLikeModal
        isOpen={Boolean(likePlaceTarget)}
        place={likePlaceTarget}
        onClose={() => setLikePlaceTarget(null)}
        onSaved={(id) => setLikedPlaceIds((prev) => new Set(prev).add(id))}
      />

      <SaveCourseToFolderModal
        isOpen={isCourseFolderModalOpen}
        onClose={() => setIsCourseFolderModalOpen(false)}
        courseTitle={courseTitle}
        summary={summary}
        location={location}
        steps={generatedCourse}
        onSuccess={() => {}}
        showAlert={showAlert}
      />

      <ShareCourseModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        courseTitle={courseTitle}
        location={location}
        steps={generatedCourse}
      />

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#2D241E]/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-[30px] bg-[#FAF7F2] p-5 shadow-2xl border-2 border-[#EADFCF] flex flex-col gap-3 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-[#EADFCF]">
              <h3 className="font-title text-base text-[#2D241E]">
                {selectedPlaceToAssign ? "어느 순서에 추가할까요?" : "가고 싶은 장소 검색"}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsModalOpen(false);
                  setSelectedPlaceToAssign(null);
                }}
                className="text-[#A89889] hover:text-[#2D241E] p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {!selectedPlaceToAssign ? (
              <>
                <div className="flex gap-2">
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
                    placeholder={location ? `${location} 주변 상호명/장소명 입력` : "상호명/장소명 입력"}
                    className="font-body flex-1 rounded-xl border-2 border-[#EADFCF] px-3.5 py-2 text-xs bg-white text-[#2D241E] outline-none focus:border-[#C25E3E]"
                  />
                  <button
                    type="button"
                    onClick={handleSearchPlaces}
                    className="font-title rounded-xl bg-[#2D241E] px-4 py-2 text-xs text-white hover:bg-[#43362E] transition flex items-center gap-1 active:scale-95"
                  >
                    <Search className="h-3.5 w-3.5" />
                    <span>검색</span>
                  </button>
                </div>

                <div className="max-h-60 overflow-y-auto space-y-1.5 pr-0.5">
                  {isSearching ? (
                    <p className="font-body py-6 text-center text-xs text-[#A89889]">카카오 지도에서 위치를 찾는 중...</p>
                  ) : searchResults.length > 0 ? (
                    searchResults.map((p) => (
                      <div
                        key={p.id}
                        onClick={() => handleSelectPlaceForAssignment(p)}
                        className="flex cursor-pointer flex-col rounded-xl border border-[#EADFCF] bg-white p-3 transition-colors hover:bg-[#F9ECE7] hover:border-[#F2D1C5]"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-title text-xs text-[#2D241E] truncate">{p.name}</span>
                          <span className="font-title text-[10px] rounded bg-[#FAF7F2] border border-[#EADFCF] px-1.5 py-0.5 text-[#7A6251] shrink-0">
                            {getCategoryLabel(p.category)}
                          </span>
                        </div>
                        <span className="font-body text-[11px] text-[#8C7A6B] mt-0.5 truncate">{p.address}</span>
                      </div>
                    ))
                  ) : (
                    <p className="font-body py-6 text-center text-xs text-[#A89889]">
                      원하는 장소를 검색한 후 클릭해 선택하세요.
                    </p>
                  )}
                </div>
              </>
            ) : (
              <div className="space-y-3.5">
                <div className="rounded-xl bg-white p-3 border-2 border-[#EADFCF]">
                  <span className="font-title text-[10px] text-[#C25E3E] uppercase">선택한 장소</span>
                  <p className="font-title text-sm text-[#2D241E] mt-0.5">{selectedPlaceToAssign.name}</p>
                  <p className="font-body text-xs text-[#8C7A6B] mt-0.5">{selectedPlaceToAssign.address}</p>
                </div>

                <div className="space-y-2">
                  <span className="font-title text-xs text-[#7A6251] block">
                    이 장소를 추가할 코스 순서를 골라주세요:
                  </span>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-0.5">
                    {stepPreferences.map((step, idx) => {
                      const isCategoryMatch = step.category === selectedPlaceToAssign.category;
                      const isChecked = targetStepIndexToAssign === idx;

                      return (
                        <label
                          key={step.id}
                          className={`flex items-center justify-between p-3 rounded-xl border-2 cursor-pointer transition-all ${
                            isChecked
                              ? "border-[#2D241E] bg-[#2D241E] text-[#F3D5B5] shadow-xs"
                              : "border-[#EADFCF] bg-white hover:bg-[#FAF7F2] text-[#2D241E]"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="radio"
                              name="stepAssignment"
                              checked={isChecked}
                              onChange={() => setTargetStepIndexToAssign(idx)}
                              className="hidden"
                            />
                            <span
                              className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-title ${
                                isChecked ? "bg-[#C25E3E] text-white" : "bg-[#FAF7F2] text-[#7A6251] border border-[#EADFCF]"
                              }`}
                            >
                              {idx + 1}
                            </span>
                            <span className="font-title text-xs">
                              {idx + 1}번째 코스: {getCategoryLabel(step.category)}
                            </span>
                          </div>
                          {isCategoryMatch ? (
                            <span
                              className={`font-title text-[10px] px-2 py-0.5 rounded-md ${
                                isChecked ? "bg-white/20 text-[#FAF7F2]" : "bg-[#F1F7EE] text-[#5B8C51] border border-[#D5E8CE]"
                              }`}
                            >
                              카테고리 일치
                            </span>
                          ) : (
                            <span
                              className={`font-body text-[10px] px-1.5 py-0.5 rounded-md ${
                                isChecked ? "text-[#C8B8A6]" : "text-[#A89889]"
                              }`}
                            >
                              {getCategoryLabel(step.category)} 단계
                            </span>
                          )}
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setSelectedPlaceToAssign(null)}
                    className="font-title flex-1 rounded-xl border-2 border-[#EADFCF] py-2.5 text-xs text-[#7A6251] hover:bg-[#FAF7F2] transition"
                  >
                    다시 검색
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmAddFixedPlace}
                    className="font-title flex-1 rounded-xl bg-[#2D241E] hover:bg-[#43362E] py-2.5 text-xs text-[#F3D5B5] shadow-xs transition"
                  >
                    이 순서에 장소 확정
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <AlertModal
        isOpen={alertConfig.isOpen}
        onClose={() => setAlertConfig((prev) => ({ ...prev, isOpen: false }))}
        title={alertConfig.title}
        message={alertConfig.message}
        emoji={alertConfig.emoji}
      />

      <ConfirmModal
        isOpen={confirmConfig.isOpen}
        onClose={() => setConfirmConfig((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={confirmConfig.onConfirm}
        title={confirmConfig.title}
        message={confirmConfig.message}
        confirmText={confirmConfig.confirmText}
        cancelText={confirmConfig.cancelText}
        emoji={confirmConfig.emoji}
      />
    </main>
  );
}