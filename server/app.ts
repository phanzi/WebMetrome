import { Elysia, t } from "elysia";
import { RoomService } from "./domain/roomService";
import { createRateLimiter } from "./shared/rateLimiter";

const querySchema = t.Object({
  id: t.Optional(t.String()),
});

const bodySchema = t.Union([
  t.Object({
    type: t.Literal("set-metronome"),
    metronome: t.Object({
      bpm: t.Number(),
      beats: t.Number(),
    }),
  }),
  t.Object({
    type: t.Literal("play-schedule"),
    // ms Unix timestamp
    startedAt: t.Number(),
  }),
  t.Object({
    type: t.Literal("play-halt"),
  }),
]);

const responseSchema = t.Union([
  t.Object({
    type: t.Literal("room-created"),
    roomId: t.String(),
  }),
  t.Object({
    type: t.Literal("room-joined"),
    roomId: t.String(),
  }),
  t.Object({
    type: t.Literal("metronome-state"),
    metronome: t.Object({
      bpm: t.Number(),
      beats: t.Number(),
    }),
  }),
  t.Object({
    type: t.Literal("play-schedule"),
    // ms Unix timestamp
    startedAt: t.Number(),
  }),
  t.Object({
    type: t.Literal("play-halt"),
  }),
  t.Object({
    type: t.Literal("promote-owner"),
  }),
  t.Object({
    type: t.Literal("error"),
    code: t.Union([
      t.Literal("INVALID_ROOM"),
      t.Literal("UNAUTHORIZED"),
      t.Literal("ALREADY_CREATED"),
      t.Literal("FAILED_TO_CREATE_ROOM_ID"),
      t.Literal("INVALID_PAYLOAD"),
      t.Literal("RATE_LIMIT"),
      t.Literal("ALREADY_JOINED"),
      t.Literal("INVALID_ROOM_ID"),
      t.Literal("ROOM_NOT_FOUND"),
    ]),
    message: t.String(),
  }),
]);

export type ResponseSchema = typeof responseSchema.static;

export function createApp(options?: { now?: () => number }) {
  const getNow = options?.now ?? Date.now;
  const rateLimiter = createRateLimiter({ now: getNow });
  const roomService = new RoomService<ResponseSchema>();

  return new Elysia().ws("/room", {
    query: querySchema,
    body: bodySchema,
    response: responseSchema,
    open(ws) {
      const roomId = ws.data.query.id;
      if (roomId) {
        const joined = roomService.joinRoom(ws, roomId);
        if (joined.success) {
          ws.send({
            type: "room-joined",
            roomId: roomId,
          });
          ws.send({
            type: "metronome-state",
            metronome: joined.data.metronomeState,
          });
          if (joined.data.playScheduleSnap) {
            ws.send({
              type: "play-schedule",
              startedAt: joined.data.playScheduleSnap.startedAt,
            });
          }
        } else {
          ws.send({
            type: "error",
            code: joined.code,
            message: joined.message,
          });
        }
      } else {
        const created = roomService.createRoom(ws);
        if (created.success) {
          ws.send({
            type: "room-created",
            roomId: created.data.id,
          });
        } else {
          ws.send({
            type: "error",
            code: created.code,
            message: created.message,
          });
        }
      }
    },
    message(ws, message) {
      if (!rateLimiter.allow(ws.id)) {
        ws.send({
          type: "error",
          code: "RATE_LIMIT",
          message: "Too many requests",
        });
        return;
      }

      switch (message.type) {
        case "set-metronome": {
          const set = roomService.setMetronomeState(ws.id, message.metronome);
          if (!set.success) {
            ws.send({
              type: "error",
              code: set.code,
              message: set.message,
            });
            return;
          }
          const broadcast = roomService.broadcast(ws.id, {
            type: "metronome-state",
            metronome: message.metronome,
          });
          if (!broadcast.success) {
            ws.send({
              type: "error",
              code: broadcast.code,
              message: broadcast.message,
            });
            return;
          }
          return;
        }
        case "play-schedule": {
          const schedule = roomService.schedulePlay(ws.id, {
            startedAt: message.startedAt,
          });
          if (!schedule.success) {
            ws.send({
              type: "error",
              code: schedule.code,
              message: schedule.message,
            });
            return;
          }
          const broadcast = roomService.broadcast(ws.id, {
            type: "play-schedule",
            startedAt: message.startedAt,
          });
          if (!broadcast.success) {
            ws.send({
              type: "error",
              code: broadcast.code,
              message: broadcast.message,
            });
            return;
          }
          return;
        }
        case "play-halt": {
          const halt = roomService.haltPlay(ws.id);
          if (!halt.success) {
            ws.send({
              type: "error",
              code: halt.code,
              message: halt.message,
            });
            return;
          }
          const broadcast = roomService.broadcast(ws.id, {
            type: "play-halt",
          });
          if (!broadcast.success) {
            ws.send({
              type: "error",
              code: broadcast.code,
              message: broadcast.message,
            });
            return;
          }
          return;
        }
      }
    },
    close(ws) {
      rateLimiter.clear(ws.id);
      const left = roomService.leaveRoom(ws.id);
      if (left.success) {
        if (left.data.type === "owner-changed") {
          left.data.owner.send({
            type: "promote-owner",
          });
        }
      }
      console.log(`연결 종료: ${ws.id}`);
    },
  });
}

export const app = createApp();

export type App = typeof app;
