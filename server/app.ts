import { Elysia, t } from "elysia";
import { createRoomSyncService } from "./domain/roomSync";

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

function createSyncWsPlugin() {
  const roomSync = createRoomSyncService();
  return new Elysia().ws("/sync", {
    body: clientMessage,
    response: controlPayload,
    open(ws) {
      roomSync.open(ws.id);
      console.log("새로운 기기 연결됨:", ws.id);
    },
    message(ws, message) {
      const cid = ws.id;
      if (message.type === "join") {
        const rid = roomSync.join(cid, message.roomId, (data) => {
          ws.send(data);
        });
        if (!rid) {
          return;
        }
        console.log(`방 입장 완료 - ID: ${cid}, Room: ${rid}`);
        return;
      }
      if (message.type === "control") {
        const rid = roomSync.getConnectionRoom(cid);
        if (!rid) {
          return;
        }
        const payload = roomSync.control(cid, {
          bpm: message.bpm,
          beats: message.beats,
          isPlaying: message.isPlaying,
        });
        if (!payload) {
          return;
        }
        console.log(
          `신호 중계 중: Room ${rid} -> BPM ${payload.bpm}, Playing: ${payload.isPlaying}`,
        );
      }
    },
    close(ws) {
      roomSync.close(ws.id);
      console.log(`연결 종료: ${ws.id}`);
    },
  });
}

export function createApp() {
  return new Elysia()
    .get("/health", () => ({ ok: true as const }))
    .use(createSyncWsPlugin());
}

export const app = createApp();

export type App = typeof app;
