// src/app/course/storage/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// 1. 코스 목록 및 공식 폴더 조회
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const roomCode = searchParams.get("roomCode");

    if (!roomCode) {
      return NextResponse.json({ error: "roomCode 파라미터가 필요합니다." }, { status: 400 });
    }

    const room = await prisma.room.findUnique({
      where: { code: roomCode },
      include: {
        savedCourses: {
          include: { author: true },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!room) {
      return NextResponse.json({ error: "방을 찾을 수 없습니다." }, { status: 404 });
    }

    // 💡 c 매개변수에 any 명시적 선언
    const courses = room.savedCourses.map((c: any) => ({
      id: c.id,
      roomCode,
      folderName: c.folderName,
      courseTitle: c.courseTitle,
      summary: c.summary,
      location: c.location,
      steps: c.steps,
      createdAt: c.createdAt.getTime(),
      author: c.author?.username || "익명",
    }));

    return NextResponse.json({ courses, folders: room.courseFolders });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}

// 2. 코스 저장 / 코스 삭제 / 폴더 생성 / 폴더 삭제 통합 처리
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, roomCode } = body;

    const room = await prisma.room.findUnique({ where: { code: roomCode } });
    if (!room) {
      return NextResponse.json({ error: "방을 찾을 수 없습니다." }, { status: 404 });
    }

    // A. 코스 플랜 저장
    if (action === "saveCourse") {
      const { folderName, courseTitle, summary, location, steps, username } = body;
      const user = await prisma.user.findUnique({ where: { username } });
      if (!user) return NextResponse.json({ error: "유저를 찾을 수 없습니다." }, { status: 404 });

      const finalFolder = (folderName || "기본 폴더").trim();

      if (!room.courseFolders.includes(finalFolder)) {
        await prisma.room.update({
          where: { id: room.id },
          data: { courseFolders: { push: finalFolder } },
        });
      }

      const newCourse = await prisma.savedCourse.create({
        data: {
          roomId: room.id,
          userId: user.id,
          folderName: finalFolder,
          courseTitle: courseTitle || `${location} 데이트 코스`,
          summary: summary || "",
          location: location || "서울",
          steps,
        },
      });

      return NextResponse.json({ success: true, course: newCourse });
    }

    // B. 코스 단일 삭제
    if (action === "deleteCourse") {
      const { courseId } = body;
      await prisma.savedCourse.deleteMany({
        where: { id: courseId, roomId: room.id },
      });
      return NextResponse.json({ success: true });
    }

    // C. 새 빈 폴더 생성
    if (action === "createFolder") {
      const trimmedFolder = (body.folderName || "").trim();
      if (room.courseFolders.includes(trimmedFolder)) {
        return NextResponse.json({ error: "이미 존재하는 폴더 이름입니다." }, { status: 400 });
      }

      await prisma.room.update({
        where: { id: room.id },
        data: { courseFolders: { push: trimmedFolder } },
      });
      return NextResponse.json({ success: true, folderName: trimmedFolder });
    }

    // D. 폴더 및 폴더 내 코스 일괄 삭제
    if (action === "deleteFolder") {
      const trimmedFolder = (body.folderName || "").trim();
      // 💡 f 매개변수에 string 명시적 선언
      const updatedFolders = room.courseFolders.filter((f: string) => f !== trimmedFolder);

      await prisma.$transaction([
        prisma.savedCourse.deleteMany({
          where: { roomId: room.id, folderName: trimmedFolder },
        }),
        prisma.room.update({
          where: { id: room.id },
          data: { courseFolders: updatedFolders },
        }),
      ]);

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "잘못된 action입니다." }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}