import { Elysia, t } from "elysia";

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
      console.log("새로운 기기 연결됨:", ws.id);
    },
    message(ws, message) {
      const cid = ws.id;
      const prevRoom = connectionRoom.get(cid) ?? null;
      if (message.type === "join") {
        if (prevRoom) {
          removeFromRoom(prevRoom, cid);
        }
        const rid = message.roomId.toUpperCase();
        connectionRoom.set(cid, rid);
        addToRoom(rid, cid, (d) => {
          ws.send(d);
        });
        console.log(`방 입장 완료 - ID: ${cid}, Room: ${rid}`);
        return;
      }
      if (message.type === "control") {
        const rid = message.roomId.toUpperCase();
        broadcastControl(rid, cid, {
          bpm: message.bpm,
          beats: message.beats,
          isPlaying: message.isPlaying,
        });
        console.log(
          `신호 중계 중: Room ${rid} -> BPM ${message.bpm}, Playing: ${message.isPlaying}`,
        );
      }
    },
    close(ws) {
      const cid = ws.id;
      const roomId = connectionRoom.get(cid) ?? null;
      removeFromRoom(roomId, cid);
      connectionRoom.delete(cid);
      console.log(`연결 종료: ${cid}`);
    },
  });

export type App = typeof app;
