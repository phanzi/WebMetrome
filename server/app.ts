import { Elysia } from "elysia";
import z from "zod";
import { ROOM_ID_REGEX } from "./domain/constants";
import { RoomService } from "./domain/roomService";

const querySchema = z.object({
  id: z.string().regex(ROOM_ID_REGEX).optional(),
});

const messageSchema = z.union([
  z.object({
    type: z.literal("set-metronome"),
    payload: z.object({
      bpm: z.number(),
      beats: z.number(),
    }),
  }),
  z.object({
    type: z.literal("play-schedule"),
    payload: z.object({
      at: z.number(), // ms Unix timestamp
    }),
  }),
  z.object({
    type: z.literal("play-halt"),
    payload: z.object({}),
  }),
]);

const responseSchema = messageSchema.or(
  z.union([
    z.object({
      type: z.literal("room-created"),
      payload: z.object({
        roomId: z.string(),
        role: z.literal("owner"),
      }),
    }),
    z.object({
      type: z.literal("room-joined"),
      payload: z.object({
        roomId: z.string(),
        role: z.literal("member"),
      }),
    }),
    z.object({
      type: z.literal("promote-owner"),
      payload: z.object({}),
    }),
    z.object({
      type: z.literal("error"),
      payload: z.object({
        code: z.literal([
          "INVALID_ROOM",
          "UNAUTHORIZED",
          "ALREADY_CREATED",
          "FAILED_TO_CREATE_ROOM_ID",
          "INVALID_PAYLOAD",
          "RATE_LIMIT",
          "ALREADY_JOINED",
          "INVALID_ROOM_ID",
          "ROOM_NOT_FOUND",
        ]),
        message: z.string(),
      }),
    }),
  ]),
);

export type ResponseSchema = z.output<typeof responseSchema>;

export function createApp() {
  const roomService = new RoomService<ResponseSchema>();

  return new Elysia().ws("/room", {
    query: querySchema,
    body: messageSchema,
    response: responseSchema,
    open(ws) {
      const roomId = ws.data.query.id;
      if (roomId) {
        const joined = roomService.joinRoom(ws, roomId);
        if (joined.success) {
          ws.subscribe(joined.data.room.id);
          ws.send({
            type: "room-joined",
            payload: {
              roomId: roomId,
              role: "member",
            },
          });
          ws.send({
            type: "set-metronome",
            payload: joined.data.room.metronome,
          });
          if (joined.data.room.lastPlayAt) {
            ws.send({
              type: "play-schedule",
              payload: {
                at: joined.data.room.lastPlayAt,
              },
            });
          }
          return;
        }

        ws.send({
          type: "error",
          payload: {
            code: joined.code,
            message: joined.message,
          },
        });
        return;
      }

      const created = roomService.createRoom(ws);
      if (created.success) {
        ws.subscribe(created.data.id);
        ws.send({
          type: "room-created",
          payload: {
            roomId: created.data.id,
            role: "owner",
          },
        });
        return;
      }

      ws.send({
        type: "error",
        payload: {
          code: created.code,
          message: created.message,
        },
      });
    },
    message(ws, message) {
      switch (message.type) {
        case "set-metronome": {
          const set = roomService.setMetronomeState(ws.id, message.payload);
          if (!set.success) {
            ws.send({
              type: "error",
              payload: {
                code: set.code,
                message: set.message,
              },
            });
            return;
          }
          ws.publish(set.data.roomId, message);
          return;
        }
        case "play-schedule": {
          const play = roomService.setPlay(ws.id, message.payload.at);
          if (!play.success) {
            ws.send({
              type: "error",
              payload: {
                code: play.code,
                message: play.message,
              },
            });
            return;
          }
          ws.publish(play.data.roomId, message);
          return;
        }
        case "play-halt": {
          const halt = roomService.haltPlay(ws.id);
          if (!halt.success) {
            ws.send({
              type: "error",
              payload: {
                code: halt.code,
                message: halt.message,
              },
            });
            return;
          }
          ws.publish(halt.data.roomId, message);
          return;
        }
      }
    },
    close(ws) {
      const left = roomService.leaveRoom(ws.id);
      if (left.success) {
        if (left.data.type === "owner-changed") {
          left.data.owner.send({
            type: "promote-owner",
            payload: {},
          });
        }
      }
      console.log(`연결 종료: ${ws.id}`);
    },
  });
}

export const app = createApp();

export type App = typeof app;
