import { z } from "zod";

export const ROOM_ID_PATTERN = /^[A-Z0-9]{4,12}$/;
export const MIN_BPM = 20;
export const MAX_BPM = 300;
export const ALLOWED_BEATS = new Set([2, 3, 4, 6, 8]);
export const MIN_CONTROL_INTERVAL_MS = 30;

export type ControlPayload = {
  bpm: number;
  beats: number;
  isPlaying: boolean;
};

export type MemberSend = (data: ControlPayload) => void;

type Member = {
  send: MemberSend;
};

type CreateRoomSyncServiceOptions = {
  now?: () => number;
};

export type RoomSyncService = ReturnType<typeof createRoomSyncService>;

const roomIdSchema = z.string().trim().toUpperCase().regex(ROOM_ID_PATTERN);

const controlPayloadSchema = z.object({
  bpm: z.number().int().min(MIN_BPM).max(MAX_BPM),
  beats: z
    .number()
    .int()
    .refine((value) => ALLOWED_BEATS.has(value)),
  isPlaying: z.boolean(),
});

export const normalizeRoomId = (roomId: string): string | null => {
  const parsed = roomIdSchema.safeParse(roomId);
  return parsed.success ? parsed.data : null;
};

export const isValidControlPayload = (payload: ControlPayload): boolean =>
  controlPayloadSchema.safeParse(payload).success;

export function createRoomSyncService(
  options: CreateRoomSyncServiceOptions = {},
) {
  const getNow = options.now ?? Date.now;
  const rooms = new Map<string, Map<string, Member>>();
  const connectionRoom = new Map<string, string | null>();
  const lastControlAt = new Map<string, number>();

  const removeFromRoom = (roomId: string | null, id: string) => {
    if (!roomId) {
      return;
    }
    const map = rooms.get(roomId);
    if (!map) {
      return;
    }
    map.delete(id);
    if (map.size === 0) {
      rooms.delete(roomId);
    }
  };

  return {
    open(connectionId: string) {
      connectionRoom.set(connectionId, null);
      lastControlAt.set(connectionId, 0);
    },
    join(
      connectionId: string,
      roomId: string,
      send: MemberSend,
    ): string | null {
      const normalized = normalizeRoomId(roomId);
      if (!normalized) {
        return null;
      }
      const prevRoom = connectionRoom.get(connectionId) ?? null;
      if (prevRoom) {
        removeFromRoom(prevRoom, connectionId);
      }

      const members = rooms.get(normalized) ?? new Map<string, Member>();
      members.set(connectionId, { send });
      rooms.set(normalized, members);
      connectionRoom.set(connectionId, normalized);

      return normalized;
    },
    control(
      connectionId: string,
      payload: ControlPayload,
    ): ControlPayload | null {
      const roomId = connectionRoom.get(connectionId) ?? null;
      if (!roomId) {
        return null;
      }

      const now = getNow();
      const prevControlAt = lastControlAt.get(connectionId) ?? 0;
      if (now - prevControlAt < MIN_CONTROL_INTERVAL_MS) {
        return null;
      }

      const normalizedPayload = {
        bpm: Math.round(payload.bpm),
        beats: Math.round(payload.beats),
        isPlaying: payload.isPlaying,
      };
      if (!isValidControlPayload(normalizedPayload)) {
        return null;
      }

      const members = rooms.get(roomId);
      if (!members) {
        return null;
      }

      lastControlAt.set(connectionId, now);
      for (const [memberId, member] of members.entries()) {
        if (memberId === connectionId) {
          continue;
        }
        member.send(normalizedPayload);
      }

      return normalizedPayload;
    },
    close(connectionId: string) {
      const roomId = connectionRoom.get(connectionId) ?? null;
      removeFromRoom(roomId, connectionId);
      connectionRoom.delete(connectionId);
      lastControlAt.delete(connectionId);
    },
    getConnectionRoom(connectionId: string): string | null {
      return connectionRoom.get(connectionId) ?? null;
    },
    getRoomSize(roomId: string): number {
      return rooms.get(roomId.toUpperCase())?.size ?? 0;
    },
  };
}
