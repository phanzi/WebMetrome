import { Elysia, t } from "elysia";

const ROOM_ID_PATTERN = /^[A-Z0-9]{4,12}$/;
const MIN_BPM = 20;
const MAX_BPM = 300;
const ALLOWED_BEATS = new Set([2, 3, 4, 6, 8]);
const MIN_CONTROL_INTERVAL_MS = 30;

const clientMessage = t.Union([
  t.Object({
    type: t.Literal("join"),
    roomId: t.String(),
  }),
  t.Object({
    type: t.Literal("control"),
    roomId: t.String(),
    bpm: t.Number(),
    beats: t.Number(),
    isPlaying: t.Boolean(),
  }),
]);

const controlPayload = t.Object({
  bpm: t.Number(),
  beats: t.Number(),
  isPlaying: t.Boolean(),
});

type Member = {
  send: (data: { bpm: number; beats: number; isPlaying: boolean }) => void;
};

const rooms = new Map<string, Map<string, Member>>();
const connectionRoom = new Map<string, string | null>();
const lastControlAt = new Map<string, number>();

const normalizeRoomId = (roomId: string): string | null => {
  const normalized = roomId.trim().toUpperCase();
  return ROOM_ID_PATTERN.test(normalized) ? normalized : null;
};

const isValidControlPayload = (payload: {
  bpm: number;
  beats: number;
  isPlaying: boolean;
}): boolean =>
  Number.isFinite(payload.bpm) &&
  Number.isInteger(payload.bpm) &&
  payload.bpm >= MIN_BPM &&
  payload.bpm <= MAX_BPM &&
  Number.isFinite(payload.beats) &&
  Number.isInteger(payload.beats) &&
  ALLOWED_BEATS.has(payload.beats) &&
  typeof payload.isPlaying === "boolean";

function addToRoom(roomId: string, id: string, send: Member["send"]) {
  const key = roomId.toUpperCase();
  let map = rooms.get(key);
  if (!map) {
    map = new Map();
    rooms.set(key, map);
  }
  map.set(id, { send });
}

function removeFromRoom(roomId: string | null, id: string) {
  if (!roomId) {
    return;
  }
  const key = roomId.toUpperCase();
  const map = rooms.get(key);
  if (!map) {
    return;
  }
  map.delete(id);
  if (map.size === 0) {
    rooms.delete(key);
  }
}

function broadcastControl(
  roomId: string,
  excludeId: string,
  payload: { bpm: number; beats: number; isPlaying: boolean },
) {
  const map = rooms.get(roomId.toUpperCase());
  if (!map) {
    return;
  }
  for (const [id, m] of map) {
    if (id === excludeId) {
      continue;
    }
    m.send(payload);
  }
}

export const app = new Elysia()
  .get("/health", () => ({ ok: true as const }))
  .ws("/sync", {
    body: clientMessage,
    response: controlPayload,
    open(ws) {
      connectionRoom.set(ws.id, null);
      lastControlAt.set(ws.id, 0);
      console.log("새로운 기기 연결됨:", ws.id);
    },
    message(ws, message) {
      const cid = ws.id;
      const prevRoom = connectionRoom.get(cid) ?? null;
      if (message.type === "join") {
        const rid = normalizeRoomId(message.roomId);
        if (!rid) {
          return;
        }
        if (prevRoom) {
          removeFromRoom(prevRoom, cid);
        }
        connectionRoom.set(cid, rid);
        addToRoom(rid, cid, (d) => {
          try {
            ws.send(d);
          } catch {
            // Ignore send failures; closed sockets are cleaned up on close event.
          }
        });
        console.log(`방 입장 완료 - ID: ${cid}, Room: ${rid}`);
        return;
      }
      if (message.type === "control") {
        const rid = connectionRoom.get(cid) ?? null;
        if (!rid) {
          return;
        }
        const now = Date.now();
        const prevControlAt = lastControlAt.get(cid) ?? 0;
        if (now - prevControlAt < MIN_CONTROL_INTERVAL_MS) {
          return;
        }
        const payload = {
          bpm: Math.round(message.bpm),
          beats: Math.round(message.beats),
          isPlaying: message.isPlaying,
        };
        if (!isValidControlPayload(payload)) {
          return;
        }
        lastControlAt.set(cid, now);
        broadcastControl(rid, cid, {
          bpm: payload.bpm,
          beats: payload.beats,
          isPlaying: payload.isPlaying,
        });
        console.log(
          `신호 중계 중: Room ${rid} -> BPM ${payload.bpm}, Playing: ${payload.isPlaying}`,
        );
      }
    },
    close(ws) {
      const cid = ws.id;
      const roomId = connectionRoom.get(cid) ?? null;
      removeFromRoom(roomId, cid);
      connectionRoom.delete(cid);
      lastControlAt.delete(cid);
      console.log(`연결 종료: ${cid}`);
    },
  });

export type App = typeof app;
