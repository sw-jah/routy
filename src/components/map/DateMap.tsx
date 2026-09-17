// src/components/map/DateMap.tsx
'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { getCurrentUser } from '@/lib/authMock';
import type { Place } from '@/types/common';

export interface HeartColor {
  id: string;
  name: string;
  fill: string;
  stroke: string;
}

export const HEART_PALETTE: HeartColor[] = [
  { id: 'pastel-pink', name: '파스텔 핑크', fill: '#FBC4CE', stroke: '#E88A9A' },
  { id: 'pastel-yellow', name: '버터 옐로우', fill: '#FCE79A', stroke: '#E0B84C' },
  { id: 'pastel-green', name: '세이지 민트', fill: '#BFDEBE', stroke: '#7EA87D' },
  { id: 'classic-red', name: '클래식 레드', fill: '#FF4D4D', stroke: '#CC1F1F' },
  { id: 'vivid-blue', name: '코발트 블루', fill: '#3E82F7', stroke: '#1B54C4' },
];

export interface GroupItem {
  name: string;
  colorId: string;
}

export interface MapRoom {
  code: string;
  title: string;
  places: Place[];
  groups: GroupItem[];
  defaultHeartColorId?: string;
  updatedAt: number;
  members: string[];
}

const DEFAULT_GROUPS: GroupItem[] = [
  { name: '기본 그룹', colorId: 'pastel-yellow' },
];

const CURRENT_ROOM_KEY = 'routy_current_room_code';

interface DateMapProps {
  externalNewPlace?: Place | null;
}

export default function DateMap({ externalNewPlace }: DateMapProps) {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') || '';

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const overlaysRef = useRef<any[]>([]);
  const [mapReady, setMapReady] = useState(false);

  const [currentUser, setCurrentUser] = useState<string>('');
  const [rooms, setRooms] = useState<MapRoom[]>([]);
  const [activeCode, setActiveCode] = useState<string>('');
  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(true); // 💡 초기 방 데이터 로딩 상태 분기

  const [selectedGroup, setSelectedGroup] = useState<string>('전체');

  // 모달 및 설정 상태
  const [activeColorPicker, setActiveColorPicker] = useState(false);
  const colorPickerContainerRef = useRef<HTMLDivElement>(null);
  const [showInviteCode, setShowInviteCode] = useState(false);
  const [showMembersList, setShowMembersList] = useState(false);
  const [showAddGroupModal, setShowAddGroupModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupColorId, setNewGroupColorId] = useState('pastel-pink');
  const [alertModalMessage, setAlertModalMessage] = useState<string | null>(null);
  const [groupToDelete, setGroupToDelete] = useState<string | null>(null);
  const [showLeaveModal, setShowLeaveModal] = useState(false);

  // 친구 직접 초대 모달 상태
  const [showInviteUserModal, setShowInviteUserModal] = useState(false);
  const [inviteUsernameInput, setInviteUsernameInput] = useState('');

  const [showRoomModal, setShowRoomModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'join'>('create');
  const [newRoomTitle, setNewRoomTitle] = useState('');
  const [joinRoomCode, setJoinRoomCode] = useState('');
  const [copyFeedback, setCopyFeedback] = useState(false);

  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  // 1. 방 목록 API 새로고침
  const fetchMyRooms = useCallback(async (user: string, targetRoomCode?: string) => {
    try {
      const res = await fetch(`/api/rooms?username=${encodeURIComponent(user)}`);
      if (!res.ok) throw new Error('방 목록을 불러오지 못했습니다.');

      const data = await res.json();
      const myRooms: MapRoom[] = data.rooms || [];
      setRooms(myRooms);

      if (myRooms.length > 0) {
        const hash = window.location.hash.replace('#', '').toUpperCase();
        let target =
          targetRoomCode ||
          (hash && myRooms.some((r) => r.code === hash) ? hash : null) ||
          localStorage.getItem(CURRENT_ROOM_KEY) ||
          myRooms[0].code;

        if (!myRooms.some((r) => r.code === target)) target = myRooms[0].code;

        setActiveCode(target);
        window.location.hash = target;
        localStorage.setItem(CURRENT_ROOM_KEY, target);
      } else {
        setActiveCode('');
        localStorage.removeItem(CURRENT_ROOM_KEY);
      }
    } catch (err: any) {
      console.error(err);
      setStatus('error');
      setErrorMessage(err?.message || '방 목록 로드 실패');
    } finally {
      setIsInitialLoading(false); // 💡 조회가 끝나면 초기 로딩 완료
    }
  }, []);

  // 2. 초기 로드
  useEffect(() => {
    const user = getCurrentUser() || '';
    setCurrentUser(user);
    if (user) {
      fetchMyRooms(user);
    } else {
      setIsInitialLoading(false);
      setStatus('ready');
    }
  }, [fetchMyRooms]);

  // 외부 클릭 시 컬러 피커 닫기
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        colorPickerContainerRef.current &&
        !colorPickerContainerRef.current.contains(e.target as Node)
      ) {
        setActiveColorPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentRoom: MapRoom | undefined = rooms.find((r) => r.code === activeCode);

  // 외부에서 전달된 신규 장소 DB 저장
  useEffect(() => {
    if (!externalNewPlace || !currentRoom) return;

    const saveExternalPlace = async () => {
      try {
        await fetch('/api/places/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'addPlace',
            roomCode: currentRoom.code,
            place: externalNewPlace,
          }),
        });
        fetchMyRooms(currentUser, currentRoom.code);
      } catch (err) {
        console.error('외부 장소 동기화 실패:', err);
      }
    };

    saveExternalPlace();
  }, [externalNewPlace, currentRoom, currentUser, fetchMyRooms]);

  const getHeartStyleForPlace = useCallback(
    (place: Place) => {
      if (!place.isVisited) {
        return { fill: '#FAF7F2', stroke: '#D5C2AD', strokeWidth: '2.5' };
      }

      const allGroups = [
        ...DEFAULT_GROUPS,
        ...(currentRoom?.groups || []).filter((g) => g.name !== '기본 그룹'),
      ];

      const matchedGroup = place.group
        ? allGroups.find((g) => g.name === place.group)
        : undefined;

      const colorId = matchedGroup?.colorId || currentRoom?.defaultHeartColorId || 'pastel-pink';
      const colorConfig = HEART_PALETTE.find((c) => c.id === colorId) || HEART_PALETTE[0];

      return { fill: colorConfig.fill, stroke: colorConfig.stroke, strokeWidth: '2' };
    },
    [currentRoom]
  );

  const executeSearch = useCallback((keyword: string) => {
    if (!keyword.trim() || !window.kakao?.maps?.services) return;
    setIsSearching(true);
    const ps = new window.kakao.maps.services.Places();
    ps.keywordSearch(keyword, (data: any, s: any) => {
      setIsSearching(false);
      if (s === window.kakao.maps.services.Status.OK) {
        setSearchResults(data.slice(0, 5));
        if (mapInstanceRef.current && data[0]) {
          mapInstanceRef.current.panTo(new window.kakao.maps.LatLng(data[0].y, data[0].x));
        }
      } else {
        setSearchResults([]);
      }
    });
  }, []);

  useEffect(() => {
    if (initialQuery) {
      setSearchQuery(initialQuery);
      if (status === 'ready' && selectedGroup !== '전체') {
        executeSearch(initialQuery);
      }
    }
  }, [initialQuery, status, selectedGroup, executeSearch]);

  // 카카오 지도 SDK 로드
  useEffect(() => {
    if (rooms.length === 0) {
      setStatus('ready');
      return;
    }

    const apiKey = process.env.NEXT_PUBLIC_KAKAO_MAP_API_KEY;
    if (!apiKey) {
      setStatus('error');
      setErrorMessage('.env.local에 NEXT_PUBLIC_KAKAO_MAP_API_KEY가 없습니다.');
      return;
    }

    const initMap = () => {
      if (!mapContainerRef.current || !window.kakao?.maps) return;
      window.kakao.maps.load(() => {
        if (!mapContainerRef.current) return;
        const center = new window.kakao.maps.LatLng(37.54458, 127.05603);
        const map = new window.kakao.maps.Map(mapContainerRef.current, { center, level: 4 });

        window.kakao.maps.event.addListener(map, 'click', () => {
          setSelectedPlaceId(null);
        });

        map.addControl(new window.kakao.maps.ZoomControl(), window.kakao.maps.ControlPosition.RIGHT);
        mapInstanceRef.current = map;
        setMapReady(true);
        setStatus('ready');

        if (initialQuery) executeSearch(initialQuery);
      });
    };

    if (window.kakao?.maps) {
      initMap();
      return;
    }

    const script = document.createElement('script');
    script.id = 'kakao-map-script';
    script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${apiKey}&autoload=false&libraries=services,clusterer`;
    script.async = true;
    document.head.appendChild(script);

    script.onload = () => initMap();
    script.onerror = () => {
      setStatus('error');
      setErrorMessage('카카오 지도 스크립트 로드 실패');
    };

    return () => {
      overlaysRef.current.forEach((o) => o.setMap(null));
    };
  }, [executeSearch, initialQuery, rooms.length]);

  // 지도 마커 렌더링
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || status !== 'ready' || !currentRoom) return;

    overlaysRef.current.forEach((o) => o.setMap(null));
    overlaysRef.current = [];

    const filteredPlaces = currentRoom.places.filter((p) => {
      if (selectedGroup === '전체') return true;
      if (selectedGroup === '기본 찜') {
        const allGroups = [
          ...DEFAULT_GROUPS,
          ...(currentRoom.groups || []).filter((g) => g.name !== '기본 그룹'),
        ];
        return !p.group || !allGroups.some((g) => g.name === p.group);
      }
      return p.group === selectedGroup;
    });

    filteredPlaces.forEach((place) => {
      const position = new window.kakao.maps.LatLng(place.lat, place.lng);
      const isSelected = selectedPlaceId === place.id;
      const heartStyle = getHeartStyleForPlace(place);

      const markerEl = document.createElement('div');
      markerEl.className = 'flex flex-col items-center cursor-pointer select-none';

      const heartSvg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="34" height="34" viewBox="0 0 24 24" fill="${heartStyle.fill}" stroke="${heartStyle.stroke}" stroke-width="${heartStyle.strokeWidth}">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
        </svg>
      `;

      markerEl.innerHTML = `
        <div class="marker-heart ${isSelected ? 'scale-125' : 'hover:scale-110'}" style="filter: drop-shadow(0 4px 8px rgba(45,36,30,0.18)); transition: transform 0.2s; cursor: ${selectedGroup === '전체' ? 'default' : 'pointer'};">
          ${heartSvg}
        </div>
        <span style="background: ${isSelected ? '#2D241E' : '#FFFFFF'}; color: ${isSelected ? '#F3D5B5' : '#2D241E'}; border: 2px solid ${isSelected ? '#C25E3E' : '#EADFCF'}; padding: 3px 10px; border-radius: 9999px; font-size: 11px; font-weight: 700; margin-top: 3px; box-shadow: 0 3px 8px rgba(74,59,50,0.08); white-space: nowrap; font-family: 'GmarketSansBold', sans-serif;">
          📍 ${place.name}
        </span>
      `;

      const heartEl = markerEl.querySelector('.marker-heart');
      heartEl?.addEventListener('click', (e) => {
        e.stopPropagation();
        if (selectedGroup !== '전체') {
          toggleVisited(place.id);
        }
      });

      markerEl.addEventListener('click', (e) => {
        e.stopPropagation();
        setSelectedPlaceId((prev) => (prev === place.id ? null : place.id));
      });

      const overlay = new window.kakao.maps.CustomOverlay({ position, content: markerEl, yAnchor: 1.15 });
      overlay.setMap(map);
      overlaysRef.current.push(overlay);
    });
  }, [currentRoom, selectedGroup, selectedPlaceId, status, mapReady, getHeartStyleForPlace]);

  // 지도 영역 자동 맞춤
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapReady || status !== 'ready' || !currentRoom) return;

    const filteredPlaces = currentRoom.places.filter((p) => {
      if (selectedGroup === '전체') return true;
      if (selectedGroup === '기본 찜') {
        const allGroups = [
          ...DEFAULT_GROUPS,
          ...(currentRoom.groups || []).filter((g) => g.name !== '기본 그룹'),
        ];
        return !p.group || !allGroups.some((g) => g.name === p.group);
      }
      return p.group === selectedGroup;
    });

    if (filteredPlaces.length === 0) {
      map.setLevel(13);
      map.panTo(new window.kakao.maps.LatLng(36.5, 127.8));
      return;
    }

    if (filteredPlaces.length === 1) {
      map.setLevel(5);
      map.panTo(new window.kakao.maps.LatLng(filteredPlaces[0].lat, filteredPlaces[0].lng));
      return;
    }

    const bounds = new window.kakao.maps.LatLngBounds();
    filteredPlaces.forEach((place) => {
      bounds.extend(new window.kakao.maps.LatLng(place.lat, place.lng));
    });
    map.setBounds(bounds, 80, 80, 80, 80);

    if (map.getLevel() > 12) {
      map.setLevel(12);
    }
  }, [selectedGroup, mapReady, status, currentRoom]);

  // 하트 방문 여부 토글
  const toggleVisited = async (placeId: string) => {
    if (!currentRoom) return;
    const targetPlace = currentRoom.places.find((p) => p.id === placeId);
    if (!targetPlace) return;

    const nextVisited = !targetPlace.isVisited;

    setRooms((prevRooms) =>
      prevRooms.map((r) =>
        r.code === currentRoom.code
          ? {
              ...r,
              places: r.places.map((p) => (p.id === placeId ? { ...p, isVisited: nextVisited } : p)),
            }
          : r
      )
    );

    try {
      await fetch('/api/places/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'toggleVisited',
          roomCode: currentRoom.code,
          placeId,
          isVisited: nextVisited,
        }),
      });
    } catch (err) {
      console.error('방문 상태 저장 실패:', err);
      fetchMyRooms(currentUser, currentRoom.code);
    }
  };

  const handleSelectOrUnselectPlace = (place: Place) => {
    if (selectedPlaceId === place.id) {
      setSelectedPlaceId(null);
    } else {
      focusPlace(place);
    }
  };

  const focusPlace = (place: Place) => {
    setSelectedPlaceId(place.id);
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.setLevel(3);
    mapInstanceRef.current.panTo(new window.kakao.maps.LatLng(place.lat, place.lng));
  };

  const removePlaceItem = async (placeId: string) => {
    if (!currentRoom) return;

    setRooms((prevRooms) =>
      prevRooms.map((r) =>
        r.code === currentRoom.code
          ? { ...r, places: r.places.filter((p) => p.id !== placeId) }
          : r
      )
    );
    if (selectedPlaceId === placeId) setSelectedPlaceId(null);

    try {
      await fetch('/api/places/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'removePlace',
          roomCode: currentRoom.code,
          placeId,
        }),
      });
    } catch (err) {
      console.error('장소 삭제 실패:', err);
      fetchMyRooms(currentUser, currentRoom.code);
    }
  };

  const handleUpdateActiveColor = async (newColorId: string) => {
    if (!currentRoom || selectedGroup === '전체') return;

    if (selectedGroup === '기본 그룹') {
      setActiveColorPicker(false);
      return;
    }

    setRooms((prevRooms) =>
      prevRooms.map((r) => {
        if (r.code !== currentRoom.code) return r;
        if (selectedGroup === '기본 찜') {
          return { ...r, defaultHeartColorId: newColorId };
        }
        return {
          ...r,
          groups: (r.groups || []).map((g) =>
            g.name === selectedGroup ? { ...g, colorId: newColorId } : g
          ),
        };
      })
    );

    try {
      const res = await fetch('/api/places/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'updateGroupColor',
          roomCode: currentRoom.code,
          groupName: selectedGroup,
          colorId: newColorId,
        }),
      });

      if (!res.ok) {
        throw new Error('하트 색상 저장에 실패했습니다.');
      }
    } catch (err) {
      console.error('그룹 하트 색상 저장 실패:', err);
      await fetchMyRooms(currentUser, currentRoom.code);
      setAlertModalMessage('하트 색상 저장에 실패했습니다.');
    } finally {
      setActiveColorPicker(false);
    }
  };

  const handleAddGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newGroupName.trim();
    if (!trimmed || !currentRoom) return;

    if (trimmed === '기본 찜' || trimmed === '기본 그룹' || currentRoom.groups?.some((g) => g.name === trimmed)) {
      setAlertModalMessage('이미 존재하는 그룹 이름입니다.');
      return;
    }

    try {
      const res = await fetch('/api/places/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'addGroup',
          roomCode: currentRoom.code,
          groupName: trimmed,
          colorId: newGroupColorId,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setAlertModalMessage(data.error || '그룹 생성에 실패했습니다.');
        return;
      }

      await fetchMyRooms(currentUser, currentRoom.code);
      setSelectedGroup(trimmed);
      setNewGroupName('');
      setShowAddGroupModal(false);
    } catch (err) {
      console.error(err);
      setAlertModalMessage('그룹 추가 중 오류가 발생했습니다.');
    }
  };

  const confirmDeleteGroup = async () => {
    if (!groupToDelete || !currentRoom) return;

    if (groupToDelete === '기본 그룹') {
      setAlertModalMessage('기본 그룹은 삭제할 수 없습니다.');
      setGroupToDelete(null);
      return;
    }

    try {
      const res = await fetch('/api/places/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'deleteGroup',
          roomCode: currentRoom.code,
          groupName: groupToDelete,
        }),
      });

      if (!res.ok) {
        let message = '그룹 삭제에 실패했습니다.';
        try {
          const data = await res.json();
          message = data.error || message;
        } catch {}
        throw new Error(message);
      }

      if (selectedGroup === groupToDelete) setSelectedGroup('기본 찜');
      setGroupToDelete(null);
      await fetchMyRooms(currentUser, currentRoom.code);
    } catch (err: any) {
      console.error('그룹 삭제 실패:', err);
      setAlertModalMessage(err?.message || '그룹 삭제에 실패했습니다.');
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedGroup === '전체') {
      setSearchResults([]);
      return;
    }
    executeSearch(searchQuery);
  };

  const addPlaceFromSearch = async (item: any) => {
    if (!currentRoom) return;

    const assignedGroup = selectedGroup === '전체' || selectedGroup === '기본 찜' ? undefined : selectedGroup;
    const newPlace: Place = {
      id: String(item.id || Date.now()),
      name: item.place_name,
      category:
        item.category_group_code === 'FD6'
          ? 'RESTAURANT'
          : item.category_group_code === 'CE7'
          ? 'CAFE'
          : 'ACTIVITY',
      lat: parseFloat(item.y),
      lng: parseFloat(item.x),
      isVisited: false,
      address: item.road_address_name || item.address_name,
      group: assignedGroup,
      placeUrl: item.place_url,
    };

    setRooms((prevRooms) =>
      prevRooms.map((r) =>
        r.code === currentRoom.code ? { ...r, places: [newPlace, ...r.places] } : r
      )
    );
    setSearchResults([]);
    setSearchQuery('');
    focusPlace(newPlace);

    try {
      await fetch('/api/places/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'addPlace',
          roomCode: currentRoom.code,
          place: newPlace,
        }),
      });
    } catch (err) {
      console.error('장소 찜 추가 실패:', err);
      fetchMyRooms(currentUser, currentRoom.code);
    }
  };

  const switchRoom = (code: string) => {
    setActiveCode(code);
    window.location.hash = code;
    localStorage.setItem(CURRENT_ROOM_KEY, code);
    setSelectedPlaceId(null);
    setSelectedGroup('전체');
    setShowInviteCode(false);
    setShowMembersList(false);
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomTitle.trim()) return;

    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newRoomTitle.trim(),
          username: currentUser,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setAlertModalMessage(data.error || '방 생성에 실패했습니다.');
        return;
      }

      await fetchMyRooms(currentUser, data.code);
      setNewRoomTitle('');
      setShowRoomModal(false);
    } catch (err) {
      console.error(err);
      setAlertModalMessage('방 생성 중 오류가 발생했습니다.');
    }
  };

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = joinRoomCode.trim().toUpperCase();
    if (clean.length !== 6) {
      setAlertModalMessage('6자리 코드를 입력해주세요.');
      return;
    }

    try {
      const res = await fetch('/api/rooms/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'join',
          code: clean,
          username: currentUser,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setAlertModalMessage(data.error || '방 참여에 실패했습니다.');
        return;
      }

      await fetchMyRooms(currentUser, clean);
      setJoinRoomCode('');
      setNewRoomTitle('');
      setShowRoomModal(false);
    } catch (err) {
      console.error(err);
      setAlertModalMessage('방 참여 중 오류가 발생했습니다.');
    }
  };

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetUser = inviteUsernameInput.trim();
    if (!targetUser || !currentRoom) return;

    try {
      const res = await fetch('/api/rooms/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'invite',
          code: currentRoom.code,
          targetUsername: targetUser,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setAlertModalMessage(data.error || '초대에 실패했습니다.');
        return;
      }

      await fetchMyRooms(currentUser, currentRoom.code);
      setInviteUsernameInput('');
      setShowInviteUserModal(false);
      setAlertModalMessage(`🎉 '${targetUser}'님을 방에 초대했습니다!`);
    } catch (err) {
      console.error(err);
      setAlertModalMessage('초대 중 오류가 발생했습니다.');
    }
  };

  const handleConfirmLeaveRoom = async () => {
    if (!currentRoom) return;

    try {
      const res = await fetch('/api/rooms/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'leave',
          code: currentRoom.code,
          username: currentUser,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setAlertModalMessage(data.error || '방 나가기에 실패했습니다.');
        return;
      }

      setShowLeaveModal(false);
      await fetchMyRooms(currentUser);
    } catch (err) {
      console.error(err);
      setAlertModalMessage('방 나가기 처리 중 오류가 발생했습니다.');
    }
  };

  const renderModals = () => (
    <>
      {showLeaveModal && (
        <div className="fixed inset-0 z-[60] bg-[#2D241E]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FAF7F2] text-[#2D241E] w-full max-w-xs rounded-[28px] p-6 shadow-2xl border-2 border-[#EADFCF] flex flex-col gap-4 text-center animate-in zoom-in-95 duration-150">
            <span className="text-3xl mt-1">🚪</span>
            <div>
              <h3 className="font-title text-base text-[#2D241E]">'{currentRoom?.title}' 방 나가기</h3>
              <p className="font-body text-xs text-[#8C7A6B] mt-1.5 leading-relaxed break-keep">
                현재 약속 방에서 나가시겠습니까?<br />언제든 초대 코드로 다시 참여할 수 있습니다.
              </p>
            </div>
            <div className="flex gap-2 mt-1">
              <button
                type="button"
                onClick={() => setShowLeaveModal(false)}
                className="font-title flex-1 py-2.5 bg-white border-2 border-[#EADFCF] hover:bg-[#FAF7F2] text-[#7A6251] text-xs rounded-xl transition active:scale-95"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleConfirmLeaveRoom}
                className="font-title flex-1 py-2.5 bg-[#C25E3E] hover:bg-[#B04E30] text-white text-xs rounded-xl transition active:scale-95 shadow-xs"
              >
                방 나가기
              </button>
            </div>
          </div>
        </div>
      )}

      {showInviteUserModal && (
        <div className="fixed inset-0 z-[60] bg-[#2D241E]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FAF7F2] text-[#2D241E] w-full max-w-xs rounded-[28px] p-6 shadow-2xl border-2 border-[#EADFCF] flex flex-col gap-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-1 border-b border-[#EADFCF]">
              <h3 className="font-title text-base">친구 초대하기</h3>
              <button
                type="button"
                onClick={() => setShowInviteUserModal(false)}
                className="font-title text-[#A89889] hover:text-[#2D241E] text-sm"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleInviteUser} className="flex flex-col gap-3">
              <div>
                <label className="font-title text-xs text-[#7A6251]">초대할 친구 아이디</label>
                <input
                  type="text"
                  placeholder="예: admin, routy"
                  value={inviteUsernameInput}
                  onChange={(e) => setInviteUsernameInput(e.target.value)}
                  required
                  autoFocus
                  className="font-body w-full mt-1.5 px-3.5 py-2.5 text-xs bg-white border-2 border-[#EADFCF] rounded-xl focus:outline-none focus:border-[#C25E3E]"
                />
              </div>
              <p className="font-body text-[11px] text-[#8C7A6B] leading-relaxed">
                상대방의 아이디를 입력하면 해당 유저의 지도 목록에 이 방이 즉시 추가됩니다!
              </p>
              <button
                type="submit"
                className="font-title w-full py-3 bg-[#2D241E] hover:bg-[#43362E] text-[#F3D5B5] text-xs rounded-xl transition mt-1 active:scale-95 shadow-xs"
              >
                초대 완료하기 ✨
              </button>
            </form>
          </div>
        </div>
      )}

      {showRoomModal && (
        <div className="fixed inset-0 z-[60] bg-[#2D241E]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FAF7F2] text-[#2D241E] w-full max-w-sm rounded-[30px] p-6 shadow-2xl border-2 border-[#EADFCF] flex flex-col gap-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-[#EADFCF]">
              <h3 className="font-title text-base">약속 방 관리</h3>
              <button
                type="button"
                onClick={() => setShowRoomModal(false)}
                className="font-title text-[#A89889] hover:text-[#2D241E] text-sm"
              >
                ✕
              </button>
            </div>
            <div className="font-title flex rounded-xl bg-[#EFE9DF] p-1 text-xs">
              <button
                type="button"
                onClick={() => setModalMode('create')}
                className={`flex-1 py-1.5 rounded-lg transition ${
                  modalMode === 'create' ? 'bg-[#2D241E] text-[#F3D5B5] shadow-xs' : 'text-[#7A6251]'
                }`}
              >
                새 방 만들기
              </button>
              <button
                type="button"
                onClick={() => setModalMode('join')}
                className={`flex-1 py-1.5 rounded-lg transition ${
                  modalMode === 'join' ? 'bg-[#2D241E] text-[#F3D5B5] shadow-xs' : 'text-[#7A6251]'
                }`}
              >
                코드로 참여
              </button>
            </div>
            {modalMode === 'create' ? (
              <form onSubmit={handleCreateRoom} className="flex flex-col gap-3">
                <div>
                  <label className="font-title text-xs text-[#7A6251]">약속 방 이름</label>
                  <input
                    type="text"
                    placeholder="예: 성수 모임, 맛집 탐방"
                    value={newRoomTitle}
                    onChange={(e) => setNewRoomTitle(e.target.value)}
                    required
                    className="font-body w-full mt-1 px-3.5 py-2.5 text-xs bg-white border-2 border-[#EADFCF] rounded-xl focus:outline-none focus:border-[#C25E3E]"
                  />
                </div>
                <button
                  type="submit"
                  className="font-title w-full py-3 bg-[#2D241E] hover:bg-[#43362E] text-white text-xs rounded-xl transition mt-1 active:scale-95 shadow-xs"
                >
                  방 생성하기
                </button>
              </form>
            ) : (
              <form onSubmit={handleJoinRoom} className="flex flex-col gap-3">
                <div>
                  <label className="font-title text-xs text-[#7A6251]">6자리 초대 코드</label>
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="예: A8F2K9"
                    value={joinRoomCode}
                    onChange={(e) => setJoinRoomCode(e.target.value.toUpperCase())}
                    required
                    className="font-title w-full mt-1 px-3.5 py-2.5 text-xs bg-white border-2 border-[#EADFCF] rounded-xl uppercase tracking-widest text-center focus:outline-none focus:border-[#C25E3E]"
                  />
                </div>
                <button
                  type="submit"
                  className="font-title w-full py-3 bg-[#2D241E] hover:bg-[#43362E] text-white text-xs rounded-xl transition mt-1 active:scale-95 shadow-xs"
                >
                  방 들어가기
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {alertModalMessage && (
        <div className="fixed inset-0 z-[90] bg-[#2D241E]/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-[#FAF7F2] text-[#2D241E] w-full max-w-xs rounded-[28px] p-6 shadow-2xl border-2 border-[#EADFCF] flex flex-col gap-4 text-center animate-in zoom-in-95 duration-150">
            <span className="text-3xl mt-1">💡</span>
            <div>
              <p className="font-title text-sm text-[#2D241E] leading-relaxed break-keep">{alertModalMessage}</p>
            </div>
            <button
              type="button"
              onClick={() => setAlertModalMessage(null)}
              className="font-title w-full py-2.5 bg-[#2D241E] hover:bg-[#43362E] text-white text-xs rounded-xl transition active:scale-95 shadow-xs"
            >
              확인
            </button>
          </div>
        </div>
      )}
    </>
  );

  // 💡 1. 최초 데이터 로딩 중일 때 표시할 화면 (깜빡임 완벽 차단)
  if (isInitialLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[65vh] gap-4 animate-in fade-in duration-200">
        <div className="w-10 h-10 border-4 border-[#EADFCF] border-t-[#C25E3E] rounded-full animate-spin" />
        <div className="text-center">
          <p className="font-title text-base text-[#2D241E]">약속 방을 불러오는 중입니다...</p>
          <p className="font-body text-xs text-[#8C7A6B] mt-1">참여 중인 약속 지도를 찾고 있어요 📍</p>
        </div>
      </div>
    );
  }

  // 💡 2. 데이터 조회가 끝났는데도 참여 중인 방이 전혀 없을 때만 표시
  if (rooms.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[65vh] gap-6 animate-in fade-in duration-300">
        <div className="text-center">
          <div className="w-16 h-16 rounded-3xl bg-[#F8EFE4] border-2 border-[#E6D4BE] flex items-center justify-center text-3xl mx-auto mb-4 shadow-inner">
            🏝️
          </div>
          <h2 className="font-title text-2xl tracking-tight text-[#2D241E]">방을 만들어주세요!</h2>
          <p className="font-body text-xs text-[#8C7A6B] mt-2 leading-relaxed">
            아직 참여 중인 약속 방이 없습니다.
            <br />새 방을 만들거나 친구의 초대 코드로 입장해주세요.
          </p>
        </div>
        <div className="flex gap-3 mt-2 w-full max-w-[280px]">
          <button
            type="button"
            onClick={() => {
              setModalMode('create');
              setShowRoomModal(true);
            }}
            className="flex-1 font-title py-3.5 bg-[#2D241E] hover:bg-[#43362E] active:scale-[0.98] text-[#F3D5B5] text-xs rounded-2xl transition shadow-md"
          >
            + 방 만들기
          </button>
          <button
            type="button"
            onClick={() => {
              setModalMode('join');
              setShowRoomModal(true);
            }}
            className="flex-1 font-title py-3.5 bg-white hover:bg-[#FAF7F2] active:scale-[0.98] border-2 border-[#EADFCF] text-[#2D241E] text-xs rounded-2xl transition shadow-xs"
          >
            코드 입력
          </button>
        </div>
        {renderModals()}
      </div>
    );
  }

  const roomGroups: GroupItem[] = [
    ...DEFAULT_GROUPS,
    ...(currentRoom?.groups || []).filter((g) => g.name !== '기본 그룹'),
  ];

  const filterPlaces = (p: Place) => {
    if (selectedGroup === '전체') return true;

    if (selectedGroup === '기본 찜') {
      return !p.group || p.group === '기본 찜';
    }

    return (p.group || '').trim() === selectedGroup.trim();
  };

  let activeColorId = 'pastel-pink';
  if (selectedGroup === '기본 찜') {
    activeColorId = currentRoom?.defaultHeartColorId || 'pastel-pink';
  } else if (selectedGroup !== '전체') {
    const matched = roomGroups.find((g) => g.name === selectedGroup);
    if (matched) activeColorId = matched.colorId;
  }
  const activeColorConfig = HEART_PALETTE.find((c) => c.id === activeColorId) || HEART_PALETTE[0];

  const currentMembers = currentRoom?.members || [currentUser];

  return (
    <div className="flex flex-col gap-4 text-[#2D241E]">
      {/* 1. 상단 룸 관리 바 */}
      <div className="bg-[#3B2F27] text-white p-4 rounded-[26px] flex flex-col gap-3 shadow-[0_8px_24px_rgba(59,47,39,0.12)] border-2 border-[#2D241E]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-1 overflow-hidden pr-3">
            <span className="font-title text-[10px] bg-[#524237] text-[#E8DCC4] px-2 py-0.5 rounded-md border border-[#695547] shrink-0">
              ROOM
            </span>
            <select
              value={activeCode}
              onChange={(e) => switchRoom(e.target.value)}
              className="font-title bg-[#4D3E34] text-[#F3D5B5] text-xs rounded-xl px-3 py-2 border border-[#614F43] outline-none truncate cursor-pointer hover:bg-[#59483D] flex-1 w-full"
            >
              {rooms.map((room) => (
                <option key={room.code} value={room.code}>
                  {room.title}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={() => setShowRoomModal(true)}
            className="font-title text-xs px-3 py-2 bg-[#524237] hover:bg-[#614F43] text-[#F3D5B5] rounded-xl border border-[#695547] transition active:scale-95 shrink-0"
          >
            + 새 방
          </button>
        </div>

        {/* 상단 액션 바: [초대 코드] & [참여 멤버] & [방 나가기] */}
        <div className="flex items-center justify-between pt-2 border-t border-[#4D3E34] text-xs">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowInviteCode(!showInviteCode)}
              className="font-title text-xs text-[#C8B8A6] hover:text-[#F3D5B5] flex items-center gap-1 transition"
            >
              <span>🔑</span>
              <span>{showInviteCode ? '초대 코드 닫기' : '초대 코드'}</span>
            </button>

            {!showInviteCode && (
              <>
                <span className="text-[#59483D]">|</span>
                <button
                  type="button"
                  onClick={() => setShowMembersList(!showMembersList)}
                  className="font-title text-xs text-[#C8B8A6] hover:text-[#F3D5B5] flex items-center gap-1 transition"
                >
                  <span>👥</span>
                  <span>참여 멤버 ({currentMembers.length}/4)</span>
                  <span className="text-[10px] text-[#A89889]">{showMembersList ? '▲' : '▼'}</span>
                </button>

                <span className="text-[#59483D]">|</span>
                <button
                  type="button"
                  onClick={() => setShowLeaveModal(true)}
                  className="font-title text-xs text-[#C8B8A6] hover:text-[#E07A5F] flex items-center gap-1 transition"
                  title="이 방에서 나가기"
                >
                  <span>🚪</span>
                  <span>방 나가기</span>
                </button>
              </>
            )}
          </div>

          {showInviteCode && (
            <div className="flex items-center gap-2 animate-in fade-in duration-200">
              <span className="font-title font-mono text-[#F3D5B5] tracking-wider bg-[#2D241E] px-2 py-0.5 rounded-md text-xs">
                {activeCode}
              </span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(`${activeCode}`);
                  setCopyFeedback(true);
                  setTimeout(() => setCopyFeedback(false), 2000);
                }}
                className="font-title text-xs text-[#E8DCC4] hover:text-white"
              >
                {copyFeedback ? '복사됨! ✨' : '복사'}
              </button>
            </div>
          )}
        </div>

        {showMembersList && (
          <div className="pt-2 border-t border-[#4D3E34] flex items-center gap-1.5 flex-wrap animate-in fade-in zoom-in-[0.98] duration-150">
            {currentMembers.map((member, idx) => {
              const isMe = member === currentUser;
              return (
                <div
                  key={`member-badge-${idx}`}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-title transition shadow-2xs ${
                    isMe
                      ? 'bg-[#C25E3E] text-white border border-[#D97050]'
                      : 'bg-[#4D3E34] text-[#F3D5B5] border border-[#614F43]'
                  }`}
                >
                  <span className="text-[11px]">👤</span>
                  <span className="truncate max-w-[90px]">{member}</span>
                  {isMe && <span className="text-[10px] opacity-85 font-normal">(나)</span>}
                </div>
              );
            })}

            {currentMembers.length < 4 && (
              <button
                type="button"
                onClick={() => setShowInviteUserModal(true)}
                className="flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-title bg-[#524237] hover:bg-[#614F43] text-[#F3D5B5] border border-[#695547] transition active:scale-95 shadow-2xs"
              >
                <span>➕</span>
                <span>친구 초대</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* 2. 장소 검색창 & 하트색 설정 바 */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between px-1">
          <span className="font-title text-xs text-[#7A6251]">장소 추가 및 검색</span>
          {selectedGroup !== '전체' && (
            <div ref={colorPickerContainerRef} className="relative">
              <button
                type="button"
                onClick={() => setActiveColorPicker(!activeColorPicker)}
                className="px-2.5 py-1 bg-white hover:bg-[#FAF7F2] border border-[#EADFCF] rounded-xl shadow-2xs transition flex items-center gap-1.5 active:scale-95"
              >
                <span
                  className="w-3.5 h-3.5 rounded-full inline-block border border-black/10 shadow-xs"
                  style={{ backgroundColor: activeColorConfig.fill }}
                />
                <span className="font-title text-[11px] text-[#7A6251]">하트색 ⚙️</span>
              </button>

              {activeColorPicker && (
                <div className="absolute right-0 top-8 z-50 p-3 bg-white text-[#2D241E] rounded-2xl border-2 border-[#EADFCF] shadow-xl flex flex-col gap-2 w-44 animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex justify-between items-center pb-1 border-b border-[#F2EAE0]">
                    <span className="font-title text-[10px] text-[#7A6251]">
                      {selectedGroup === '기본 찜'
                        ? '기본 찜 하트색'
                        : selectedGroup === '기본 그룹'
                        ? '기본 그룹 하트색'
                        : `'${selectedGroup}' 하트색`}
                    </span>
                    <button
                      type="button"
                      onClick={() => setActiveColorPicker(false)}
                      className="text-[10px] text-[#A89889] hover:text-[#2D241E]"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="flex flex-col gap-1 pt-0.5">
                    {HEART_PALETTE.map((palette) => (
                      <button
                        type="button"
                        key={palette.id}
                        onClick={() => handleUpdateActiveColor(palette.id)}
                        disabled={selectedGroup === '기본 그룹'}
                        className={`px-2.5 py-1.5 rounded-xl text-left text-xs transition flex items-center justify-between ${
                          activeColorId === palette.id
                            ? 'bg-[#FAF7F2] font-bold text-[#2D241E] border border-[#EADFCF]'
                            : selectedGroup === '기본 그룹'
                            ? 'text-[#C8B8A6] cursor-not-allowed'
                            : 'hover:bg-[#F9ECE7] text-[#7A6251]'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="w-3.5 h-3.5 rounded-full border"
                            style={{ backgroundColor: palette.fill, borderColor: palette.stroke }}
                          />
                          <span className="text-[11px] font-title">{palette.name}</span>
                        </div>
                        {activeColorId === palette.id && <span className="text-[10px] text-[#C25E3E]">✓</span>}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            type="text"
            placeholder={selectedGroup === '전체' ? '모아보기에서는 찜 보기만 가능합니다' : '장소 검색 후 내 코스에 추가'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            disabled={selectedGroup === '전체'}
            className={`font-body flex-1 px-4 py-3 text-xs rounded-2xl border-2 text-[#2D241E] shadow-xs focus:outline-none bg-white border-[#EADFCF] focus:border-[#C25E3E] ${
              selectedGroup === '전체' ? 'bg-[#F5F0E9] text-[#A89889] cursor-not-allowed' : ''
            }`}
          />
          <button
            type="submit"
            disabled={isSearching || selectedGroup === '전체'}
            className={`font-title px-5 py-3 text-xs rounded-2xl transition shadow-xs shrink-0 active:scale-95 ${
              selectedGroup === '전체'
                ? 'bg-[#E5DDD2] text-[#A89889] cursor-not-allowed'
                : 'bg-[#2D241E] hover:bg-[#43362E] text-white'
            }`}
          >
            {selectedGroup === '전체' ? '검색 불가' : isSearching ? '검색중' : '검색'}
          </button>
        </form>

        {searchResults.length > 0 && (
          <div className="p-3 bg-white rounded-[24px] border-2 border-[#EADFCF] shadow-xl flex flex-col gap-2 z-20">
            <div className="flex justify-between items-center px-1">
              <span className="font-title text-xs text-[#7A6251]">검색 결과 (장소 추가)</span>
              <button
                type="button"
                onClick={() => setSearchResults([])}
                className="font-title text-xs text-[#A89889] hover:text-[#2D241E]"
              >
                닫기 ✕
              </button>
            </div>
            {searchResults.map((res, sIdx) => (
              <div
                key={`search-${res.id}-${sIdx}`}
                className="p-3 bg-[#FAF7F2] hover:bg-[#F6EFE6] rounded-xl flex items-center justify-between border border-[#EADFCF]"
              >
                <div className="text-left overflow-hidden pr-2">
                  <p className="font-title text-xs text-[#2D241E] truncate">{res.place_name}</p>
                  <p className="font-body text-[11px] text-[#8C7A6B] truncate">{res.road_address_name || res.address_name}</p>
                </div>
                <button
                  type="button"
                  onClick={() => addPlaceFromSearch(res)}
                  className="font-title px-3 py-1.5 text-xs bg-[#2D241E] text-white rounded-xl hover:bg-[#43362E] transition active:scale-95 shrink-0"
                >
                  + 찜하기
                </button>
              </div>
            ))}
          </div>
        )}

        {/* 3. 찜 그룹 탭 바 */}
        <div className="flex gap-2 items-center overflow-x-auto pb-1 no-scrollbar pt-1">
          <button
            type="button"
            onClick={() => {
              setSelectedGroup('전체');
              setSearchResults([]);
              setSearchQuery('');
              setSelectedPlaceId(null);
            }}
            className={`font-title px-3.5 py-1.5 rounded-xl text-xs transition whitespace-nowrap active:scale-95 ${
              selectedGroup === '전체'
                ? 'bg-[#2D241E] text-[#F3D5B5] shadow-xs'
                : 'bg-white text-[#7A6251] border-2 border-[#EADFCF] hover:bg-[#FAF7F2]'
            }`}
          >
            모아보기
          </button>
          <button
            type="button"
            onClick={() => setSelectedGroup('기본 찜')}
            className={`font-title px-3.5 py-1.5 rounded-xl text-xs transition whitespace-nowrap active:scale-95 ${
              selectedGroup === '기본 찜'
                ? 'bg-[#2D241E] text-[#F3D5B5] border-[#2D241E]'
                : 'bg-white text-[#7A6251] border-2 border-[#EADFCF] hover:bg-[#FAF7F2]'
            }`}
          >
            🤍 기본 찜
          </button>
          {roomGroups.map((grp) => {
            const isActive = selectedGroup === grp.name;
            const isDefaultGroup = grp.name === '기본 그룹';

            return (
              <div
                key={grp.name}
                className={`flex items-center shrink-0 rounded-xl border-2 transition-all overflow-hidden ${
                  isActive ? 'bg-[#2D241E] border-[#2D241E] shadow-xs' : 'bg-white border-[#EADFCF] hover:border-[#D5C2AD]'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setSelectedGroup(grp.name)}
                  className={`font-title px-3.5 py-1.5 text-xs transition whitespace-nowrap active:scale-95 ${
                    isActive ? 'text-[#F3D5B5]' : 'text-[#7A6251]'
                  }`}
                >
                  📁 {grp.name}
                </button>

                {!isDefaultGroup && (
                  <button
                    type="button"
                    onClick={() => setGroupToDelete(grp.name)}
                    title="그룹 삭제"
                    className={`font-title px-2.5 py-1.5 text-[10px] transition border-l ${
                      isActive
                        ? 'bg-[#43362E] text-[#C8B8A6] border-[#59483D] hover:text-white'
                        : 'bg-[#FAF7F2] text-[#A89889] border-[#EADFCF] hover:text-[#C25E3E]'
                    }`}
                  >
                    ✕
                  </button>
                )}
              </div>
            );
          })}
          <button
            type="button"
            onClick={() => setShowAddGroupModal(true)}
            className="font-title px-3 py-1.5 rounded-xl text-xs bg-[#FAF7F2] text-[#A89889] border border-dashed border-[#D5C2AD] hover:bg-[#F3ECE0] transition whitespace-nowrap shrink-0 active:scale-95"
          >
            + 새 그룹
          </button>
        </div>
      </div>

      {/* 4. 지도 뷰 */}
      <div className="relative w-full h-[390px] rounded-[30px] overflow-hidden shadow-[0_8px_24px_rgba(74,59,50,0.06)] border-2 border-[#EADFCF] bg-[#FAF7F2]">
        {status === 'loading' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[#FAF7F2]/90 z-20">
            <div className="w-8 h-8 border-3 border-[#C25E3E] border-t-transparent rounded-full animate-spin" />
            <p className="font-body text-xs text-[#8C7A6B]">지도를 불러오고 있습니다</p>
          </div>
        )}
        <div ref={mapContainerRef} className="w-full h-full" />
        <div className="font-title absolute top-3.5 left-3.5 z-10 bg-[#2D241E]/90 backdrop-blur-md px-3.5 py-1.5 rounded-full shadow-md text-[11px] text-[#F3D5B5] border border-[#43362E] pointer-events-none flex items-center gap-2">
          <span>{selectedGroup === '전체' ? '📁 전체 보기' : selectedGroup === '기본 찜' ? '🤍 기본 찜' : `📁 ${selectedGroup}`}</span>
          {selectedGroup !== '전체' && (
            <>
              <span className="text-[#614F43]">|</span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-[#FAF7F2] border border-[#D5C2AD] inline-block" /> 찜
              </span>
              <span className="flex items-center gap-1">
                <span
                  className="w-2.5 h-2.5 rounded-full inline-block border"
                  style={{ backgroundColor: activeColorConfig.fill, borderColor: activeColorConfig.stroke }}
                />{' '}
                다녀옴
              </span>
            </>
          )}
        </div>
      </div>

      {/* 5. 장소 리스트 */}
      <div className="flex flex-col gap-2">
        <div className="flex justify-between items-center px-1">
          <h2 className="font-title text-sm text-[#2D241E]">
            {currentRoom?.title}
            <span className="text-xs font-normal text-[#8C7A6B] ml-1">
              ({currentRoom?.places.filter(filterPlaces).length || 0}곳)
            </span>
          </h2>
          <span className="font-body text-xs text-[#A89889]">하트를 누르면 방문 여부가 바뀝니다</span>
        </div>
        <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-1">
          {currentRoom?.places.filter(filterPlaces).length === 0 ? (
            <div className="font-body p-8 text-center bg-white rounded-2xl border-2 border-dashed border-[#EADFCF] text-xs text-[#8C7A6B]">
              해당 그룹에 등록된 장소가 없습니다.
            </div>
          ) : (
            currentRoom?.places.filter(filterPlaces).map((place) => {
              const isSelected = selectedPlaceId === place.id;
              const style = getHeartStyleForPlace(place);

              return (
                <div
                  key={`place-${place.id}`}
                  onClick={() => handleSelectOrUnselectPlace(place)}
                  className={`p-3.5 rounded-2xl border-2 transition-all flex items-center justify-between cursor-pointer ${
                    isSelected
                      ? 'bg-[#2D241E] text-white border-[#2D241E] shadow-md scale-[1.01]'
                      : 'bg-white text-[#2D241E] border-[#EADFCF] hover:border-[#D5C2AD]'
                  }`}
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="overflow-hidden pl-1">
                      <div className="flex items-center gap-2">
                        <p className="font-title text-sm tracking-tight truncate">{place.name}</p>
                        {place.group && (
                          <span
                            className={`font-title text-[10px] px-2 py-0.5 rounded-lg border ${
                              isSelected
                                ? 'bg-[#43362E] text-[#F3D5B5] border-[#59483D]'
                                : 'bg-[#FAF7F2] text-[#7A6251] border-[#EADFCF]'
                            }`}
                          >
                            {place.group}
                          </span>
                        )}
                      </div>
                      {place.address && (
                        <p
                          className={`font-body text-xs mt-0.5 truncate max-w-[210px] ${
                            isSelected ? 'text-[#C8B8A6]' : 'text-[#8C7A6B]'
                          }`}
                        >
                          {place.address}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedGroup !== '전체') {
                          toggleVisited(place.id);
                        }
                      }}
                      disabled={selectedGroup === '전체'}
                      className={`p-1 rounded-xl transition-transform flex items-center justify-center ${
                        selectedGroup === '전체' ? 'cursor-default' : 'hover:bg-black/5 active:scale-90'
                      }`}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="26"
                        height="26"
                        viewBox="0 0 24 24"
                        fill={style.fill}
                        stroke={style.stroke}
                        strokeWidth={style.strokeWidth}
                        className="drop-shadow-xs transition-all"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
                        />
                      </svg>
                    </button>
                    {selectedGroup !== '전체' && (
                      <button
                        type="button"
                        onClick={() => removePlaceItem(place.id)}
                        className={`font-title text-xs px-2 py-1 rounded transition ${
                          isSelected ? 'text-[#8C7A6B] hover:text-white' : 'text-[#A89889] hover:text-[#C25E3E]'
                        }`}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {groupToDelete && (
        <div className="fixed inset-0 z-50 bg-[#2D241E]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FAF7F2] text-[#2D241E] w-full max-w-xs rounded-[28px] p-6 shadow-2xl border-2 border-[#EADFCF] flex flex-col gap-4 text-center animate-in zoom-in-95 duration-150">
            <span className="text-3xl mt-1">🗑️</span>
            <div>
              <h3 className="font-title text-base text-[#2D241E]">'{groupToDelete}' 그룹 삭제</h3>
              <p className="font-body text-xs text-[#8C7A6B] mt-1.5 leading-relaxed break-keep">
                그룹은 삭제되고, 포함된 장소는 기본 찜으로 이동합니다.
                <br />
                정말 삭제하시겠습니까?
              </p>
            </div>
            <div className="flex gap-2 mt-2">
              <button
                type="button"
                onClick={() => setGroupToDelete(null)}
                className="font-title flex-1 py-2.5 bg-white border-2 border-[#EADFCF] hover:bg-[#FAF7F2] text-[#7A6251] text-xs rounded-xl transition active:scale-95"
              >
                취소
              </button>
              <button
                type="button"
                onClick={confirmDeleteGroup}
                className="font-title flex-1 py-2.5 bg-[#C25E3E] hover:bg-[#B04E30] text-white text-xs rounded-xl transition active:scale-95 shadow-xs"
              >
                삭제하기
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddGroupModal && (
        <div className="fixed inset-0 z-50 bg-[#2D241E]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FAF7F2] text-[#2D241E] w-full max-w-xs rounded-[28px] p-6 shadow-2xl border-2 border-[#EADFCF] flex flex-col gap-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-1 border-b border-[#EADFCF]">
              <h3 className="font-title text-base">새 찜 그룹 만들기</h3>
              <button
                type="button"
                onClick={() => setShowAddGroupModal(false)}
                className="font-title text-[#A89889] hover:text-[#2D241E] text-sm"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleAddGroup} className="flex flex-col gap-3">
              <div>
                <label className="font-title text-xs text-[#7A6251]">그룹 이름</label>
                <input
                  type="text"
                  placeholder="예: 홍대, 9월 10일 약속, 방탈출 카페"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  required
                  autoFocus
                  className="font-body w-full mt-1.5 px-3.5 py-2.5 text-xs bg-white border-2 border-[#EADFCF] rounded-xl focus:outline-none focus:border-[#C25E3E]"
                />
              </div>
              <div>
                <label className="font-title text-xs text-[#7A6251]">그룹 하트 색상</label>
                <div className="flex gap-2 items-center mt-2">
                  {HEART_PALETTE.map((pal) => (
                    <button
                      key={pal.id}
                      type="button"
                      onClick={() => setNewGroupColorId(pal.id)}
                      className={`w-7 h-7 rounded-full border-2 transition-transform ${
                        newGroupColorId === pal.id
                          ? 'scale-120 shadow-md ring-2 ring-[#2D241E]'
                          : 'hover:scale-110 opacity-70'
                      }`}
                      style={{ backgroundColor: pal.fill, borderColor: pal.stroke }}
                    />
                  ))}
                </div>
              </div>
              <button
                type="submit"
                className="font-title w-full py-3 bg-[#2D241E] hover:bg-[#43362E] text-white text-xs rounded-xl transition mt-2 active:scale-95 shadow-xs"
              >
                그룹 추가하기
              </button>
            </form>
          </div>
        </div>
      )}

      {renderModals()}
    </div>
  );
}