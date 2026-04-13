import { z } from "zod";
import { createControlRateLimiter } from "./controlRateLimit";

export const ROOM_ID_PATTERN = /^[A-Z0-9]{4,12}$/;
export const MIN_BPM = 20;
export const MAX_BPM = 300;
export const ALLOWED_BEATS = new Set([2, 3, 4, 6, 8]);
export { MIN_CONTROL_INTERVAL_MS } from "./controlRateLimit";

export type MetronomeState = {
  bpm: number;
  beats: number;
};

export type PlayingState = {
  updatedAt: number;
  isPlaying: boolean;
};

export type ClientRole = "owner" | "member";

export type ServerMessage =
  | {
      type: "room-created";
      roomId: string;
      role: ClientRole;
    }
  | {
      type: "room-joined";
      roomId: string;
      role: ClientRole;
    }
  | {
      type: "metronome-state";
      roomId: string;
      metronome: MetronomeState;
    }
  | {
      type: "playing-state";
      roomId: string;
      playing: PlayingState;
    }
  | {
      type: "error";
      code:
        | "INVALID_ROOM"
        | "UNAUTHORIZED"
        | "INVALID_PAYLOAD"
        | "PLAYING_LOCKED"
        | "RATE_LIMIT";
      message: string;
    };

type Member = {
  send: (data: ServerMessage) => void;
};

type CreateRoomSyncServiceOptions = {
  now?: () => number;
};

const roomIdSchema = z.string().trim().toUpperCase().regex(ROOM_ID_PATTERN);

const metronomeStateSchema = z.object({
  bpm: z.number().int().min(MIN_BPM).max(MAX_BPM),
  beats: z
    .number()
    .int()
    .refine((value) => ALLOWED_BEATS.has(value), "Unsupported beats"),
});

const playingStateSchema = z.object({
  updatedAt: z.number().int().nonnegative(),
  isPlaying: z.boolean(),
});

const createDefaultMetronomeState = (): MetronomeState => ({
  bpm: 120,
  beats: 4,
});

const createDefaultPlayingState = (now: number): PlayingState => ({
  updatedAt: now,
  isPlaying: false,
});

const roomIdAlphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

type Room = {
  ownerConnectionId: string;
  members: Set<string>;
  metronomeState: MetronomeState;
  playingState: PlayingState;
};

export const normalizeRoomId = (roomId: string): string | null => {
  const parsed = roomIdSchema.safeParse(roomId);
  return parsed.success ? parsed.data : null;
};

export const isValidMetronomeState = (payload: MetronomeState): boolean =>
  metronomeStateSchema.safeParse(payload).success;

export const isValidPlayingState = (payload: PlayingState): boolean =>
  playingStateSchema.safeParse(payload).success;

const createRoomId = (existing: Set<string>): string => {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const random = crypto.getRandomValues(new Uint32Array(6));
    const next = Array.from(
      random,
      (value) => roomIdAlphabet[value % roomIdAlphabet.length],
    ).join("");
    if (!existing.has(next)) {
      return next;
    }
  }
  throw new Error("Failed to create unique room id");
};

export function createRoomSyncService(
  options: CreateRoomSyncServiceOptions = {},
) {
  const getNow = options.now ?? Date.now;
  const controlRateLimiter = createControlRateLimiter({ now: getNow });
  const rooms = new Map<string, Room>();
  const connectionRoom = new Map<string, string | null>();

  const removeRoomMembership = (
    roomId: string | null,
    connectionId: string,
  ) => {
    if (!roomId) {
      return;
    }
    const room = rooms.get(roomId);
    if (!room) {
      return;
    }

    room.members.delete(connectionId);
    if (room.ownerConnectionId === connectionId || room.members.size === 0) {
      for (const memberId of room.members) {
        const member = members.get(memberId);
        member?.send({
          type: "error",
          code: "INVALID_ROOM",
          message: "방이 종료되었습니다.",
        });
        connectionRoom.set(memberId, null);
      }
      rooms.delete(roomId);
      return;
    }

    rooms.set(roomId, room);
  };

  const canUpdateMetronome = (room: Room, connectionId: string): boolean =>
    room.ownerConnectionId === connectionId;

  // Keep permission checks separated for future extension.
  const canUpdatePlaying = (room: Room, connectionId: string): boolean =>
    room.ownerConnectionId === connectionId;

  const broadcast = (roomId: string, message: ServerMessage) => {
    const room = rooms.get(roomId);
    if (!room) {
      return;
    }
    for (const memberId of room.members) {
      const member = members.get(memberId);
      if (!member) {
        continue;
      }
      member.send(message);
    }
  };

  const members = new Map<string, Member>();

  const removeFromRoom = (roomId: string | null, id: string) => {
    removeRoomMembership(roomId, id);
  };

  return {
    open(connectionId: string, send: (data: ServerMessage) => void) {
      members.set(connectionId, { send });
      connectionRoom.set(connectionId, null);
    },

    createRoom(
      connectionId: string,
    ): { ok: true; roomId: string } | { ok: false } {
      if (!members.has(connectionId)) {
        return { ok: false };
      }
      const prevRoom = connectionRoom.get(connectionId) ?? null;
      removeRoomMembership(prevRoom, connectionId);

      const roomId = createRoomId(new Set(rooms.keys()));
      const room: Room = {
        ownerConnectionId: connectionId,
        members: new Set([connectionId]),
        metronomeState: createDefaultMetronomeState(),
        playingState: createDefaultPlayingState(getNow()),
      };

      rooms.set(roomId, room);
      connectionRoom.set(connectionId, roomId);
      return { ok: true, roomId };
    },

    joinRoom(
      connectionId: string,
      roomId: string,
    ):
      | {
          ok: true;
          roomId: string;
          role: ClientRole;
          metronomeState: MetronomeState;
          playingState: PlayingState;
        }
      | {
          ok: false;
          code: "INVALID_ROOM";
        } {
      const normalized = normalizeRoomId(roomId);
      if (!normalized) {
        return { ok: false, code: "INVALID_ROOM" };
      }

      const room = rooms.get(normalized);
      if (!room) {
        return { ok: false, code: "INVALID_ROOM" };
      }

      const prevRoom = connectionRoom.get(connectionId) ?? null;
      removeRoomMembership(prevRoom, connectionId);

      room.members.add(connectionId);
      rooms.set(normalized, room);
      connectionRoom.set(connectionId, normalized);

      return {
        ok: true,
        roomId: normalized,
        role: room.ownerConnectionId === connectionId ? "owner" : "member",
        metronomeState: { ...room.metronomeState },
        playingState: { ...room.playingState },
      };
    },

    replaceMetronomeState(
      connectionId: string,
      payload: MetronomeState,
    ):
      | { ok: true; roomId: string; metronomeState: MetronomeState }
      | {
          ok: false;
          code:
            | "INVALID_ROOM"
            | "UNAUTHORIZED"
            | "INVALID_PAYLOAD"
            | "PLAYING_LOCKED"
            | "RATE_LIMIT";
        } {
      const roomId = connectionRoom.get(connectionId) ?? null;
      if (!roomId) {
        return { ok: false, code: "INVALID_ROOM" };
      }

      if (!controlRateLimiter.allow(connectionId, "metronome")) {
        return { ok: false, code: "RATE_LIMIT" };
      }

      const room = rooms.get(roomId);
      if (!room) {
        return { ok: false, code: "INVALID_ROOM" };
      }

      if (!canUpdateMetronome(room, connectionId)) {
        return { ok: false, code: "UNAUTHORIZED" };
      }

      if (room.playingState.isPlaying) {
        return { ok: false, code: "PLAYING_LOCKED" };
      }

      const parsed = metronomeStateSchema.safeParse(payload);
      if (!parsed.success) {
        return { ok: false, code: "INVALID_PAYLOAD" };
      }

      const metronomeState = { ...parsed.data };
      room.metronomeState = metronomeState;
      rooms.set(roomId, room);

      broadcast(roomId, {
        type: "metronome-state",
        roomId,
        metronome: metronomeState,
      });

      return { ok: true, roomId, metronomeState };
    },

    replacePlayingState(
      connectionId: string,
      payload: PlayingState,
    ):
      | { ok: true; roomId: string; playingState: PlayingState }
      | {
          ok: false;
          code:
            | "INVALID_ROOM"
            | "UNAUTHORIZED"
            | "INVALID_PAYLOAD"
            | "RATE_LIMIT";
        } {
      const roomId = connectionRoom.get(connectionId) ?? null;
      if (!roomId) {
        return { ok: false, code: "INVALID_ROOM" };
      }

      if (!controlRateLimiter.allow(connectionId, "playing")) {
        return { ok: false, code: "RATE_LIMIT" };
      }

      const room = rooms.get(roomId);
      if (!room) {
        return { ok: false, code: "INVALID_ROOM" };
      }
      if (!canUpdatePlaying(room, connectionId)) {
        return { ok: false, code: "UNAUTHORIZED" };
      }

      const parsed = playingStateSchema.safeParse(payload);
      if (!parsed.success) {
        return { ok: false, code: "INVALID_PAYLOAD" };
      }

      const playingState = { ...parsed.data };
      room.playingState = playingState;
      rooms.set(roomId, room);

      broadcast(roomId, {
        type: "playing-state",
        roomId,
        playing: playingState,
      });
      return { ok: true, roomId, playingState };
    },

    close(connectionId: string) {
      const roomId = connectionRoom.get(connectionId) ?? null;
      removeFromRoom(roomId, connectionId);
      connectionRoom.delete(connectionId);
      controlRateLimiter.clear(connectionId);
      members.delete(connectionId);
    },

    getConnectionRoom(connectionId: string): string | null {
      return connectionRoom.get(connectionId) ?? null;
    },

    getRoomSize(roomId: string): number {
      return rooms.get(roomId.toUpperCase())?.members.size ?? 0;
    },
  };
}
