// src/app/api/food-pick/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// 1. 방 멤버들의 오늘 메뉴 현황 조회
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const roomCode = searchParams.get("roomCode");

    if (!roomCode) {
      return NextResponse.json({ error: "roomCode가 필요합니다." }, { status: 400 });
    }

    const room = await prisma.room.findUnique({
      where: { code: roomCode },
      include: {
        members: {
          include: { user: true },
        },
        foodPicks: {
          include: { user: true },
        },
      },
    });

    if (!room) {
      return NextResponse.json({ error: "방을 찾을 수 없습니다." }, { status: 404 });
    }

    const todayStr = new Date().toISOString().split("T")[0];

    // 방에 속한 모든 멤버와 오늘의 픽 매핑
    const results = room.members.map((member) => {
      const pick = room.foodPicks.find(
        (p) => p.userId === member.userId && p.date === todayStr
      );

      return {
        username: member.user.username,
        menuName: pick ? pick.menuName : "",
        category: pick ? pick.category : "",
        isCompleted: Boolean(pick),
      };
    });

    return NextResponse.json({
      today: todayStr,
      results,
    });
  } catch (error: any) {
    console.error("GET /api/food-pick Error:", error);
    return NextResponse.json({ error: error?.message || "서버 오류" }, { status: 500 });
  }
}

// 2. 오늘의 메뉴 픽 저장
export async function POST(req: Request) {
  try {
    const { roomCode, username, menuName, category } = await req.json();

    if (!roomCode || !username || !menuName) {
      return NextResponse.json({ error: "필수 정보가 누락되었습니다." }, { status: 400 });
    }

    const room = await prisma.room.findUnique({ where: { code: roomCode } });
    const user = await prisma.user.findUnique({ where: { username } });

    if (!room || !user) {
      return NextResponse.json({ error: "방 또는 유저를 찾을 수 없습니다." }, { status: 404 });
    }

    const todayStr = new Date().toISOString().split("T")[0];

    const savedPick = await prisma.dailyFoodPick.upsert({
      where: {
        roomId_userId_date: {
          roomId: room.id,
          userId: user.id,
          date: todayStr,
        },
      },
      update: {
        menuName,
        category: category || "기타",
      },
      create: {
        roomId: room.id,
        userId: user.id,
        date: todayStr,
        menuName,
        category: category || "기타",
      },
    });

    return NextResponse.json({ success: true, savedPick });
  } catch (error: any) {
    console.error("POST /api/food-pick Error:", error);
    return NextResponse.json({ error: error?.message || "서버 오류" }, { status: 500 });
  }
}