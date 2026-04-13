import { Elysia, t } from "elysia";
import { createRoomSyncService } from "./domain/roomSync";

export type CreateAppOptions = {
  now?: () => number;
};

const toErrorMessage = (
  code: "INVALID_ROOM" | "UNAUTHORIZED" | "INVALID_PAYLOAD" | "RATE_LIMIT",
) => {
  if (code === "INVALID_ROOM") {
    return "방을 찾을 수 없습니다.";
  }
  if (code === "UNAUTHORIZED") {
    return "변경 권한이 없습니다.";
  }
  if (code === "RATE_LIMIT") {
    return "요청이 너무 빠릅니다.";
  }
  return "메시지 형식이 올바르지 않습니다.";
};

export function createApp(options?: CreateAppOptions) {
  const roomSync = createRoomSyncService({ now: options?.now });
  return new Elysia().ws("/room", {
    body: t.Union([
      t.Object({
        type: t.Literal("set-metronome"),
        metronome: t.Object({
          bpm: t.Number(),
          beats: t.Number(),
        }),
      }),
      t.Object({
        type: t.Literal("play-schedule"),
        at: t.Number(),
      }),
      t.Object({
        type: t.Literal("play-halt"),
      }),
    ]),
    query: t.Object({
      id: t.Optional(t.String()),
    }),
    response: t.Union([
      t.Object({
        type: t.Literal("room-created"),
        role: t.Literal("owner"),
        roomId: t.String(),
      }),
      t.Object({
        type: t.Literal("room-joined"),
        role: t.Union([t.Literal("owner"), t.Literal("member")]),
        roomId: t.String(),
      }),
      t.Object({
        type: t.Literal("metronome-state"),
        roomId: t.String(),
        metronome: t.Object({
          bpm: t.Number(),
          beats: t.Number(),
        }),
      }),
      t.Object({
        type: t.Literal("play-schedule"),
        roomId: t.String(),
        at: t.Number(),
      }),
      t.Object({
        type: t.Literal("play-halt"),
        roomId: t.String(),
      }),
      t.Object({
        type: t.Literal("error"),
        code: t.Union([
          t.Literal("INVALID_ROOM"),
          t.Literal("UNAUTHORIZED"),
          t.Literal("INVALID_PAYLOAD"),
          t.Literal("RATE_LIMIT"),
        ]),
        message: t.String(),
      }),
    ]),
    open(ws) {
      roomSync.open(ws.id, (data) => {
        ws.send(data);
      });
      console.log("새로운 기기 연결됨:", ws.id);

      const requestedRoomId = ws.data.query.id;
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
      if (joined.replayPlaySchedule) {
        ws.send(joined.replayPlaySchedule);
      }
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

      if (message.type === "play-schedule") {
        const updated = roomSync.relayPlaySchedule(ws.id, {
          at: message.at,
        });
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

      const updated = roomSync.relayPlayHalt(ws.id);
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

export const app = createApp();

export type App = typeof app;
