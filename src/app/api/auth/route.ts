// src/app/api/auth/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const { action, username, password } = await req.json();
    const cleanUsername = (username || "").trim();

    if (!cleanUsername || !password) {
      return NextResponse.json(
        { error: "아이디와 비밀번호를 모두 입력해주세요." },
        { status: 400 }
      );
    }

    // 1. 회원가입
    if (action === "register") {
      const existing = await prisma.user.findUnique({
        where: { username: cleanUsername },
      });

      if (existing) {
        return NextResponse.json(
          { error: "이미 존재하는 아이디입니다." },
          { status: 400 }
        );
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      await prisma.user.create({
        data: { username: cleanUsername, password: hashedPassword },
      });

      return NextResponse.json({ success: true, message: "회원가입 완료" });
    }

    // 2. 로그인
    if (action === "login") {
      const user = await prisma.user.findUnique({
        where: { username: cleanUsername },
      });

      if (!user) {
        return NextResponse.json(
          { error: "아이디 또는 비밀번호가 일치하지 않습니다." },
          { status: 401 }
        );
      }

      const isMatch = await bcrypt.compare(password, user.password);
      // 기존 테스트 계정(1234 평문 비밀번호) 호환
      const isPlainMatch = password === user.password;

      if (!isMatch && !isPlainMatch) {
        return NextResponse.json(
          { error: "아이디 또는 비밀번호가 일치하지 않습니다." },
          { status: 401 }
        );
      }

      return NextResponse.json({ success: true, username: user.username });
    }

    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  } catch (error: any) {
    console.error("Auth API Error:", error);
    return NextResponse.json(
      { error: error?.message || "인증 처리 중 서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}