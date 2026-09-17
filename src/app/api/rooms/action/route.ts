// src/app/api/rooms/action/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { action, code, username, targetUsername } = await req.json();

    const room = await prisma.room.findUnique({
      where: { code },
      include: { members: { include: { user: true } } },
    });

    if (!room) {
      return NextResponse.json({ error: "존재하지 않는 방 코드입니다." }, { status: 404 });
    }

    // 1. 방 참여하기
    if (action === "join") {
      const user = await prisma.user.findUnique({ where: { username } });
      if (!user) return NextResponse.json({ error: "유저를 찾을 수 없습니다." }, { status: 404 });

      const isAlreadyMember = room.members.some((m) => m.userId === user.id);
      if (!isAlreadyMember) {
        if (room.members.length >= 4) {
          return NextResponse.json({ error: "방 인원이 가득 찼습니다 (최대 4명)." }, { status: 400 });
        }
        await prisma.roomMember.create({
          data: { roomId: room.id, userId: user.id },
        });
      }

      return NextResponse.json({ success: true });
    }

    // 2. 친구 초대하기
    if (action === "invite") {
      const targetUser = await prisma.user.findUnique({ where: { username: targetUsername } });
      if (!targetUser) {
        return NextResponse.json({ error: "존재하지 않는 유저 아이디입니다." }, { status: 404 });
      }

      const isAlreadyMember = room.members.some((m) => m.userId === targetUser.id);
      if (!isAlreadyMember) {
        if (room.members.length >= 4) {
          return NextResponse.json({ error: "방 인원이 이미 4명입니다." }, { status: 400 });
        }
        await prisma.roomMember.create({
          data: { roomId: room.id, userId: targetUser.id },
        });
      }

      return NextResponse.json({ success: true });
    }

    // 3. 방 나가기
    if (action === "leave") {
      const user = await prisma.user.findUnique({ where: { username } });
      if (!user) return NextResponse.json({ error: "유저를 찾을 수 없습니다." }, { status: 404 });

      await prisma.roomMember.deleteMany({
        where: { roomId: room.id, userId: user.id },
      });

      // 방에 남은 멤버가 0명이면 방 자체를 삭제할 수도 있음
      const remaining = await prisma.roomMember.count({ where: { roomId: room.id } });
      if (remaining === 0) {
        await prisma.room.delete({ where: { id: room.id } });
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  } catch (error: any) {
    console.error("Room Action Error:", error);
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}