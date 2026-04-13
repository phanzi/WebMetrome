import { Elysia, t } from "elysia";
import { createRoomSyncService } from "./domain/roomSync";

const clientMessage = t.Union([
  t.Object({
    type: t.Literal("set-metronome"),
    metronome: t.Object({
      bpm: t.Number(),
      beats: t.Number(),
    }),
  }),
  t.Object({
    type: t.Literal("set-playing"),
    playing: t.Object({
      updatedAt: t.Number(),
      isPlaying: t.Boolean(),
    }),
  }),
]);

const serverMessage = t.Any();

const toErrorMessage = (
  code:
    | "INVALID_ROOM"
    | "UNAUTHORIZED"
    | "INVALID_PAYLOAD"
    | "PLAYING_LOCKED"
    | "RATE_LIMIT",
) => {
  if (code === "INVALID_ROOM") {
    return "방을 찾을 수 없습니다.";
  }
  if (code === "UNAUTHORIZED") {
    return "변경 권한이 없습니다.";
  }
  if (code === "PLAYING_LOCKED") {
    return "재생 중에는 메트로놈 설정을 변경할 수 없습니다.";
  }
  if (code === "RATE_LIMIT") {
    return "요청이 너무 빠릅니다.";
  }
  return "메시지 형식이 올바르지 않습니다.";
};

const resolveRoomIdFromConnection = (ws: {
  data?: { query?: { id?: string }; request?: Request };
}) => {
  const queryId = ws.data?.query?.id;
  if (queryId) {
    return queryId;
  }
  const requestUrl = ws.data?.request?.url;
  if (!requestUrl) {
    return null;
  }
  const parsed = new URL(requestUrl).searchParams.get("id");
  return parsed;
};

function createSyncWsPlugin() {
  const roomSync = createRoomSyncService();
  return new Elysia().ws("/room", {
    body: clientMessage,
    response: serverMessage,
    open(ws) {
      roomSync.open(ws.id, (data) => {
        ws.send(data);
      });
      console.log("새로운 기기 연결됨:", ws.id);

      const requestedRoomId = resolveRoomIdFromConnection(ws);
      if (!requestedRoomId) {
        const created = roomSync.createRoom(ws.id);
        if (!created.ok) {
          ws.send({
            type: "error",
            code: "INVALID_ROOM",
            message: "방을 생성할 수 없습니다.",
          });
          ws.close();
          return;
        }

        ws.send({
          type: "room-created",
          role: "owner",
          roomId: created.roomId,
        });
        return;
      }

      const joined = roomSync.joinRoom(ws.id, requestedRoomId);
      if (!joined.ok) {
        ws.send({
          type: "error",
          code: joined.code,
          message: toErrorMessage(joined.code),
        });
        ws.close();
        return;
      }

      ws.send({
        type: "room-joined",
        roomId: joined.roomId,
        role: joined.role,
      });
      ws.send({
        type: "metronome-state",
        roomId: joined.roomId,
        metronome: joined.metronomeState,
      });
      ws.send({
        type: "playing-state",
        roomId: joined.roomId,
        playing: joined.playingState,
      });
    },
    message(ws, message) {
      if (message.type === "set-metronome") {
        const updated = roomSync.replaceMetronomeState(
          ws.id,
          message.metronome,
        );
        if (updated.ok) {
          return;
        }
        ws.send({
          type: "error",
          code: updated.code,
          message: toErrorMessage(updated.code),
        });
        return;
      }

      const updated = roomSync.replacePlayingState(ws.id, message.playing);
      if (updated.ok) {
        return;
      }
      ws.send({
        type: "error",
        code: updated.code,
        message: toErrorMessage(updated.code),
      });
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
