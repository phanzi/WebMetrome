import { Elysia } from "elysia";
import z from "zod";
import { ROOM_ID_REGEX } from "./domain/constants";
import { RoomService } from "./domain/roomService";

const querySchema = z.object({
  roomId: z.string().regex(ROOM_ID_REGEX),
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
      type: z.literal("room-joined"),
      payload: z.object({
        roomId: z.string(),
        role: z.literal(["owner", "member"]),
      }),
    }),
    z.object({
      type: z.literal("promote-owner"),
      payload: z.object({}),
    }),
    z.object({
      type: z.literal("error"),
      payload: z.object({
        code: z.literal(["UNAUTHORIZED", "ROOM_NOT_FOUND"]),
        message: z.string(),
      }),
    }),
  ]),
);

export type ResponseSchema = z.output<typeof responseSchema>;

export function createApp() {
  const roomService = new RoomService<ResponseSchema>();

  return new Elysia()
    .post("/rooms", () => roomService.readyRoom())
    .ws("/rooms", {
      query: querySchema,
      body: messageSchema,
      response: responseSchema,
      open(ws) {
        const roomId = ws.data.query.roomId;
        const joined = roomService.joinRoom(ws, roomId);
        if (!joined.success) {
          ws.send({
            type: "error",
            payload: {
              code: joined.code,
              message: joined.message,
            },
          });
          return;
        }

        ws.subscribe(joined.data.room.id);
        ws.send({
          type: "room-joined",
          payload: {
            roomId: roomId,
            role: joined.data.room.owner.id === ws.id ? "owner" : "member",
          },
        });
        if (joined.data.room.owner.id !== ws.id) {
          ws.send({
            type: "set-metronome",
            payload: joined.data.room.metronome,
          });
        }
        if (joined.data.room.lastPlayAt) {
          ws.send({
            type: "play-schedule",
            payload: {
              at: joined.data.room.lastPlayAt,
            },
          });
        }
      },
      message(ws, message) {
        const check = roomService.checkMessagable(ws.id);
        if (!check.success) {
          ws.send({
            type: "error",
            payload: {
              code: check.code,
              message: check.message,
            },
          });
          return;
        }

        const room = check.data;
        switch (message.type) {
          case "set-metronome":
            room.metronome = message.payload;
            break;
          case "play-schedule":
            room.lastPlayAt = message.payload.at;
            break;
          case "play-halt":
            room.lastPlayAt = null;
            break;
        }

        ws.publish(room.id, message);
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
