import { treaty } from "@elysiajs/eden/treaty2";
import { useEffect, useRef, useState } from "react";
import type { App } from "../../../../server/app";

type ControlPayload = {
  bpm: number;
  beats: number;
  isPlaying: boolean;
};

type UseRoomSyncParams = {
  control: ControlPayload;
  onRemoteControl: (payload: ControlPayload) => void;
};

type SyncWs = ReturnType<ReturnType<typeof treaty<App>>["sync"]["subscribe"]>;

function apiOrigin(): string {
  return window?.location?.origin ?? "http://localhost:4000";
}

const randomRoomCode = (): string =>
  Math.random().toString(36).substring(2, 7).toUpperCase();

export function useRoomSync(params: UseRoomSyncParams) {
  const { control, onRemoteControl } = params;
  const [syncReady, setSyncReady] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [isMaster, setIsMaster] = useState(true);
  const [roomId, setRoomId] = useState<string | null>(null);

  const wsRef = useRef<SyncWs | null>(null);
  const syncReadyRef = useRef(false);
  const isMasterRef = useRef(true);
  const onRemoteControlRef = useRef(onRemoteControl);

  useEffect(() => {
    isMasterRef.current = isMaster;
  }, [isMaster]);

  useEffect(() => {
    onRemoteControlRef.current = onRemoteControl;
  }, [onRemoteControl]);

  useEffect(() => {
    const api = treaty<App>(apiOrigin());
    const client = api.sync.subscribe();

    client.on("open", () => {
      syncReadyRef.current = true;
      setSyncReady(true);
    });

    client.subscribe((event) => {
      if (!isMasterRef.current) {
        onRemoteControlRef.current(event.data);
      }
    });

    wsRef.current = client;
    return () => {
      syncReadyRef.current = false;
      setSyncReady(false);
      client.close();
      wsRef.current = null;
    };
  }, []);

  const sendJoin = (code: string) => {
    const client = wsRef.current;
    if (!client) {
      return;
    }
    const sendJoinNow = () => {
      client.send({ type: "join", roomId: code });
    };
    if (syncReadyRef.current) {
      sendJoinNow();
      return;
    }
    client.on("open", sendJoinNow);
  };

  const joinRoom = (roomCode: string) => {
    const normalized = roomCode.toUpperCase();
    setRoomId(normalized);
    setIsLive(true);
    setIsMaster(false);
    sendJoin(normalized);
  };

  const createRoom = () => {
    const nextRoomId = randomRoomCode();
    setRoomId(nextRoomId);
    setIsLive(true);
    setIsMaster(true);
    sendJoin(nextRoomId);
  };

  const exitRoom = () => {
    setIsLive(false);
    setRoomId(null);
  };

  useEffect(() => {
    if (!syncReady || !isLive || !isMaster || !roomId) {
      return;
    }
    const client = wsRef.current;
    if (!client) {
      return;
    }
    client.send({
      type: "control",
      roomId,
      bpm: control.bpm,
      beats: control.beats,
      isPlaying: control.isPlaying,
    });
  }, [
    control.beats,
    control.bpm,
    control.isPlaying,
    isLive,
    isMaster,
    roomId,
    syncReady,
  ]);

  return {
    syncReady,
    isLive,
    isMaster,
    roomId,
    canControl: !(isLive && !isMaster),
    joinRoom,
    createRoom,
    exitRoom,
  };
}
