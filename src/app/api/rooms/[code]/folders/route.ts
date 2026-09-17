
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// ======================================================
// 폴더 목록 조회
// GET /api/rooms/[code]/folders
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
      select: {
        courseFolders: true,
      },
    });

    if (!room) {
      return NextResponse.json(
        { error: "방을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      folders: room.courseFolders || ["기본 폴더"],
    });
  } catch (error: any) {
    console.error("GET /api/rooms/[code]/folders Error:", error);

    return NextResponse.json(
      {
        error:
          error?.message ||
          "폴더 목록을 불러오는 중 오류가 발생했습니다.",
      },
      { status: 500 }
    );
  }
}

// ======================================================
// 폴더 생성 / 삭제
// POST /api/rooms/[code]/folders
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

    const action = body?.action;
    const folderName = String(body?.folderName ?? "").trim();

    if (!action) {
      return NextResponse.json(
        { error: "action이 필요합니다." },
        { status: 400 }
      );
    }

    if (!folderName) {
      return NextResponse.json(
        { error: "폴더 이름을 입력해주세요." },
        { status: 400 }
      );
    }

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

    // ==================================================
    // 1. 폴더 생성
    // ==================================================
    if (action === "create" || action === "createFolder") {
      // 기본 폴더는 이미 존재하는 폴더이므로 중복 생성 방지
      if (folderName === "기본 폴더") {
        return NextResponse.json(
          { error: "기본 폴더는 이미 존재합니다." },
          { status: 400 }
        );
      }

      // 기존 폴더와 이름 중복 확인
      if (room.courseFolders.includes(folderName)) {
        return NextResponse.json(
          { error: "이미 존재하는 폴더 이름입니다." },
          { status: 400 }
        );
      }

      // 빈 문자열 방지
      if (folderName.length === 0) {
        return NextResponse.json(
          { error: "폴더 이름을 입력해주세요." },
          { status: 400 }
        );
      }

      // 폴더 개수 제한이 필요하다면 여기서 추가 가능
      const updatedFolders = [
        ...room.courseFolders,
        folderName,
      ];

      const updatedRoom = await prisma.room.update({
        where: {
          id: room.id,
        },
        data: {
          courseFolders: updatedFolders,
        },
        select: {
          courseFolders: true,
        },
      });

      return NextResponse.json({
        success: true,
        folderName,
        folders: updatedRoom.courseFolders,
      });
    }

    // ==================================================
    // 2. 폴더 삭제
    // ==================================================
    if (action === "delete" || action === "deleteFolder") {
      // 기본 폴더는 삭제 금지
      if (folderName === "기본 폴더") {
        return NextResponse.json(
          { error: "기본 폴더는 삭제할 수 없습니다." },
          { status: 400 }
        );
      }

      // 해당 폴더가 실제로 존재하는지 확인
      if (!room.courseFolders.includes(folderName)) {
        return NextResponse.json(
          { error: "존재하지 않는 폴더입니다." },
          { status: 404 }
        );
      }

      const updatedFolders = room.courseFolders.filter(
        (folder: string) => folder !== folderName
      );

      /*
       * 폴더를 삭제할 때
       * 해당 폴더에 들어 있던 코스도 함께 삭제한다.
       *
       * 기존 코스 보관함의 동작과 동일하게 유지.
       */
      await prisma.$transaction([
        prisma.savedCourse.deleteMany({
          where: {
            roomId: room.id,
            folderName,
          },
        }),

        prisma.room.update({
          where: {
            id: room.id,
          },
          data: {
            courseFolders: updatedFolders,
          },
        }),
      ]);

      return NextResponse.json({
        success: true,
        folderName,
        folders: updatedFolders,
      });
    }

    // ==================================================
    // 지원하지 않는 action
    // ==================================================
    return NextResponse.json(
      {
        error: `지원하지 않는 폴더 action입니다: ${String(action)}`,
      },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("POST /api/rooms/[code]/folders Error:", error);

    return NextResponse.json(
      {
        error:
          error?.message ||
          "폴더 처리 중 서버 오류가 발생했습니다.",
      },
      { status: 500 }
    );
  }
}
