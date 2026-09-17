
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      action,
      roomCode,
      place,
      placeId,
      isVisited,
      groupName,
      colorId,
    } = body;

    // --------------------------------------------------
    // 공통: roomCode 확인
    // --------------------------------------------------
    if (!roomCode) {
      return NextResponse.json(
        { error: "roomCode가 필요합니다." },
        { status: 400 }
      );
    }

    // --------------------------------------------------
    // 공통: 방 조회
    // --------------------------------------------------
    const room = await prisma.room.findUnique({
      where: {
        code: roomCode,
      },
    });

    if (!room) {
      return NextResponse.json(
        { error: "해당 약속 방을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // ==================================================
    // 1. 장소 추가
    // ==================================================
    if (action === "addPlace") {
      if (!place) {
        return NextResponse.json(
          { error: "저장할 장소 정보가 필요합니다." },
          { status: 400 }
        );
      }

      const kakaoId = String(
        place.kakaoId ?? place.id ?? ""
      ).trim();

      const name = String(place.name ?? "").trim();

      if (!kakaoId || !name) {
        return NextResponse.json(
          { error: "장소 ID와 장소 이름이 필요합니다." },
          { status: 400 }
        );
      }

      const lat = Number(place.lat);
      const lng = Number(place.lng);

      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        return NextResponse.json(
          { error: "장소의 위도/경도 정보가 올바르지 않습니다." },
          { status: 400 }
        );
      }

      /*
       * DateMap에서 보내는 Place에는 group이 있고,
       * Prisma RoomPlace에는 groupName이 있음.
       */
      const savedGroupName =
        place.group && String(place.group).trim()
          ? String(place.group).trim()
          : null;

      /*
       * 같은 방에 같은 카카오 장소가 이미 있다면
       * 새로 만들지 않고 기존 장소를 업데이트한다.
       */
      const existingPlace = await prisma.roomPlace.findFirst({
        where: {
          roomId: room.id,
          kakaoId,
        },
      });

      let savedPlace;

      if (existingPlace) {
        savedPlace = await prisma.roomPlace.update({
          where: {
            id: existingPlace.id,
          },
          data: {
            name,
            category: String(place.category ?? ""),
            subCategory: place.subCategory
              ? String(place.subCategory)
              : null,
            address: String(place.address ?? ""),
            lat,
            lng,
            placeUrl: place.placeUrl
              ? String(place.placeUrl)
              : null,
            groupName: savedGroupName,
          },
        });
      } else {
        savedPlace = await prisma.roomPlace.create({
          data: {
            roomId: room.id,
            kakaoId,
            name,
            category: String(place.category ?? ""),
            subCategory: place.subCategory
              ? String(place.subCategory)
              : null,
            address: String(place.address ?? ""),
            lat,
            lng,
            placeUrl: place.placeUrl
              ? String(place.placeUrl)
              : null,
            isVisited: Boolean(place.isVisited ?? false),
            groupName: savedGroupName,
          },
        });
      }

      return NextResponse.json({
        success: true,
        action: "addPlace",
        place: {
          id: savedPlace.id,
          kakaoId: savedPlace.kakaoId,
          name: savedPlace.name,
          category: savedPlace.category,
          subCategory: savedPlace.subCategory,
          address: savedPlace.address,
          lat: savedPlace.lat,
          lng: savedPlace.lng,
          placeUrl: savedPlace.placeUrl,
          isVisited: savedPlace.isVisited,
          group: savedPlace.groupName ?? undefined,
        },
      });
    }

    // ==================================================
    // 2. 장소 방문 여부 변경
    // ==================================================
    if (action === "toggleVisited") {
      if (!placeId) {
        return NextResponse.json(
          { error: "placeId가 필요합니다." },
          { status: 400 }
        );
      }

      if (typeof isVisited !== "boolean") {
        return NextResponse.json(
          { error: "isVisited 값이 필요합니다." },
          { status: 400 }
        );
      }

      const targetPlace = await prisma.roomPlace.findFirst({
        where: {
          id: String(placeId),
          roomId: room.id,
        },
      });

      if (!targetPlace) {
        return NextResponse.json(
          { error: "해당 장소를 찾을 수 없습니다." },
          { status: 404 }
        );
      }

      const updatedPlace = await prisma.roomPlace.update({
        where: {
          id: targetPlace.id,
        },
        data: {
          isVisited,
        },
      });

      return NextResponse.json({
        success: true,
        action: "toggleVisited",
        place: {
          id: updatedPlace.id,
          isVisited: updatedPlace.isVisited,
        },
      });
    }

    // ==================================================
    // 3. 장소 삭제
    // ==================================================
    if (action === "removePlace") {
      if (!placeId) {
        return NextResponse.json(
          { error: "placeId가 필요합니다." },
          { status: 400 }
        );
      }

      const targetPlace = await prisma.roomPlace.findFirst({
        where: {
          id: String(placeId),
          roomId: room.id,
        },
      });

      if (!targetPlace) {
        return NextResponse.json(
          { error: "삭제할 장소를 찾을 수 없습니다." },
          { status: 404 }
        );
      }

      await prisma.roomPlace.delete({
        where: {
          id: targetPlace.id,
        },
      });

      return NextResponse.json({
        success: true,
        action: "removePlace",
        placeId: targetPlace.id,
      });
    }

    // ==================================================
    // 4. 찜 그룹 추가
    // ==================================================
    if (action === "addGroup") {
      const trimmedGroupName = String(groupName ?? "").trim();

      if (!trimmedGroupName) {
        return NextResponse.json(
          { error: "그룹 이름을 입력해주세요." },
          { status: 400 }
        );
      }

      // 기본 찜은 실제 PlaceGroup으로 만들 필요가 없음
      if (
        trimmedGroupName === "기본 찜" ||
        trimmedGroupName === "전체"
      ) {
        return NextResponse.json(
          { error: "사용할 수 없는 그룹 이름입니다." },
          { status: 400 }
        );
      }

      // 이미 존재하는 그룹인지 확인
      const existingGroup = await prisma.placeGroup.findFirst({
        where: {
          roomId: room.id,
          name: trimmedGroupName,
        },
      });

      if (existingGroup) {
        return NextResponse.json(
          { error: "이미 존재하는 그룹 이름입니다." },
          { status: 409 }
        );
      }

      const newGroup = await prisma.placeGroup.create({
        data: {
          roomId: room.id,
          name: trimmedGroupName,
          colorId: colorId
            ? String(colorId)
            : "pastel-pink",
        },
      });

      return NextResponse.json({
        success: true,
        action: "addGroup",
        group: {
          id: newGroup.id,
          name: newGroup.name,
          colorId: newGroup.colorId,
        },
      });
    }

    // ==================================================
    // 5. 찜 그룹 삭제
    // ==================================================
    if (action === "deleteGroup") {
      const trimmedGroupName = String(groupName ?? "").trim();

      if (!trimmedGroupName) {
        return NextResponse.json(
          { error: "삭제할 그룹 이름이 필요합니다." },
          { status: 400 }
        );
      }

      if (trimmedGroupName === "기본 찜") {
        return NextResponse.json(
          { error: "기본 찜 그룹은 삭제할 수 없습니다." },
          { status: 400 }
        );
      }

      const targetGroup = await prisma.placeGroup.findFirst({
        where: {
          roomId: room.id,
          name: trimmedGroupName,
        },
      });

      if (!targetGroup) {
        return NextResponse.json(
          { error: "삭제할 그룹을 찾을 수 없습니다." },
          { status: 404 }
        );
      }

      /*
       * 해당 그룹을 삭제하기 전에
       * 그 그룹에 속해 있던 장소들을 기본 찜으로 이동.
       *
       * DB에서는 groupName이 nullable이므로 null로 변경한다.
       */
      await prisma.roomPlace.updateMany({
        where: {
          roomId: room.id,
          groupName: trimmedGroupName,
        },
        data: {
          groupName: null,
        },
      });

      await prisma.placeGroup.delete({
        where: {
          id: targetGroup.id,
        },
      });

      return NextResponse.json({
        success: true,
        action: "deleteGroup",
        groupName: trimmedGroupName,
      });
    }

    // ==================================================
    // 6. 그룹 색상 변경
    // ==================================================
    if (action === "updateGroupColor") {
      const trimmedGroupName = String(groupName ?? "").trim();

      if (!trimmedGroupName || !colorId) {
        return NextResponse.json(
          { error: "그룹 이름과 색상 정보가 필요합니다." },
          { status: 400 }
        );
      }

      if (trimmedGroupName === "기본 찜") {
        const updatedRoom = await prisma.room.update({
          where: {
            id: room.id,
          },
          data: {
            defaultHeartColorId: String(colorId),
          },
        });

        return NextResponse.json({
          success: true,
          action: "updateGroupColor",
          type: "default",
          colorId: updatedRoom.defaultHeartColorId,
        });
      }

      const targetGroup = await prisma.placeGroup.findFirst({
        where: {
          roomId: room.id,
          name: trimmedGroupName,
        },
      });

      if (!targetGroup) {
        return NextResponse.json(
          { error: "해당 그룹을 찾을 수 없습니다." },
          { status: 404 }
        );
      }

      const updatedGroup = await prisma.placeGroup.update({
        where: {
          id: targetGroup.id,
        },
        data: {
          colorId: String(colorId),
        },
      });

      return NextResponse.json({
        success: true,
        action: "updateGroupColor",
        group: {
          id: updatedGroup.id,
          name: updatedGroup.name,
          colorId: updatedGroup.colorId,
        },
      });
    }

    // ==================================================
    // 7. 장소를 다른 그룹으로 이동
    // ==================================================
    if (action === "movePlaceToGroup") {
      if (!placeId) {
        return NextResponse.json(
          { error: "placeId가 필요합니다." },
          { status: 400 }
        );
      }

      const targetPlace = await prisma.roomPlace.findFirst({
        where: {
          id: String(placeId),
          roomId: room.id,
        },
      });

      if (!targetPlace) {
        return NextResponse.json(
          { error: "해당 장소를 찾을 수 없습니다." },
          { status: 404 }
        );
      }

      const targetGroupName =
        groupName &&
        String(groupName).trim() &&
        String(groupName).trim() !== "기본 찜"
          ? String(groupName).trim()
          : null;

      // 실제 그룹으로 이동하는 경우 그룹 존재 여부 확인
      if (targetGroupName) {
        const targetGroup = await prisma.placeGroup.findFirst({
          where: {
            roomId: room.id,
            name: targetGroupName,
          },
        });

        if (!targetGroup) {
          return NextResponse.json(
            { error: "이동할 그룹을 찾을 수 없습니다." },
            { status: 404 }
          );
        }
      }

      const updatedPlace = await prisma.roomPlace.update({
        where: {
          id: targetPlace.id,
        },
        data: {
          groupName: targetGroupName,
        },
      });

      return NextResponse.json({
        success: true,
        action: "movePlaceToGroup",
        place: {
          id: updatedPlace.id,
          group: updatedPlace.groupName ?? undefined,
        },
      });
    }

    // ==================================================
    // 지원하지 않는 action
    // ==================================================
    return NextResponse.json(
      {
        error: `지원하지 않는 action입니다: ${String(action)}`,
      },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("POST /api/places/sync Error:", error);

    return NextResponse.json(
      {
        error:
          error?.message ||
          "장소/그룹 정보를 저장하는 중 서버 오류가 발생했습니다.",
      },
      { status: 500 }
    );
  }
}