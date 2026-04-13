import { treaty } from "@elysiajs/eden";
import type { App } from "@server/app";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createMetronomeEngine } from "../audio/createMetronomeEngine";
import { PLAY_SCHEDULE_LEAD_MS } from "../domain/constants";
import { clampBpm, normalizeBeats } from "../domain/guards";
import { computeAlignedStart } from "../domain/playSchedule";

type UseMetronomeParams = {
  initialBpm: number;
  initialBeatsPerMeasure: number;
};

type MetronomeState = {
  bpm: number;
  beatsPerMeasure: number;
};

type Connection =
  | { phase: "offline" }
  | { phase: "connecting" }
  | { phase: "live"; roomId: string; isOwner: boolean };

type LatestSnapshot = {
  connection: Connection;
  isPlaying: boolean;
  metronomeState: MetronomeState;
};

const getServerOrigin = (): string =>
  window?.location?.origin ?? "http://localhost:4000";

const createRoomSubscription = (targetRoomId?: string) =>
  treaty<App>(getServerOrigin()).room.subscribe({
    query: targetRoomId ? { id: targetRoomId } : {},
  });

type RoomSubscription = ReturnType<typeof createRoomSubscription>;
type RoomClientMessage = Parameters<RoomSubscription["send"]>[0];

function connectionRoomId(connection: Connection): string | null {
  return connection.phase === "live" ? connection.roomId : null;
}

export function useMetronome(params: UseMetronomeParams) {
  const [metronomeState, setMetronomeState] = useState<MetronomeState>(() => ({
    bpm: clampBpm(params.initialBpm),
    beatsPerMeasure: normalizeBeats(params.initialBeatsPerMeasure),
  }));
  const [connection, setConnection] = useState<Connection>({
    phase: "offline",
  });
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentBeat, setCurrentBeat] = useState(0);

  const wsRef = useRef<RoomSubscription | null>(null);
  const latestRef = useRef<LatestSnapshot>({
    connection: { phase: "offline" },
    isPlaying: false,
    metronomeState: {
      bpm: clampBpm(params.initialBpm),
      beatsPerMeasure: normalizeBeats(params.initialBeatsPerMeasure),
    },
  });

  useEffect(() => {
    latestRef.current = {
      connection,
      isPlaying,
      metronomeState,
    };
  }, [connection, isPlaying, metronomeState]);

  const isServer = connection.phase === "live";
  const isConnecting = connection.phase === "connecting";
  const roomId = connectionRoomId(connection);
  const isOwner = connection.phase === "live" ? connection.isOwner : false;

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

  const applyLocalPlaying = useCallback(
    (nextIsPlaying: boolean) => {
      if (nextIsPlaying) {
        if (engine.start()) {
          setIsPlaying(true);
        }
        return;
      }
      engine.stop();
      setIsPlaying(false);
    },
    [engine],
  );

  const applyPlayHalt = useCallback(
    (eventRoomId?: string) => {
      const { connection: conn } = latestRef.current;
      if (eventRoomId && connectionRoomId(conn) !== eventRoomId) {
        return;
      }
      engine.stop();
      setIsPlaying(false);
    },
    [engine],
  );

  const applyPlaySchedule = useCallback(
    (eventRoomId: string, at: number) => {
      if (connectionRoomId(latestRef.current.connection) !== eventRoomId) {
        return;
      }
      const recvWall = Date.now();
      const snap = latestRef.current.metronomeState;
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
    },
    [engine],
  );

  const sendWs = useCallback((payload: RoomClientMessage) => {
    const ws = wsRef.current;
    if (!ws) {
      return;
    }
    ws.send(payload);
  }, []);

  const disconnect = useCallback(() => {
    wsRef.current?.close();
    wsRef.current = null;
    setConnection({ phase: "offline" });
    applyPlayHalt();
  }, [applyPlayHalt]);

  const connect = useCallback(
    (targetRoomId?: string) => {
      const conn = latestRef.current.connection;
      if (conn.phase === "connecting" || conn.phase === "live") {
        return;
      }

      setConnection({ phase: "connecting" });
      const ws = createRoomSubscription(targetRoomId);
      wsRef.current = ws;

      ws.addEventListener("message", (event) => {
        const parsed = event.data;

        if (parsed.type === "error") {
          disconnect();
          return;
        }

        if (parsed.type === "room-created" || parsed.type === "room-joined") {
          setConnection({
            phase: "live",
            roomId: parsed.roomId,
            isOwner: parsed.role === "owner",
          });

          if (parsed.type === "room-created") {
            const snapshot = latestRef.current.metronomeState;
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
          const next: MetronomeState = {
            bpm: parsed.metronome.bpm,
            beatsPerMeasure: parsed.metronome.beats,
          };
          latestRef.current = {
            ...latestRef.current,
            metronomeState: next,
          };
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
        setConnection({ phase: "offline" });
      });

      ws.addEventListener("error", () => {
        setConnection((prev) =>
          prev.phase === "connecting" ? { phase: "offline" } : prev,
        );
      });
    },
    [applyPlayHalt, applyPlaySchedule, disconnect, sendWs],
  );

  const setBpm = useCallback(
    (nextBpm: number) => {
      const normalized = clampBpm(nextBpm);
      const snap = latestRef.current;
      if (snap.connection.phase !== "live") {
        setMetronomeState((prev) => ({
          ...prev,
          bpm: normalized,
        }));
        return;
      }

      if (!snap.connection.isOwner || snap.isPlaying) {
        return;
      }
      const snapshot = snap.metronomeState;
      sendWs({
        type: "set-metronome",
        metronome: {
          bpm: normalized,
          beats: snapshot.beatsPerMeasure,
        },
      });
    },
    [sendWs],
  );

  const setBeatsPerMeasure = useCallback(
    (nextBeatsPerMeasure: number) => {
      const normalized = normalizeBeats(nextBeatsPerMeasure);
      const snap = latestRef.current;
      if (snap.connection.phase !== "live") {
        setMetronomeState((prev) => ({
          ...prev,
          beatsPerMeasure: normalized,
        }));
        return;
      }

      if (!snap.connection.isOwner || snap.isPlaying) {
        return;
      }
      const snapshot = snap.metronomeState;
      sendWs({
        type: "set-metronome",
        metronome: {
          bpm: snapshot.bpm,
          beats: normalized,
        },
      });
    },
    [sendWs],
  );

  const toggle = useCallback(() => {
    const snap = latestRef.current;
    if (snap.connection.phase !== "live") {
      applyLocalPlaying(!snap.isPlaying);
      return;
    }

    if (!snap.connection.isOwner) {
      return;
    }

    if (snap.isPlaying) {
      sendWs({ type: "play-halt" });
      applyPlayHalt();
      return;
    }

    const at = Date.now() + PLAY_SCHEDULE_LEAD_MS;
    sendWs({
      type: "play-schedule",
      at,
    });
  }, [applyLocalPlaying, applyPlayHalt, sendWs]);

  const metronome = useMemo(
    () => ({
      bpm: metronomeState.bpm,
      beatsPerMeasure: metronomeState.beatsPerMeasure,
      currentBeat,
      roomId,
      isOwner,
      setBpm,
      setBeatsPerMeasure,
      toggle,
      disconnect,
    }),
    [
      metronomeState.bpm,
      metronomeState.beatsPerMeasure,
      currentBeat,
      roomId,
      isOwner,
      setBpm,
      setBeatsPerMeasure,
      toggle,
      disconnect,
    ],
  );

  return {
    connect,
    isServer,
    isConnecting,
    metronome,
    isPlaying,
  };
}
