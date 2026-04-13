import { treaty } from "@elysiajs/eden";
import type { App } from "@server/app";
import { useEffect, useRef, useState } from "react";
import { createMetronomeEngine } from "../audio/createMetronomeEngine";
import { clampBpm, normalizeBeats } from "../domain/guards";
import { computeAlignedStart } from "../domain/playSchedule";

type UseMetronomeParams = {
  initialBpm: number;
  initialBeatsPerMeasure: number;
};

const SCHEDULE_LEAD_MS = 1000;

const getServerOrigin = (): string =>
  window?.location?.origin ?? "http://localhost:4000";

const createRoomSubscription = (targetRoomId?: string) =>
  treaty<App>(getServerOrigin()).room.subscribe({
    query: targetRoomId ? { id: targetRoomId } : {},
  });

type RoomSubscription = ReturnType<typeof createRoomSubscription>;
type RoomClientMessage = Parameters<RoomSubscription["send"]>[0];

export function useMetronome(params: UseMetronomeParams) {
  const [metronomeState, setMetronomeState] = useState(() => ({
    bpm: clampBpm(params.initialBpm),
    beatsPerMeasure: normalizeBeats(params.initialBeatsPerMeasure),
  }));
  const [isServer, setIsServer] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentBeat, setCurrentBeat] = useState(0);

  const wsRef = useRef<RoomSubscription | null>(null);
  const isServerRef = useRef(false);
  const isOwnerRef = useRef(false);
  const isPlayingRef = useRef(false);
  const metronomeStateRef = useRef(metronomeState);
  const roomIdRef = useRef<string | null>(null);

  useEffect(() => {
    isServerRef.current = isServer;
  }, [isServer]);

  useEffect(() => {
    isOwnerRef.current = isOwner;
  }, [isOwner]);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    metronomeStateRef.current = metronomeState;
  }, [metronomeState]);

  useEffect(() => {
    roomIdRef.current = roomId;
  }, [roomId]);

  const [engine] = useState(() =>
    createMetronomeEngine({
      bpm: metronomeState.bpm,
      beatsPerMeasure: metronomeState.beatsPerMeasure,
      onBeat: (beatIndex) => {
        setCurrentBeat(beatIndex);
      },
    }),
  );

  useEffect(() => {
    engine.setBpm(metronomeState.bpm);
  }, [engine, metronomeState.bpm]);

  useEffect(() => {
    engine.setBeatsPerMeasure(metronomeState.beatsPerMeasure);
  }, [engine, metronomeState.beatsPerMeasure]);

  useEffect(() => {
    return () => {
      wsRef.current?.close();
      engine.stop();
    };
  }, [engine]);

  const applyLocalPlaying = (nextIsPlaying: boolean) => {
    if (nextIsPlaying) {
      if (engine.start()) {
        setIsPlaying(true);
      }
      return;
    }
    engine.stop();
    setIsPlaying(false);
  };

  const applyPlayHalt = (eventRoomId?: string) => {
    if (eventRoomId && roomIdRef.current !== eventRoomId) {
      return;
    }
    engine.stop();
    setIsPlaying(false);
  };

  const applyPlaySchedule = (eventRoomId: string, at: number) => {
    if (roomIdRef.current !== eventRoomId) {
      return;
    }
    const recvWall = Date.now();
    const snap = metronomeStateRef.current;
    const { startWallMs, initialBeatIndex } = computeAlignedStart({
      anchorAtMs: at,
      recvWallMs: recvWall,
      bpm: snap.bpm,
      beatsPerMeasure: snap.beatsPerMeasure,
    });
    if (engine.isRunning()) {
      engine.stop();
    }
    const started = engine.startAligned({
      recvWallMs: recvWall,
      startWallMs,
      initialBeatIndex,
    });
    if (started) {
      setIsPlaying(true);
    } else {
      setIsPlaying(false);
    }
  };

  const sendWs = (payload: RoomClientMessage) => {
    const ws = wsRef.current;
    if (!ws) {
      return;
    }
    ws.send(payload);
  };

  const connect = (targetRoomId?: string) => {
    if (isConnecting || isServerRef.current) {
      return;
    }

    setIsConnecting(true);
    const ws = createRoomSubscription(targetRoomId);
    wsRef.current = ws;

    ws.addEventListener("message", (event) => {
      const parsed = event.data;

      if (parsed.type === "error") {
        disconnect();
        return;
      }

      if (parsed.type === "room-created" || parsed.type === "room-joined") {
        setRoomId(parsed.roomId);
        setIsOwner(parsed.role === "owner");
        setIsServer(true);
        setIsConnecting(false);

        if (parsed.type === "room-created") {
          const snapshot = metronomeStateRef.current;
          sendWs({
            type: "set-metronome",
            metronome: {
              bpm: snapshot.bpm,
              beats: snapshot.beatsPerMeasure,
            },
          });
        }
        return;
      }

      if (parsed.type === "metronome-state") {
        const next = {
          bpm: parsed.metronome.bpm,
          beatsPerMeasure: parsed.metronome.beats,
        };
        metronomeStateRef.current = next;
        setMetronomeState(next);
        return;
      }

      if (parsed.type === "play-schedule") {
        applyPlaySchedule(parsed.roomId, parsed.at);
        return;
      }

      if (parsed.type === "play-halt") {
        applyPlayHalt(parsed.roomId);
      }
    });

    ws.addEventListener("close", () => {
      wsRef.current = null;
      setIsConnecting(false);
      setIsServer(false);
      setIsOwner(false);
      setRoomId(null);
    });

    ws.addEventListener("error", () => {
      setIsConnecting(false);
    });
  };

  const disconnect = () => {
    wsRef.current?.close();
    wsRef.current = null;
    setIsConnecting(false);
    setIsServer(false);
    setIsOwner(false);
    setRoomId(null);
    applyPlayHalt();
  };

  const setBpm = (nextBpm: number) => {
    const normalized = clampBpm(nextBpm);
    if (!isServerRef.current) {
      setMetronomeState((prev) => ({
        ...prev,
        bpm: normalized,
      }));
      return;
    }

    if (!isOwnerRef.current || isPlayingRef.current) {
      return;
    }
    const snapshot = metronomeStateRef.current;
    sendWs({
      type: "set-metronome",
      metronome: {
        bpm: normalized,
        beats: snapshot.beatsPerMeasure,
      },
    });
  };

  const setBeatsPerMeasure = (nextBeatsPerMeasure: number) => {
    const normalized = normalizeBeats(nextBeatsPerMeasure);
    if (!isServerRef.current) {
      setMetronomeState((prev) => ({
        ...prev,
        beatsPerMeasure: normalized,
      }));
      return;
    }

    if (!isOwnerRef.current || isPlayingRef.current) {
      return;
    }
    const snapshot = metronomeStateRef.current;
    sendWs({
      type: "set-metronome",
      metronome: {
        bpm: snapshot.bpm,
        beats: normalized,
      },
    });
  };

  const toggle = () => {
    if (!isServerRef.current) {
      applyLocalPlaying(!isPlayingRef.current);
      return;
    }

    if (!isOwnerRef.current) {
      return;
    }

    if (isPlayingRef.current) {
      sendWs({ type: "play-halt" });
      applyPlayHalt();
      return;
    }

    const at = Date.now() + SCHEDULE_LEAD_MS;
    sendWs({
      type: "play-schedule",
      at,
    });
  };

  return {
    connect,
    isServer,
    isConnecting,
    metronome: {
      bpm: metronomeState.bpm,
      beatsPerMeasure: metronomeState.beatsPerMeasure,
      currentBeat,
      roomId,
      isOwner,
      setBpm,
      setBeatsPerMeasure,
      toggle,
      disconnect,
    },
    isPlaying,
  };
}
