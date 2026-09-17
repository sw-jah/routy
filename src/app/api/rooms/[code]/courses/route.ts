
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// ======================================================
// 코스 목록 + 폴더 목록 조회
// GET /api/rooms/[code]/courses
// ======================================================
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const roomCode = decodeURIComponent(code).trim();

    if (!roomCode) {
      return NextResponse.json(
        { error: "방 코드가 필요합니다." },
        { status: 400 }
      );
    }

    const room = await prisma.room.findUnique({
      where: {
        code: roomCode,
      },
      include: {
        savedCourses: {
          include: {
            author: true,
          },
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });

    if (!room) {
      return NextResponse.json(
        { error: "방을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const courses = room.savedCourses.map((course) => ({
      id: course.id,
      roomCode: roomCode,
      folderName: course.folderName || "기본 폴더",
      courseTitle: course.courseTitle,
      summary: course.summary,
      location: course.location,
      steps: course.steps,
      createdAt: course.createdAt.getTime(),
      author: course.author?.username || "익명",
    }));

    return NextResponse.json({
      courses,
      folders: room.courseFolders || ["기본 폴더"],
    });
  } catch (error: any) {
    console.error("GET /api/rooms/[code]/courses Error:", error);

    return NextResponse.json(
      {
        error:
          error?.message ||
          "코스 목록을 불러오는 중 오류가 발생했습니다.",
      },
      { status: 500 }
    );
  }
}

// ======================================================
// 코스 저장
// POST /api/rooms/[code]/courses
// ======================================================
export async function POST(
  req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const roomCode = decodeURIComponent(code).trim();

    if (!roomCode) {
      return NextResponse.json(
        { error: "방 코드가 필요합니다." },
        { status: 400 }
      );
    }

    const body = await req.json();

    const {
      folderName,
      courseTitle,
      summary,
      location,
      steps,
      username,
    } = body;

    // --------------------------------------------------
    // 방 조회
    // --------------------------------------------------
    const room = await prisma.room.findUnique({
      where: {
        code: roomCode,
      },
      select: {
        id: true,
        code: true,
        courseFolders: true,
      },
    });

    if (!room) {
      return NextResponse.json(
        { error: "방을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // --------------------------------------------------
    // 작성자 조회
    // --------------------------------------------------
    if (!username) {
      return NextResponse.json(
        { error: "작성자 정보가 필요합니다." },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: {
        username: String(username),
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "유저를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // --------------------------------------------------
    // 폴더 이름
    // --------------------------------------------------
    const finalFolder =
      String(folderName || "기본 폴더").trim() || "기본 폴더";

    // --------------------------------------------------
    // 폴더가 존재하지 않는 경우 자동 생성
    // --------------------------------------------------
    if (!room.courseFolders.includes(finalFolder)) {
      await prisma.room.update({
        where: {
          id: room.id,
        },
        data: {
          courseFolders: {
            push: finalFolder,
          },
        },
      });
    }

    // --------------------------------------------------
    // 코스 데이터 기본 검증
    // --------------------------------------------------
    if (!courseTitle || !location) {
      return NextResponse.json(
        {
          error: "코스 제목과 장소 정보가 필요합니다.",
        },
        { status: 400 }
      );
    }

    if (!Array.isArray(steps)) {
      return NextResponse.json(
        {
          error: "코스 장소 정보가 올바르지 않습니다.",
        },
        { status: 400 }
      );
    }

    // --------------------------------------------------
    // 코스 저장
    // --------------------------------------------------
    const newCourse = await prisma.savedCourse.create({
      data: {
        roomId: room.id,
        userId: user.id,
        folderName: finalFolder,
        courseTitle: String(courseTitle),
        summary: String(summary || ""),
        location: String(location),
        steps,
      },
    });

    return NextResponse.json({
      success: true,
      course: {
        id: newCourse.id,
        roomCode: roomCode,
        folderName: newCourse.folderName,
        courseTitle: newCourse.courseTitle,
        summary: newCourse.summary,
        location: newCourse.location,
        steps: newCourse.steps,
        createdAt: newCourse.createdAt.getTime(),
        author: user.username,
      },
    });
  } catch (error: any) {
    console.error("POST /api/rooms/[code]/courses Error:", error);

    return NextResponse.json(
      {
        error:
          error?.message ||
          "코스 저장 중 서버 오류가 발생했습니다.",
      },
      { status: 500 }
    );
  }
}
