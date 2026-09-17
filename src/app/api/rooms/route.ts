import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// 1. 유저가 참여 중인 방 목록 조회
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const username = searchParams.get("username");

    if (!username) {
      return NextResponse.json(
        { error: "username 파라미터가 필요합니다." },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { username },
      include: {
        roomMembers: {
          include: {
            room: {
              include: {
                // 방에 참여한 멤버
                members: {
                  include: {
                    user: true,
                  },
                },

                // 방에 저장된 장소
                places: true,

                // 방에 저장된 그룹
                groups: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ rooms: [] });
    }

    const rooms = user.roomMembers.map((rm) => ({
      code: rm.room.code,
      title: rm.room.title,

      // 참여 멤버 목록
      members: rm.room.members.map((m) => m.user.username),

      // 코스 폴더
      courseFolders: rm.room.courseFolders,

      // 기본 하트 색상
      defaultHeartColorId: rm.room.defaultHeartColorId,

      // 장소 목록
      places: rm.room.places.map((place) => ({
        id: place.id,
        kakaoId: place.kakaoId,
        name: place.name,
        category: place.category,
        subCategory: place.subCategory,
        address: place.address,
        lat: place.lat,
        lng: place.lng,
        placeUrl: place.placeUrl,
        isVisited: place.isVisited,
        group: place.groupName ?? undefined,
        })),

      // 그룹 목록
      groups: rm.room.groups.map((group) => ({
        id: group.id,
        name: group.name,
        colorId: group.colorId,
      })),

      // 마지막 수정 시간
      updatedAt: rm.room.updatedAt.getTime(),
    }));

    return NextResponse.json({ rooms });
  } catch (error: any) {
    console.error("GET Rooms Error:", error);

    return NextResponse.json(
      { error: error?.message || "방 목록을 불러오는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

// 2. 새 방 만들기
export async function POST(req: Request) {
  try {
    const { title, username } = await req.json();
    const cleanTitle = (title || "").trim();

    if (!cleanTitle || !username) {
      return NextResponse.json(
        { error: "방 이름과 유저네임이 필요합니다." },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { username },
    });

    if (!user) {
      return NextResponse.json(
        { error: "유저를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 6자리 랜덤 초대 코드 생성
    const code = Math.random()
      .toString(36)
      .substring(2, 8)
      .toUpperCase();

    const newRoom = await prisma.room.create({
      data: {
        code,
        title: cleanTitle,
        courseFolders: ["기본 폴더"],

        members: {
          create: {
            userId: user.id,
          },
        },
      },

      include: {
        members: {
          include: {
            user: true,
          },
        },

        // 새 방을 만들 때 places/groups는 기본적으로 빈 배열이지만
        // 응답 구조를 GET과 동일하게 맞춰줌
        places: true,
        groups: true,
      },
    });

    return NextResponse.json({
      success: true,
      code: newRoom.code,
      title: newRoom.title,

      members: newRoom.members.map((m) => m.user.username),

      courseFolders: newRoom.courseFolders,
      defaultHeartColorId: newRoom.defaultHeartColorId,

      places: newRoom.places.map((place) => ({
        id: place.id,
        kakaoId: place.kakaoId,
        name: place.name,
        category: place.category,
        subCategory: place.subCategory,
        address: place.address,
        lat: place.lat,
        lng: place.lng,
        placeUrl: place.placeUrl,
        isVisited: place.isVisited,
        groupName: place.groupName,
      })),

      groups: newRoom.groups.map((group) => ({
        id: group.id,
        name: group.name,
        colorId: group.colorId,
      })),

      updatedAt: newRoom.updatedAt.getTime(),
    });
  } catch (error: any) {
    console.error("POST Rooms Error:", error);

    return NextResponse.json(
      { error: error?.message || "방 생성 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
