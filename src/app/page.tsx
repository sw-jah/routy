'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser, logoutUser } from '@/lib/authMock';

export default function HomePage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    const user = getCurrentUser();
    if (!user) {
      router.replace('/login');
    } else {
      setCurrentUser(user);
      setIsCheckingAuth(false);
    }
  }, [router]);

  const handleLogout = () => {
    logoutUser();
    router.replace('/login');
  };

  if (isCheckingAuth) {
    return (
      <main className="max-w-md mx-auto min-h-screen bg-[#FAF7F2] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-[#C25E3E] border-t-transparent rounded-full animate-spin" />
          <p className="font-title text-xs text-[#8C7A6B]">사용자 확인 중...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-md mx-auto min-h-screen px-5 pt-8 pb-14 bg-[#FAF7F2] text-[#2D241E] flex flex-col justify-between selection:bg-[#E8DCC4]">
      <div className="flex flex-col gap-6">
        
        {/* 상단 헤더 */}
        <header className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="font-title inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] bg-[#EFE9DF] text-[#7A6251] border border-[#E3D9CC]">
              <span className="w-2 h-2 rounded-full bg-[#C25E3E] animate-pulse" />
              우리들의 약속 플래너
            </span>

            <div className="flex items-center gap-2">
              <span className="font-title text-xs text-[#7A6251]">
                👤 <b>{currentUser}</b>님
              </span>
              <button
                onClick={handleLogout}
                className="font-title text-[10px] text-[#A89889] hover:text-[#C25E3E] px-2 py-1 bg-white border border-[#EADFCF] rounded-lg transition active:scale-95 shadow-2xs"
              >
                로그아웃
              </button>
            </div>
          </div>

          <div>
            <h1 className="font-title text-4xl tracking-tight text-[#2D241E] flex items-center gap-1.5 mt-1">
              ROUTY<span className="text-[#C25E3E]">!</span>
            </h1>
            <p className="font-body text-xs font-normal text-[#8C7A6B] mt-1.5 leading-relaxed">
              취향 고민은 AI가, 만남은 편하게! 직관적인 약속 코스 플래너
            </p>
          </div>
        </header>

        {/* 메뉴 리스트 */}
        <div className="flex flex-col gap-3.5">
          
          {/* 1. AI 플래너 카드 */}
          <Link
            href="/course"
            className="group relative p-7 rounded-[32px] bg-[#2D241E] text-white shadow-[0_16px_36px_rgba(45,36,30,0.18)] overflow-hidden transition-all duration-300 hover:scale-[1.01] active:scale-[0.99] border-2 border-[#1E1713] cursor-pointer flex flex-col justify-between min-h-[190px]"
          >
            <div className="absolute -top-10 -right-10 w-52 h-52 bg-gradient-to-br from-[#C25E3E]/40 via-[#E07A5F]/20 to-transparent rounded-full blur-3xl pointer-events-none" />
            
            <div className="relative z-10 flex items-start justify-between">
              <span className="w-13 h-13 rounded-2xl bg-[#43362E] border border-[#59483D] flex items-center justify-center text-2xl shadow-inner">
                ✨
              </span>
              <span className="font-title text-[10px] px-2.5 py-1 rounded-full bg-[#3B2F27] text-[#E8DCC4] border border-[#524237]">
                AI 추천
              </span>
            </div>

            <div className="relative z-10 mt-4">
              <h2 className="font-title text-2xl tracking-tight text-[#FAF7F2] group-hover:text-[#F3D5B5] transition-colors flex items-center gap-1.5">
                AI 플래너 <span className="text-[#C25E3E]">→</span>
              </h2>
              <p className="font-body text-xs font-normal text-[#C8B8A6] mt-1.5 leading-relaxed">
                만날 위치, 선호 시간, 취향에 맞춘 최적의 동선과 풀코스 일정을 <br />AI가 한 번에 완성해 드립니다.
              </p>
            </div>
          </Link>

          {/* 2. 코스 보관함 (신규 추가된 폴더 페이지) */}
          <Link
            href="/folders"
            className="group relative p-4.5 rounded-[24px] bg-[#F5EDE1] border-2 border-[#E3D4C1] shadow-[0_4px_16px_rgba(74,59,50,0.06)] hover:border-[#D5C2AD] hover:bg-[#F0E5D5] transition-all flex items-center justify-between active:scale-[0.99]"
          >
            <div className="flex items-center gap-3">
              <span className="w-11 h-11 rounded-2xl bg-white border border-[#E3D4C1] flex items-center justify-center text-xl shrink-0 shadow-2xs">
                📁
              </span>
              <div className="text-left">
                <h3 className="font-title text-base text-[#2D241E] group-hover:text-[#C25E3E] transition-colors">
                  코스 보관함 (폴더)
                </h3>
                <p className="font-body text-xs text-[#7A6251] mt-0.5">
                AI 플래너로 확정한 풀코스 플랜들을 방/폴더별로
                <br />
                모아보세요!
              </p>

              </div>
            </div>
            <span className="font-title text-xs text-[#523F30] group-hover:text-[#C25E3E] group-hover:translate-x-1 transition-all pl-2 font-bold">
              GO →
            </span>
          </Link>

          {/* 3. 약속 찜 지도 */}
          <Link
            href="/map"
            className="group relative p-4.5 rounded-[24px] bg-[#EFE6D8] border-2 border-[#DFCBB5] shadow-[0_4px_16px_rgba(74,59,50,0.06)] hover:border-[#CFB69C] hover:bg-[#E8DDCD] transition-all flex items-center justify-between active:scale-[0.99]"
          >
            <div className="flex items-center gap-3">
              <span className="w-11 h-11 rounded-2xl bg-white border border-[#DFCBB5] flex items-center justify-center text-xl shrink-0 shadow-2xs">
                🗺️
              </span>
              <div className="text-left">
                <h3 className="font-title text-base text-[#2D241E] group-hover:text-[#C25E3E] transition-colors">
                  약속 찜 지도
                </h3>
                <p className="font-body text-xs text-[#6D5441] mt-0.5">
                  가고 싶은 장소를 하트로 찜하고 친구와 함께 
                  <br />공유해보세요!
                </p>
              </div>
            </div>
            <span className="font-title text-xs text-[#523F30] group-hover:text-[#C25E3E] group-hover:translate-x-1 transition-all pl-2 font-bold">
              GO →
            </span>
          </Link>

          {/* 4. 밥집 어디가지? */}
          <Link
            href="/restaurant"
            className="group relative p-4.5 rounded-[24px] bg-white border-2 border-[#EADFCF] shadow-[0_4px_16px_rgba(74,59,50,0.03)] hover:border-[#D5C2AD] transition-all flex items-center justify-between active:scale-[0.99]"
          >
            <div className="flex items-center gap-3">
              <span className="w-11 h-11 rounded-2xl bg-[#FBF2EE] border border-[#F2D7CD] flex items-center justify-center text-xl shrink-0">
                🍽️
              </span>
              <div className="text-left">
                <h3 className="font-title text-base text-[#2D241E] group-hover:text-[#C25E3E] transition-colors">
                  밥집 어디가지?
                </h3>
                <p className="font-body text-xs text-[#8C7A6B] mt-0.5">
                  거리별, 음식 종류별로 밥집을 찾아드려요!
                </p>
              </div>
            </div>
            <span className="font-title text-xs text-[#8C7A6B] group-hover:text-[#C25E3E] group-hover:translate-x-1 transition-all pl-2">
              GO →
            </span>
          </Link>

          {/* 5. 카페 어디가지? */}
          <Link
            href="/cafe"
            className="group relative p-4.5 rounded-[24px] bg-white border-2 border-[#EADFCF] shadow-[0_4px_16px_rgba(74,59,50,0.03)] hover:border-[#D5C2AD] transition-all flex items-center justify-between active:scale-[0.99]"
          >
            <div className="flex items-center gap-3">
              <span className="w-11 h-11 rounded-2xl bg-[#FBF5ED] border border-[#EFE4D6] flex items-center justify-center text-xl shrink-0">
                ☕
              </span>
              <div className="text-left">
                <h3 className="font-title text-base text-[#2D241E] group-hover:text-[#A86F3D] transition-colors">
                  카페 어디가지?
                </h3>
                <p className="font-body text-xs text-[#8C7A6B] mt-0.5">
                  거리별, 디저트별로 카페를 추천해드려요!
                </p>
              </div>
            </div>
            <span className="font-title text-xs text-[#8C7A6B] group-hover:text-[#A86F3D] group-hover:translate-x-1 transition-all pl-2">
              GO →
            </span>
          </Link>

        </div>
      </div>

      <footer className="font-title text-center text-xs text-[#A89889] pt-6">
        ROUTY · CURATED FOR US
      </footer>
    </main>
  );
}