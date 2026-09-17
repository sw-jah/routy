'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const STORAGE_SESSION_KEY = 'routy_session_user';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'signup'>('login');

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // 1. 회원가입 핸들러 (실제 DB API 통신)
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (password !== passwordConfirm) {
      setError('비밀번호가 서로 일치하지 않습니다.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'register',
          username: username.trim(),
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || '회원가입에 실패했습니다.');
        return;
      }

      setSuccessMsg('회원가입이 완료되었습니다! 로그인해주세요 🎉');
      setMode('login');
      setPassword('');
      setPasswordConfirm('');
    } catch (err) {
      console.error(err);
      setError('서버와 통신하는 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // 2. 로그인 핸들러 (실제 DB API 통신)
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    setIsLoading(true);
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'login',
          username: username.trim(),
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || '로그인에 실패했습니다.');
        return;
      }

      // 세션에 현재 사용자 저장 후 메인으로 이동
      sessionStorage.setItem(STORAGE_SESSION_KEY, data.username);
      router.push('/');
    } catch (err) {
      console.error(err);
      setError('서버와 통신하는 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // 3. 심사용 원터치 빠른 로그인 (계정이 없으면 DB에 자동 가입 후 로그인)
  const handleQuickLogin = async (targetUser: 'routy' | 'admin' | 'user') => {
    setError('');
    setSuccessMsg('');
    setIsLoading(true);

    try {
      // 1차: 로그인 시도
      let res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'login',
          username: targetUser,
          password: '1234',
        }),
      });

      let data = await res.json();

      // DB에 계정이 아직 없다면 자동으로 회원가입 후 재로그인
      if (!res.ok) {
        await fetch('/api/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'register',
            username: targetUser,
            password: '1234',
          }),
        });

        res = await fetch('/api/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'login',
            username: targetUser,
            password: '1234',
          }),
        });
        data = await res.json();
      }

      if (res.ok) {
        sessionStorage.setItem(STORAGE_SESSION_KEY, data.username);
        router.push('/');
      } else {
        setError(data.error || '빠른 로그인에 실패했습니다.');
      }
    } catch (err) {
      console.error(err);
      setError('서버와 통신하는 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="max-w-md mx-auto min-h-screen px-5 pt-8 pb-10 flex flex-col justify-between bg-[#FAF7F2] text-[#2D241E]">
      <div className="flex flex-col gap-5">
        {/* 상단 브랜딩 태그 */}
        <header className="flex items-center justify-between pb-3 border-b border-[#EADFCF]">
          <span className="font-title text-[11px] text-[#7A6251] bg-[#F4EDE2] px-3 py-1 rounded-full border border-[#E3D7C5]">
            ROUTY ACCOUNT
          </span>
          <span className="font-body text-[11px] text-[#A89889]">
            데이트 & 약속 플래너
          </span>
        </header>

        {/* 타이틀 영역 */}
        <div className="pt-2 text-center flex flex-col items-center">
          <span className="font-title text-3xl tracking-tight text-[#2D241E] flex items-center gap-0.5">
            ROUTY<span className="text-[#C25E3E]">.</span>
          </span>
          <h1 className="font-title text-xl tracking-tight text-[#2D241E] mt-1">
            {mode === 'login' ? '루티에 오신 것을 환영해요!' : '새로운 약속 시작하기'}
          </h1>
          <p className="font-body text-xs text-[#8C7A6B] mt-1.5 leading-relaxed">
            {mode === 'login'
              ? '아이디와 비밀번호로 간편하게 접속하세요'
              : '개인정보 입력 없이 아이디만으로 바로 가입할 수 있어요'}
          </p>
        </div>

        {/* ⚡ 원터치 테스트 로그인 영역 */}
        {mode === 'login' && (
          <div className="bg-[#F5EDE1] border border-[#E5D7C4] rounded-2xl p-3.5 flex flex-col gap-2 shadow-2xs">
            <div className="flex items-center justify-between px-0.5">
              <span className="font-title text-[11px] text-[#7A6251] flex items-center gap-1">
                <span>⚡</span> 원터치 테스트 로그인
              </span>
              <span className="font-body text-[10px] text-[#A89889]">PW: 1234</span>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                disabled={isLoading}
                onClick={() => handleQuickLogin('routy')}
                className="font-title py-2 px-1 bg-white hover:bg-[#FAF7F2] border border-[#DFCBB5] text-[#2D241E] text-[11px] rounded-xl shadow-2xs transition active:scale-95 flex items-center justify-center gap-1 disabled:opacity-50"
              >
                <span>routy</span>
              </button>
              <button
                type="button"
                disabled={isLoading}
                onClick={() => handleQuickLogin('admin')}
                className="font-title py-2 px-1 bg-white hover:bg-[#FAF7F2] border border-[#DFCBB5] text-[#2D241E] text-[11px] rounded-xl shadow-2xs transition active:scale-95 flex items-center justify-center gap-1 disabled:opacity-50"
              >
                <span>admin</span>
              </button>
              <button
                type="button"
                disabled={isLoading}
                onClick={() => handleQuickLogin('user')}
                className="font-title py-2 px-1 bg-white hover:bg-[#FAF7F2] border border-[#DFCBB5] text-[#2D241E] text-[11px] rounded-xl shadow-2xs transition active:scale-95 flex items-center justify-center gap-1 disabled:opacity-50"
              >
                <span>user</span>
              </button>
            </div>
          </div>
        )}

        {/* 탭 전환 버튼 */}
        <div className="font-title flex rounded-2xl bg-[#EFE8DC] p-1 text-xs border border-[#E2D5C3]">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError('');
              setSuccessMsg('');
            }}
            className={`flex-1 py-2.5 rounded-xl transition-all ${
              mode === 'login'
                ? 'bg-[#2D241E] text-[#F3D5B5] shadow-sm'
                : 'text-[#7A6251] hover:text-[#2D241E]'
            }`}
          >
            로그인
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('signup');
              setError('');
              setSuccessMsg('');
            }}
            className={`flex-1 py-2.5 rounded-xl transition-all ${
              mode === 'signup'
                ? 'bg-[#2D241E] text-[#F3D5B5] shadow-sm'
                : 'text-[#7A6251] hover:text-[#2D241E]'
            }`}
          >
            회원가입
          </button>
        </div>

        {/* 입력 폼 카드 */}
        <div className="bg-white p-6 rounded-[28px] border-2 border-[#EADFCF] shadow-[0_8px_24px_rgba(74,59,50,0.04)]">
          <form onSubmit={mode === 'login' ? handleLogin : handleSignUp} className="flex flex-col gap-4">
            {/* 아이디 필드 */}
            <div className="flex flex-col gap-1.5">
              <label className="font-title text-xs text-[#7A6251]">아이디</label>
              <input
                type="text"
                placeholder={mode === 'login' ? '아이디를 입력해주세요' : '사용할 아이디를 입력해주세요'}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="font-body px-4 py-3 text-xs bg-[#FAF7F2] rounded-xl border-2 border-[#EADFCF] text-[#2D241E] focus:outline-none focus:border-[#C25E3E] transition"
              />
            </div>

            {/* 비밀번호 필드 */}
            <div className="flex flex-col gap-1.5">
              <label className="font-title text-xs text-[#7A6251]">비밀번호</label>
              <input
                type="password"
                placeholder="비밀번호를 입력해주세요"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="font-body px-4 py-3 text-xs bg-[#FAF7F2] rounded-xl border-2 border-[#EADFCF] text-[#2D241E] focus:outline-none focus:border-[#C25E3E] transition"
              />
            </div>

            {/* 회원가입 시 비밀번호 확인 필드 */}
            {mode === 'signup' && (
              <div className="flex flex-col gap-1.5 animate-in fade-in duration-150">
                <label className="font-title text-xs text-[#7A6251]">비밀번호 확인</label>
                <input
                  type="password"
                  placeholder="비밀번호를 한 번 더 입력해주세요"
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  required
                  className="font-body px-4 py-3 text-xs bg-[#FAF7F2] rounded-xl border-2 border-[#EADFCF] text-[#2D241E] focus:outline-none focus:border-[#C25E3E] transition"
                />
              </div>
            )}

            {/* 에러 및 성공 메시지 */}
            {error && (
              <p className="font-body text-xs text-[#C25E3E] bg-[#F9ECE7] border border-[#F2D1C5] px-3.5 py-2.5 rounded-xl text-center break-keep">
                ⚠️ {error}
              </p>
            )}
            {successMsg && (
              <p className="font-body text-xs text-[#5B8C51] bg-[#F1F7EE] border border-[#D5E8CE] px-3.5 py-2.5 rounded-xl text-center break-keep">
                {successMsg}
              </p>
            )}

            {/* 제출 버튼 */}
            <button
              type="submit"
              disabled={isLoading}
              className="font-title mt-2 py-3.5 bg-[#2D241E] hover:bg-[#43362E] active:scale-[0.98] text-[#FAF7F2] text-xs rounded-2xl transition shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>처리 중...</span>
                </>
              ) : (
                <span>{mode === 'login' ? '로그인하기' : '가입 완료하기'}</span>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* 푸터 */}
      <footer className="font-body text-center text-[11px] text-[#A89889] pt-6">
        🔒 실시간 데이터베이스(Supabase)와 안전하게 연동되어 있습니다.
      </footer>
    </main>
  );
}