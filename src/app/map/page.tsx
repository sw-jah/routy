import { Suspense } from 'react';
import Link from 'next/link';
import DateMap from '@/components/map/DateMap';

export default function MapPage() {
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
            약속 찜 지도 <span className="text-[#C25E3E]">📍</span>
          </h1>
        </div>

        {/* 기존 '근처 카페 추천' 자리에 '오늘 뭐 먹지?' 배치 */}
        <Link
          href="/food"
          className="font-title text-xs text-[#C25E3E] bg-[#F9ECE7] border border-[#F2D1C5] px-3.5 py-1.5 rounded-2xl hover:bg-[#F4DDD3] transition flex items-center gap-1.5 active:scale-95 shadow-xs shrink-0"
        >
          <span>🍕 오늘 뭐 먹지?</span>
        </Link>
      </header>

      <Suspense
        fallback={
          <div className="font-body p-8 text-center text-xs text-[#8C7A6B] font-medium">
            지도를 준비하고 있습니다...
          </div>
        }
      >
        <DateMap />
      </Suspense>
    </main>
  );
}
