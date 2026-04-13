import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { createMetronomeEngine } from "../audio/createMetronomeEngine";
import { ALLOWED_BEATS, MAX_BPM, MIN_BPM } from "../domain/constants";
import { clampBpm, normalizeBeats } from "../domain/guards";

type UseMetronomeParams = {
  initialBpm: number;
  initialBeatsPerMeasure: number;
};

type ConnectRoomEvent = {
  type: "room-created" | "room-joined";
  roomId: string;
  role: "owner" | "member";
};

type MetronomeStateEvent = {
  type: "metronome-state";
  roomId: string;
  metronome: {
    bpm: number;
    beats: number;
  };
};

type PlayingStateEvent = {
  type: "playing-state";
  roomId: string;
  playing: {
    updatedAt: number;
    isPlaying: boolean;
  };
};

type ErrorEvent = {
  type: "error";
  code:
    | "INVALID_ROOM"
    | "UNAUTHORIZED"
    | "INVALID_PAYLOAD"
    | "PLAYING_LOCKED"
    | "RATE_LIMIT";
  message: string;
};

type ServerEvent =
  | ConnectRoomEvent
  | MetronomeStateEvent
  | PlayingStateEvent
  | ErrorEvent;

const connectRoomSchema = z.object({
  type: z.union([z.literal("room-created"), z.literal("room-joined")]),
  roomId: z.string(),
  role: z.union([z.literal("owner"), z.literal("member")]),
});

const metronomeStateSchema = z.object({
  type: z.literal("metronome-state"),
  roomId: z.string(),
  metronome: z.object({
    bpm: z.number().int().min(MIN_BPM).max(MAX_BPM),
    beats: z
      .number()
      .int()
      .refine((value) =>
        ALLOWED_BEATS.includes(value as (typeof ALLOWED_BEATS)[number]),
      ),
  }),
});

const playingStateSchema = z.object({
  type: z.literal("playing-state"),
  roomId: z.string(),
  playing: z.object({
    updatedAt: z.number().int().nonnegative(),
    isPlaying: z.boolean(),
  }),
});

const errorSchema = z.object({
  type: z.literal("error"),
  code: z.enum([
    "INVALID_ROOM",
    "UNAUTHORIZED",
    "INVALID_PAYLOAD",
    "PLAYING_LOCKED",
    "RATE_LIMIT",
  ]),
  message: z.string(),
});

const asWsOrigin = (origin: string): string =>
  origin.startsWith("https://")
    ? origin.replace("https://", "wss://")
    : origin.replace("http://", "ws://");

const parseServerEvent = (raw: string): ServerEvent | null => {
  let data: unknown;
  try {
    data = JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
  const parsedConnect = connectRoomSchema.safeParse(data);
  if (parsedConnect.success) {
    return parsedConnect.data;
  }
  const parsedMetronome = metronomeStateSchema.safeParse(data);
  if (parsedMetronome.success) {
    return parsedMetronome.data;
  }
  const parsedPlaying = playingStateSchema.safeParse(data);
  if (parsedPlaying.success) {
    return parsedPlaying.data;
  }
  const parsedError = errorSchema.safeParse(data);
  if (parsedError.success) {
    return parsedError.data;
  }
  return null;
};

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

  const wsRef = useRef<WebSocket | null>(null);
  const isServerRef = useRef(false);
  const isOwnerRef = useRef(false);
  const isPlayingRef = useRef(false);
  const metronomeStateRef = useRef(metronomeState);

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

  const applyPlayingState = (nextIsPlaying: boolean) => {
    if (nextIsPlaying) {
      if (engine.start()) {
        setIsPlaying(true);
      }
      return;
    }
    engine.stop();
    setIsPlaying(false);
  };

  const sendWs = (payload: unknown) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      return;
    }
    ws.send(JSON.stringify(payload));
  };

  const connect = (targetRoomId?: string) => {
    if (isConnecting || isServerRef.current) {
      return;
    }

    setIsConnecting(true);
    const origin = window?.location?.origin ?? "http://localhost:4000";
    const wsOrigin = asWsOrigin(origin);
    const query = targetRoomId ? `?id=${encodeURIComponent(targetRoomId)}` : "";
    const ws = new WebSocket(`${wsOrigin}/room${query}`);
    wsRef.current = ws;

    ws.addEventListener("message", (event) => {
      const parsed = parseServerEvent(String(event.data));
      if (!parsed) {
        return;
      }

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
          sendWs({
            type: "set-playing",
            playing: {
              updatedAt: Date.now(),
              isPlaying: isPlayingRef.current,
            },
          });
        }
        return;
      }

      if (parsed.type === "metronome-state") {
        setMetronomeState({
          bpm: parsed.metronome.bpm,
          beatsPerMeasure: parsed.metronome.beats,
        });
        return;
      }

      if (parsed.type === "playing-state") {
        applyPlayingState(parsed.playing.isPlaying);
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
    applyPlayingState(false);
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
      applyPlayingState(!isPlayingRef.current);
      return;
    }

    if (!isOwnerRef.current) {
      return;
    }

    sendWs({
      type: "set-playing",
      playing: {
        updatedAt: Date.now(),
        isPlaying: !isPlayingRef.current,
      },
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
