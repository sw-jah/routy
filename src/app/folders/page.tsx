"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Folder,
  Clock,
  Trash2,
  Share2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Navigation,
} from "lucide-react";
import { getCurrentUser } from "@/lib/authMock";
import type { SavedCoursePlan } from "@/types/common";

interface MapRoom {
  code: string;
  title: string;
  members: string[];
  courseFolders?: string[];
}

const CURRENT_ROOM_KEY = "routy_current_room_code";

export default function FoldersPage() {
  const [currentUser, setCurrentUser] = useState<string>("");
  const [rooms, setRooms] = useState<MapRoom[]>([]);
  const [activeCode, setActiveCode] = useState<string>("");

  const [selectedFolder, setSelectedFolder] = useState<string>("전체");
  const [courses, setCourses] = useState<SavedCoursePlan[]>([]);
  const [officialFolders, setOfficialFolders] = useState<string[]>(["기본 폴더"]);
  const [isLoadingCourses, setIsLoadingCourses] = useState(false);
  const [expandedCourseIds, setExpandedCourseIds] = useState<Set<string>>(new Set());

  // 룸 상단 UI 상태
  const [showInviteCode, setShowInviteCode] = useState(false);
  const [showMembersList, setShowMembersList] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);

  // 모달 상태
  const [showRoomModal, setShowRoomModal] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "join">("create");
  const [newRoomTitle, setNewRoomTitle] = useState("");
  const [joinRoomCode, setJoinRoomCode] = useState("");

  const [showInviteUserModal, setShowInviteUserModal] = useState(false);
  const [inviteUsernameInput, setInviteUsernameInput] = useState("");
  const [showLeaveModal, setShowLeaveModal] = useState(false);

  const [showAddFolderModal, setShowAddFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  // 삭제 확인 모달 상태
  const [folderToDelete, setFolderToDelete] = useState<string | null>(null);
  const [courseToDelete, setCourseToDelete] = useState<{ id: string; title: string } | null>(null);

  const [alertMessage, setAlertMessage] = useState<string | null>(null);

  // 1. 코스 목록 및 폴더 목록 DB 조회
  const fetchRoomCourses = useCallback(async (code: string) => {
    if (!code) return;
    setIsLoadingCourses(true);
    try {
      const res = await fetch(`/api/rooms/${encodeURIComponent(code)}/courses`);
      if (!res.ok) return;

      const data = await res.json();
      setCourses(data.courses || []);
      setOfficialFolders(data.folders || ["기본 폴더"]);
    } catch (e) {
      console.error("코스 목록 조회 실패:", e);
    } finally {
      setIsLoadingCourses(false);
    }
  }, []);

  // 2. 내가 참여 중인 방 목록 DB 조회
  const fetchMyRooms = useCallback(
    async (user: string, targetCode?: string) => {
      try {
        const res = await fetch(`/api/rooms?username=${encodeURIComponent(user)}`);
        if (!res.ok) return;

        const data = await res.json();
        const myRooms: MapRoom[] = data.rooms || [];
        setRooms(myRooms);

        if (myRooms.length > 0) {
          const hash = window.location.hash.replace("#", "").toUpperCase();
          let target =
            targetCode ||
            (hash && myRooms.some((r) => r.code === hash) ? hash : null) ||
            localStorage.getItem(CURRENT_ROOM_KEY) ||
            myRooms[0].code;

          if (!myRooms.some((r) => r.code === target)) target = myRooms[0].code;

          setActiveCode(target);
          localStorage.setItem(CURRENT_ROOM_KEY, target);
          fetchRoomCourses(target);
        } else {
          setActiveCode("");
          localStorage.removeItem(CURRENT_ROOM_KEY);
          setCourses([]);
        }
      } catch (e) {
        console.error(e);
      }
    },
    [fetchRoomCourses]
  );

  useEffect(() => {
    const user = getCurrentUser() || "";
    setCurrentUser(user);
    if (user) {
      fetchMyRooms(user);
    }
  }, [fetchMyRooms]);

  const currentRoom = rooms.find((r) => r.code === activeCode);

  const switchRoom = (code: string) => {
    setActiveCode(code);
    localStorage.setItem(CURRENT_ROOM_KEY, code);
    setSelectedFolder("전체");
    setShowInviteCode(false);
    setShowMembersList(false);
    fetchRoomCourses(code);
  };

  // 방에 저장된 공식 폴더 목록 + 저장된 코스들에서 사용된 폴더 목록의 합집합
  const folderNames = Array.from(
    new Set(["기본 폴더", ...officialFolders, ...courses.map((c) => c.folderName || "기본 폴더")])
  );

  const filteredCourses = courses.filter((c) => {
    if (selectedFolder === "전체") return true;
    return (c.folderName || "기본 폴더") === selectedFolder;
  });

  const toggleExpand = (courseId: string) => {
    setExpandedCourseIds((prev) => {
      const next = new Set(prev);
      if (next.has(courseId)) next.delete(courseId);
      else next.add(courseId);
      return next;
    });
  };

  // 코스 단일 삭제 확정 (DB 연동)
  const handleConfirmDeleteCourse = async () => {
    if (!courseToDelete) return;

    // UI 즉시 반영
    setCourses((prev) => prev.filter((c) => c.id !== courseToDelete.id));
    const targetId = courseToDelete.id;
    setCourseToDelete(null);

    try {
      await fetch(`/api/rooms/${encodeURIComponent(activeCode)}/courses/${encodeURIComponent(targetId)}`, {
        method: "DELETE",
      });
    } catch (err) {
      console.error("코스 삭제 실패:", err);
      fetchRoomCourses(activeCode);
    }
  };

  // 폴더 통째로 삭제 확정 (DB 연동)
  const handleConfirmDeleteFolder = async () => {
    if (!folderToDelete || !activeCode) return;

    const targetFolder = folderToDelete;
    setFolderToDelete(null);

    try {
      const res = await fetch(`/api/rooms/${encodeURIComponent(activeCode)}/folders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete",
          folderName: targetFolder,
        }),
      });

      if (!res.ok) {
        setAlertMessage("폴더 삭제에 실패했습니다.");
        return;
      }

      if (selectedFolder === targetFolder) {
        setSelectedFolder("전체");
      }
      setAlertMessage(`'${targetFolder}' 폴더와 코스가 삭제되었습니다.`);
      await fetchRoomCourses(activeCode);
      await fetchMyRooms(currentUser, activeCode);
    } catch (err) {
      console.error(err);
      setAlertMessage("폴더 삭제 중 오류가 발생했습니다.");
    }
  };

  const handleShareCourse = (course: SavedCoursePlan) => {
    const shareText = [
      `💌 [${course.courseTitle}] 코스 플랜`,
      `위치: ${course.location}`,
      `폴더: ${course.folderName}`,
      `-----------------------`,
      ...course.steps.map(
        (s) => `${s.order}. [${s.time}] ${s.place.name}${s.transitNote ? ` (${s.transitNote})` : ""}`
      ),
    ].join("\n");

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(shareText);
      setAlertMessage("코스 내용이 클립보드에 복사되었습니다! ✨");
    } else {
      setAlertMessage("클립보드 복사를 지원하지 않는 브라우저입니다.");
    }
  };

  // 새 방 만들기 (DB 연동)
  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomTitle.trim()) return;

    try {
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newRoomTitle.trim(),
          username: currentUser,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setAlertMessage(data.error || "방 생성에 실패했습니다.");
        return;
      }

      await fetchMyRooms(currentUser, data.code);
      setNewRoomTitle("");
      setShowRoomModal(false);
    } catch (err) {
      console.error(err);
      setAlertMessage("방 생성 중 오류가 발생했습니다.");
    }
  };

  // 코드로 방 참여 (DB 연동)
  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = joinRoomCode.trim().toUpperCase();
    if (clean.length !== 6) {
      setAlertMessage("6자리 코드를 입력해주세요.");
      return;
    }

    try {
      const res = await fetch("/api/rooms/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "join",
          code: clean,
          username: currentUser,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setAlertMessage(data.error || "방 참여에 실패했습니다.");
        return;
      }

      await fetchMyRooms(currentUser, clean);
      setJoinRoomCode("");
      setShowRoomModal(false);
    } catch (err) {
      console.error(err);
      setAlertMessage("방 참여 중 오류가 발생했습니다.");
    }
  };

  // 친구 초대 (DB 연동)
  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetUser = inviteUsernameInput.trim();
    if (!targetUser || !activeCode) return;

    try {
      const res = await fetch("/api/rooms/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "invite",
          code: activeCode,
          targetUsername: targetUser,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setAlertMessage(data.error || "초대에 실패했습니다.");
        return;
      }

      await fetchMyRooms(currentUser, activeCode);
      setInviteUsernameInput("");
      setShowInviteUserModal(false);
      setAlertMessage(`🎉 '${targetUser}'님을 초대했습니다!`);
    } catch (err) {
      console.error(err);
      setAlertMessage("초대 중 오류가 발생했습니다.");
    }
  };

  // 방 나가기 (DB 연동)
  const handleConfirmLeaveRoom = async () => {
    if (!activeCode) return;

    try {
      const res = await fetch("/api/rooms/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "leave",
          code: activeCode,
          username: currentUser,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setAlertMessage(data.error || "방 나가기에 실패했습니다.");
        return;
      }

      setShowLeaveModal(false);
      await fetchMyRooms(currentUser);
    } catch (err) {
      console.error(err);
      setAlertMessage("방 나가기 처리 중 오류가 발생했습니다.");
    }
  };

  // 새 빈 폴더 생성 (DB 연동)
  const handleAddFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newFolderName.trim();
    if (!trimmed || !activeCode) return;

    if (folderNames.includes(trimmed)) {
      setAlertMessage("이미 존재하는 폴더 이름입니다.");
      return;
    }

    try {
      const res = await fetch(`/api/rooms/${encodeURIComponent(activeCode)}/folders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          folderName: trimmed,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setAlertMessage(data.error || "폴더 생성에 실패했습니다.");
        return;
      }

      setOfficialFolders((prev) => [...prev, trimmed]);
      setSelectedFolder(trimmed);
      setNewFolderName("");
      setShowAddFolderModal(false);
    } catch (err) {
      console.error(err);
      setAlertMessage("폴더 생성 중 오류가 발생했습니다.");
    }
  };

  const currentMembers = currentRoom?.members || [currentUser];

  return (
    <main className="max-w-md mx-auto min-h-screen px-5 pt-6 pb-12 flex flex-col gap-4 bg-[#FAF7F2] text-[#2D241E]">
      <header className="flex items-center justify-between pb-3 border-b border-[#EADFCF]">
        <div className="flex items-center gap-2.5">
          <Link
            href="/"
            className="font-title text-xs text-[#7A6251] hover:text-[#2D241E] px-3.5 py-1.5 bg-white border-2 border-[#EADFCF] rounded-2xl shadow-xs transition active:scale-95"
          >
            ← 홈으로
          </Link>
          <h1 className="font-title text-lg tracking-tight text-[#2D241E] flex items-center gap-1.5">
            코스 보관함 <span className="text-[#C25E3E]">📁</span>
          </h1>
        </div>

        <Link
          href="/course"
          className="font-title text-xs text-[#C25E3E] bg-[#F9ECE7] border border-[#F2D1C5] px-3.5 py-1.5 rounded-2xl hover:bg-[#F4DDD3] transition flex items-center gap-1.5 active:scale-95 shadow-xs shrink-0"
        >
          <span>✨ 새 코스 만들기</span>
        </Link>
      </header>

      {/* 1. 상단 룸 관리 바 */}
      {rooms.length > 0 && (
        <div className="bg-[#3B2F27] text-white p-4 rounded-[26px] flex flex-col gap-3 shadow-[0_8px_24px_rgba(59,47,39,0.12)] border-2 border-[#2D241E]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 flex-1 overflow-hidden pr-3">
              <span className="font-title text-[10px] bg-[#524237] text-[#E8DCC4] px-2 py-0.5 rounded-md border border-[#695547] shrink-0">
                ROOM
              </span>
              <select
                value={activeCode}
                onChange={(e) => switchRoom(e.target.value)}
                className="font-title bg-[#4D3E34] text-[#F3D5B5] text-xs rounded-xl px-3 py-2 border border-[#614F43] outline-none truncate cursor-pointer hover:bg-[#59483D] flex-1 w-full"
              >
                {rooms.map((room) => (
                  <option key={room.code} value={room.code}>
                    {room.title}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={() => setShowRoomModal(true)}
              className="font-title text-xs px-3 py-2 bg-[#524237] hover:bg-[#614F43] text-[#F3D5B5] rounded-xl border border-[#695547] transition active:scale-95 shrink-0"
            >
              + 새 방
            </button>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-[#4D3E34] text-xs">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowInviteCode(!showInviteCode)}
                className="font-title text-xs text-[#C8B8A6] hover:text-[#F3D5B5] flex items-center gap-1 transition"
              >
                <span>🔑</span>
                <span>{showInviteCode ? "초대 코드 닫기" : "초대 코드"}</span>
              </button>

              {!showInviteCode && (
                <>
                  <span className="text-[#59483D]">|</span>
                  <button
                    type="button"
                    onClick={() => setShowMembersList(!showMembersList)}
                    className="font-title text-xs text-[#C8B8A6] hover:text-[#F3D5B5] flex items-center gap-1 transition"
                  >
                    <span>👥</span>
                    <span>참여 멤버 ({currentMembers.length}/4)</span>
                    <span className="text-[10px] text-[#A89889]">{showMembersList ? "▲" : "▼"}</span>
                  </button>

                  <span className="text-[#59483D]">|</span>
                  <button
                    type="button"
                    onClick={() => setShowLeaveModal(true)}
                    className="font-title text-xs text-[#C8B8A6] hover:text-[#E07A5F] flex items-center gap-1 transition"
                  >
                    <span>🚪</span>
                    <span>방 나가기</span>
                  </button>
                </>
              )}
            </div>

            {showInviteCode && (
              <div className="flex items-center gap-2 animate-in fade-in duration-200">
                <span className="font-title font-mono text-[#F3D5B5] tracking-wider bg-[#2D241E] px-2 py-0.5 rounded-md text-xs">
                  {activeCode}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(activeCode);
                    setCopyFeedback(true);
                    setTimeout(() => setCopyFeedback(false), 2000);
                  }}
                  className="font-title text-xs text-[#E8DCC4] hover:text-white"
                >
                  {copyFeedback ? "복사됨! ✨" : "복사"}
                </button>
              </div>
            )}
          </div>

          {showMembersList && (
            <div className="pt-2 border-t border-[#4D3E34] flex items-center gap-1.5 flex-wrap animate-in fade-in duration-150">
              {currentMembers.map((member, idx) => {
                const isMe = member === currentUser;
                return (
                  <div
                    key={`member-${idx}`}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-title ${
                      isMe ? "bg-[#C25E3E] text-white" : "bg-[#4D3E34] text-[#F3D5B5]"
                    }`}
                  >
                    <span className="text-[11px]">👤</span>
                    <span className="truncate max-w-[90px]">{member}</span>
                    {isMe && <span className="text-[10px] opacity-85">(나)</span>}
                  </div>
                );
              })}

              {currentMembers.length < 4 && (
                <button
                  type="button"
                  onClick={() => setShowInviteUserModal(true)}
                  className="flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-title bg-[#524237] hover:bg-[#614F43] text-[#F3D5B5] border border-[#695547] transition active:scale-95"
                >
                  <span>➕ 친구 초대</span>
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* 2. 폴더 탭 바 */}
      {rooms.length > 0 && (
        <div className="flex gap-2 items-center overflow-x-auto pb-1 no-scrollbar pt-1">
          <button
            type="button"
            onClick={() => setSelectedFolder("전체")}
            className={`font-title px-3.5 py-1.5 rounded-xl text-xs transition whitespace-nowrap active:scale-95 ${
              selectedFolder === "전체"
                ? "bg-[#2D241E] text-[#F3D5B5] shadow-xs"
                : "bg-white text-[#7A6251] border-2 border-[#EADFCF] hover:bg-[#FAF7F2]"
            }`}
          >
            모아보기
          </button>

          {folderNames.map((fName) => {
            const isActive = selectedFolder === fName;
            return (
              <div
                key={fName}
                className={`flex items-center shrink-0 rounded-xl border-2 transition-all overflow-hidden ${
                  isActive
                    ? "bg-[#2D241E] border-[#2D241E] shadow-xs"
                    : "bg-white border-[#EADFCF] hover:border-[#D5C2AD]"
                }`}
              >
                <button
                  type="button"
                  onClick={() => setSelectedFolder(fName)}
                  className={`font-title px-3 py-1.5 text-xs transition whitespace-nowrap active:scale-95 ${
                    isActive ? "text-[#F3D5B5]" : "text-[#7A6251]"
                  }`}
                >
                  📁 {fName}
                </button>

                {fName !== "기본 폴더" && (
                  <button
                    type="button"
                    onClick={() => setFolderToDelete(fName)}
                    title="폴더 및 포함된 코스 삭제"
                    className={`font-title px-2 py-1.5 text-[10px] transition border-l ${
                      isActive
                        ? "bg-[#43362E] text-[#C8B8A6] border-[#59483D] hover:text-white"
                        : "bg-[#FAF7F2] text-[#A89889] border-[#EADFCF] hover:text-[#C25E3E]"
                    }`}
                  >
                    ✕
                  </button>
                )}
              </div>
            );
          })}

          <button
            type="button"
            onClick={() => setShowAddFolderModal(true)}
            className="font-title px-3 py-1.5 rounded-xl text-xs bg-[#FAF7F2] text-[#A89889] border border-dashed border-[#D5C2AD] hover:bg-[#F3ECE0] transition whitespace-nowrap shrink-0 active:scale-95"
          >
            + 새 폴더
          </button>
        </div>
      )}

      {/* 3. 코스 플랜 리스트 카드 뷰 */}
      <div className="flex flex-col gap-3">
        <div className="flex justify-between items-center px-1">
          <span className="font-title text-xs text-[#7A6251]">
            {selectedFolder === "전체" ? "전체 코스 플랜" : `'${selectedFolder}' 보관 플랜`} ({filteredCourses.length}개)
          </span>
          <span className="font-body text-[11px] text-[#A89889]">카드를 누르면 상세 일정이 펼쳐집니다</span>
        </div>

        {rooms.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-3xl border-2 border-dashed border-[#EADFCF] flex flex-col items-center gap-3">
            <span className="text-3xl">🏝️</span>
            <p className="font-title text-sm text-[#2D241E]">약속 방을 먼저 만들어주세요!</p>
            <p className="font-body text-xs text-[#8C7A6B]">방을 만들면 코스를 저장해 함께 볼 수 있습니다.</p>
            <button
              type="button"
              onClick={() => {
                setModalMode("create");
                setShowRoomModal(true);
              }}
              className="font-title mt-1 px-5 py-2.5 bg-[#2D241E] text-white text-xs rounded-xl shadow-xs"
            >
              + 새 방 만들기
            </button>
          </div>
        ) : isLoadingCourses ? (
          <div className="p-12 text-center bg-white rounded-3xl border-2 border-dashed border-[#EADFCF] flex flex-col items-center gap-2">
            <div className="w-8 h-8 border-3 border-[#C25E3E] border-t-transparent rounded-full animate-spin" />
            <p className="font-body text-xs text-[#8C7A6B]">코스를 불러오는 중입니다...</p>
          </div>
        ) : filteredCourses.length === 0 ? (
          <div className="p-10 text-center bg-white rounded-3xl border-2 border-dashed border-[#EADFCF] flex flex-col items-center gap-2">
            <span className="text-3xl">📂</span>
            <p className="font-title text-sm text-[#2D241E]">저장된 코스 플랜이 없습니다.</p>
            <p className="font-body text-xs text-[#8C7A6B] leading-relaxed">
              AI 플래너에서 코스를 생성한 뒤<br />
              <b>[코스 확정 (폴더에 저장)]</b>을 누르면 이곳에 보관됩니다!
            </p>
            <Link
              href="/course"
              className="font-title mt-2 px-5 py-2.5 bg-[#2D241E] text-[#F3D5B5] text-xs rounded-xl shadow-xs"
            >
              코스 만들러 가기 →
            </Link>
          </div>
        ) : (
          filteredCourses.map((course) => {
            const isExpanded = expandedCourseIds.has(course.id);
            const dateStr = new Date(course.createdAt).toLocaleDateString("ko-KR", {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            });

            return (
              <div
                key={course.id}
                className="bg-white rounded-[26px] border-2 border-[#EADFCF] shadow-[0_4px_16px_rgba(74,59,50,0.03)] overflow-hidden transition-all"
              >
                <div
                  onClick={() => toggleExpand(course.id)}
                  className="p-4.5 cursor-pointer hover:bg-[#FAF7F2] transition flex flex-col gap-2 select-none"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="font-title text-[10px] bg-[#F9ECE7] text-[#C25E3E] px-2 py-0.5 rounded-md border border-[#F2D1C5]">
                        📁 {course.folderName || "기본 폴더"}
                      </span>
                      <span className="font-title text-[10px] bg-[#FAF7F2] text-[#7A6251] px-2 py-0.5 rounded-md border border-[#EADFCF]">
                        📍 {course.location}
                      </span>
                    </div>

                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => handleShareCourse(course)}
                        className="p-1.5 text-[#8C7A6B] hover:text-[#2D241E] rounded-lg transition"
                        title="코스 복사하기"
                      >
                        <Share2 className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setCourseToDelete({ id: course.id, title: course.courseTitle })}
                        className="p-1.5 text-[#A89889] hover:text-[#C25E3E] rounded-lg transition"
                        title="삭제"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-0.5">
                    <div>
                      <h3 className="font-title text-base text-[#2D241E] tracking-tight">{course.courseTitle}</h3>
                      <p className="font-body text-xs text-[#8C7A6B] mt-0.5 line-clamp-1">{course.summary}</p>
                    </div>
                    <div className="text-[#A89889] pl-2 shrink-0">
                      {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-[#F2EAE0] text-[11px] text-[#A89889]">
                    <span>작성자: {course.author}</span>
                    <span>{dateStr}</span>
                  </div>
                </div>

                {isExpanded && (
                  <div className="px-4.5 pb-4.5 pt-2 border-t border-[#EADFCF] bg-[#FAF7F2]/60 space-y-3 animate-in fade-in duration-150">
                    <div className="space-y-2">
                      {course.steps.map((step, idx) => {
                        const kakaoMapUrl =
                          step.place.placeUrl ||
                          `https://map.kakao.com/link/search/${encodeURIComponent(step.place.name)}`;
                        const kakaoNaviUrl = `https://map.kakao.com/link/to/${encodeURIComponent(
                          step.place.name
                        )},${step.place.lat},${step.place.lng}`;

                        return (
                          <div key={idx} className="flex flex-col gap-1">
                            {step.transitNote && (
                              <div className="flex items-center gap-1.5 px-3 text-[10px] font-title text-[#7A6251]">
                                <span className="text-[#C25E3E]">↳</span>
                                <span>{step.transitNote}</span>
                              </div>
                            )}

                            <div className="bg-white rounded-2xl p-3.5 border border-[#EADFCF] shadow-2xs space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#2D241E] text-[10px] font-bold text-white">
                                    {idx + 1}
                                  </span>
                                  <span className="font-title text-xs text-[#2D241E]">{step.place.name}</span>
                                </div>
                                <div className="flex items-center gap-1 text-xs text-[#8C7A6B]">
                                  <Clock className="h-3 w-3 text-[#C25E3E]" />
                                  <span className="font-title text-[11px]">{step.time}</span>
                                </div>
                              </div>

                              <p className="font-body text-[11px] text-[#8C7A6B] pl-5 truncate">{step.place.address}</p>

                              {step.commentary && (
                                <div className="font-body text-[11px] bg-[#FAF7F2] p-2 rounded-xl border border-[#EADFCF] text-[#5F5147]">
                                  💡 {step.commentary}
                                </div>
                              )}

                              <div className="flex gap-2 pt-1">
                                <a
                                  href={kakaoMapUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="font-title flex-1 py-1.5 text-center text-[10px] bg-[#FAF7F2] text-[#7A6251] rounded-lg border border-[#EADFCF] flex items-center justify-center gap-1"
                                >
                                  <ExternalLink className="h-3 w-3" />
                                  장소 정보
                                </a>
                                <a
                                  href={kakaoNaviUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="font-title flex-1 py-1.5 text-center text-[10px] bg-[#2D241E] text-[#F3D5B5] rounded-lg flex items-center justify-center gap-1"
                                >
                                  <Navigation className="h-3 w-3" />
                                  길찾기
                                </a>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* 새 폴더 추가 모달 */}
      {showAddFolderModal && (
        <div className="fixed inset-0 z-[60] bg-[#2D241E]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FAF7F2] text-[#2D241E] w-full max-w-xs rounded-[28px] p-6 shadow-2xl border-2 border-[#EADFCF] flex flex-col gap-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-1 border-b border-[#EADFCF]">
              <h3 className="font-title text-base">새 코스 폴더 만들기</h3>
              <button
                type="button"
                onClick={() => setShowAddFolderModal(false)}
                className="text-[#A89889] hover:text-[#2D241E]"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleAddFolder} className="flex flex-col gap-3">
              <div>
                <label className="font-title text-xs text-[#7A6251]">폴더 이름</label>
                <input
                  type="text"
                  placeholder="예: 1주년 기념, 주말 서울숲"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  required
                  autoFocus
                  className="font-body w-full mt-1.5 px-3.5 py-2.5 text-xs bg-white border-2 border-[#EADFCF] rounded-xl focus:outline-none focus:border-[#C25E3E]"
                />
              </div>
              <button
                type="submit"
                className="font-title w-full py-3 bg-[#2D241E] hover:bg-[#43362E] text-white text-xs rounded-xl transition mt-2 shadow-xs active:scale-95"
              >
                폴더 생성하기
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 폴더 통째로 삭제 확인 모달 */}
      {folderToDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#2D241E]/60 p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-xs rounded-[28px] bg-[#FAF7F2] p-6 shadow-2xl border-2 border-[#EADFCF] flex flex-col gap-3 text-center animate-in zoom-in-95 duration-150">
            <span className="text-3xl">📁❌</span>
            <div>
              <h3 className="font-title text-base text-[#2D241E]">'{folderToDelete}' 폴더 삭제</h3>
              <p className="font-body text-xs text-[#8C7A6B] mt-1.5 leading-relaxed break-keep">
                폴더와 함께 그 안에 담긴 모든 코스 계획들이 삭제됩니다.<br />정말 삭제하시겠습니까?
              </p>
            </div>
            <div className="flex gap-2 mt-1">
              <button
                type="button"
                onClick={() => setFolderToDelete(null)}
                className="font-title flex-1 py-2.5 bg-white border-2 border-[#EADFCF] text-[#7A6251] text-xs rounded-xl transition active:scale-95"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteFolder}
                className="font-title flex-1 py-2.5 bg-[#C25E3E] text-white text-xs rounded-xl transition active:scale-95 shadow-xs"
              >
                폴더 삭제
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 코스 단일 삭제 확인 모달 */}
      {courseToDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#2D241E]/60 p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-xs rounded-[28px] bg-[#FAF7F2] p-6 shadow-2xl border-2 border-[#EADFCF] flex flex-col gap-3 text-center animate-in zoom-in-95 duration-150">
            <span className="text-3xl">🗑️</span>
            <div>
              <h3 className="font-title text-base text-[#2D241E]">코스 삭제</h3>
              <p className="font-body text-xs text-[#8C7A6B] mt-1.5 leading-relaxed break-keep">
                '{courseToDelete.title}' 코스를 보관함에서 삭제하시겠습니까?
              </p>
            </div>
            <div className="flex gap-2 mt-1">
              <button
                type="button"
                onClick={() => setCourseToDelete(null)}
                className="font-title flex-1 py-2.5 bg-white border-2 border-[#EADFCF] text-[#7A6251] text-xs rounded-xl transition active:scale-95"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteCourse}
                className="font-title flex-1 py-2.5 bg-[#C25E3E] text-white text-xs rounded-xl transition active:scale-95 shadow-xs"
              >
                삭제하기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 약속 방 관리 모달 */}
      {showRoomModal && (
        <div className="fixed inset-0 z-[60] bg-[#2D241E]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FAF7F2] text-[#2D241E] w-full max-w-sm rounded-[30px] p-6 shadow-2xl border-2 border-[#EADFCF] flex flex-col gap-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-[#EADFCF]">
              <h3 className="font-title text-base">약속 방 관리</h3>
              <button
                type="button"
                onClick={() => setShowRoomModal(false)}
                className="text-[#A89889] hover:text-[#2D241E]"
              >
                ✕
              </button>
            </div>
            <div className="font-title flex rounded-xl bg-[#EFE9DF] p-1 text-xs">
              <button
                type="button"
                onClick={() => setModalMode("create")}
                className={`flex-1 py-1.5 rounded-lg transition ${
                  modalMode === "create" ? "bg-[#2D241E] text-[#F3D5B5] shadow-xs" : "text-[#7A6251]"
                }`}
              >
                새 방 만들기
              </button>
              <button
                type="button"
                onClick={() => setModalMode("join")}
                className={`flex-1 py-1.5 rounded-lg transition ${
                  modalMode === "join" ? "bg-[#2D241E] text-[#F3D5B5] shadow-xs" : "text-[#7A6251]"
                }`}
              >
                코드로 참여
              </button>
            </div>

            {modalMode === "create" ? (
              <form onSubmit={handleCreateRoom} className="flex flex-col gap-3">
                <div>
                  <label className="font-title text-xs text-[#7A6251]">약속 방 이름</label>
                  <input
                    type="text"
                    placeholder="예: 성수 모임, 데이트 지도"
                    value={newRoomTitle}
                    onChange={(e) => setNewRoomTitle(e.target.value)}
                    required
                    className="font-body w-full mt-1 px-3.5 py-2.5 text-xs bg-white border-2 border-[#EADFCF] rounded-xl focus:outline-none focus:border-[#C25E3E]"
                  />
                </div>
                <button
                  type="submit"
                  className="font-title w-full py-3 bg-[#2D241E] hover:bg-[#43362E] text-white text-xs rounded-xl transition mt-1 shadow-xs active:scale-95"
                >
                  방 생성하기
                </button>
              </form>
            ) : (
              <form onSubmit={handleJoinRoom} className="flex flex-col gap-3">
                <div>
                  <label className="font-title text-xs text-[#7A6251]">6자리 초대 코드</label>
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="예: A8F2K9"
                    value={joinRoomCode}
                    onChange={(e) => setJoinRoomCode(e.target.value.toUpperCase())}
                    required
                    className="font-title w-full mt-1 px-3.5 py-2.5 text-xs bg-white border-2 border-[#EADFCF] rounded-xl uppercase tracking-widest text-center focus:outline-none focus:border-[#C25E3E]"
                  />
                </div>
                <button
                  type="submit"
                  className="font-title w-full py-3 bg-[#2D241E] hover:bg-[#43362E] text-white text-xs rounded-xl transition mt-1 shadow-xs active:scale-95"
                >
                  방 들어가기
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* 친구 초대 모달 */}
      {showInviteUserModal && (
        <div className="fixed inset-0 z-[60] bg-[#2D241E]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FAF7F2] text-[#2D241E] w-full max-w-xs rounded-[28px] p-6 shadow-2xl border-2 border-[#EADFCF] flex flex-col gap-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-1 border-b border-[#EADFCF]">
              <h3 className="font-title text-base">친구 초대하기</h3>
              <button
                type="button"
                onClick={() => setShowInviteUserModal(false)}
                className="text-[#A89889] hover:text-[#2D241E]"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleInviteUser} className="flex flex-col gap-3">
              <div>
                <label className="font-title text-xs text-[#7A6251]">초대할 친구 아이디</label>
                <input
                  type="text"
                  placeholder="예: admin, routy"
                  value={inviteUsernameInput}
                  onChange={(e) => setInviteUsernameInput(e.target.value)}
                  required
                  autoFocus
                  className="font-body w-full mt-1.5 px-3.5 py-2.5 text-xs bg-white border-2 border-[#EADFCF] rounded-xl focus:outline-none focus:border-[#C25E3E]"
                />
              </div>
              <p className="font-body text-[11px] text-[#8C7A6B] leading-relaxed">
                상대방 아이디를 입력하면 해당 유저의 보관함 및 지도 목록에 이 방이 즉시 추가됩니다!
              </p>
              <button
                type="submit"
                className="font-title w-full py-3 bg-[#2D241E] hover:bg-[#43362E] text-[#F3D5B5] text-xs rounded-xl transition mt-1 shadow-xs active:scale-95"
              >
                초대 완료하기 ✨
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 방 나가기 모달 */}
      {showLeaveModal && (
        <div className="fixed inset-0 z-[60] bg-[#2D241E]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FAF7F2] text-[#2D241E] w-full max-w-xs rounded-[28px] p-6 shadow-2xl border-2 border-[#EADFCF] flex flex-col gap-4 text-center animate-in zoom-in-95 duration-150">
            <span className="text-3xl mt-1">🚪</span>
            <div>
              <h3 className="font-title text-base text-[#2D241E]">'{currentRoom?.title}' 방 나가기</h3>
              <p className="font-body text-xs text-[#8C7A6B] mt-1.5 leading-relaxed break-keep">
                현재 약속 방에서 나가시겠습니까?
                <br />
                언제든 초대 코드로 다시 참여할 수 있습니다.
              </p>
            </div>
            <div className="flex gap-2 mt-1">
              <button
                type="button"
                onClick={() => setShowLeaveModal(false)}
                className="font-title flex-1 py-2.5 bg-white border-2 border-[#EADFCF] hover:bg-[#FAF7F2] text-[#7A6251] text-xs rounded-xl transition active:scale-95"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleConfirmLeaveRoom}
                className="font-title flex-1 py-2.5 bg-[#C25E3E] hover:bg-[#B04E30] text-white text-xs rounded-xl transition shadow-xs active:scale-95"
              >
                방 나가기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 커스텀 안내 알림 모달 */}
      {alertMessage && (
        <div className="fixed inset-0 z-[90] bg-[#2D241E]/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-[#FAF7F2] text-[#2D241E] w-full max-w-xs rounded-[28px] p-6 shadow-2xl border-2 border-[#EADFCF] flex flex-col gap-4 text-center animate-in zoom-in-95 duration-150">
            <span className="text-3xl mt-1">💡</span>
            <div>
              <p className="font-title text-sm text-[#2D241E] leading-relaxed break-keep">{alertMessage}</p>
            </div>
            <button
              type="button"
              onClick={() => setAlertMessage(null)}
              className="font-title w-full py-2.5 bg-[#2D241E] hover:bg-[#43362E] text-white text-xs rounded-xl transition active:scale-95 shadow-xs"
            >
              확인
            </button>
          </div>
        </div>
      )}
    </main>
  );
}