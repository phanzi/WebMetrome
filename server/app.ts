import { Elysia } from "elysia";
import { nanoid } from "nanoid";
import z from "zod";
import { ROOM_ID_REGEX } from "./constants";
import { RoomService } from "./roomService";

function _shape<
  const T extends string,
  const P extends Record<string, z.ZodType>,
>(type: T, payload: P) {
  return z.object({
    id: z.string(),
    type: z.literal(type),
    payload: z.object(payload),
  });
}

const querySchema = z.object({
  roomId: z.string().regex(ROOM_ID_REGEX),
});

const metronomeMessageSchema = z.union([
  _shape("set-metronome", {
    bpm: z.number(),
    beats: z.number(),
    subDivision: z.enum(["quater", "quavers", "triplet", "semiquavers"]),
  }),
  _shape("play-schedule", {
    // ms Unix timestamp
    at: z.number(),
    // metronome state
    state: z.object({
      bpm: z.number(),
      beats: z.number(),
      subDivision: z.enum(["quater", "quavers", "triplet", "semiquavers"]),
    }),
  }),
  _shape("play-halt", {}),
]);

const roomMessageSchema = z.union([
  _shape("room-joined", {
    now: z.number(),
    roomId: z.string(),
    role: z.literal(["owner", "member"]),
  }),
  _shape("promote-owner", {}),
  _shape("error", {
    code: z.literal(["UNAUTHORIZED", "ROOM_NOT_FOUND"]),
    message: z.string(),
  }),
]);

const responseSchema = metronomeMessageSchema.or(roomMessageSchema);

type ResponseSchema = z.output<typeof responseSchema>;

export function createApp() {
  const roomService = new RoomService<ResponseSchema>();

  return new Elysia({
    prefix: "/api",
  })
    .post("/rooms", () => {
      return roomService.readyRoom();
    })
    .ws("/rooms", {
      query: querySchema,
      body: metronomeMessageSchema,
      response: responseSchema,
      open(ws) {
        const roomId = ws.data.query.roomId;
        const joined = roomService.joinRoom(ws, roomId);
        if (!joined.success) {
          ws.send({
            id: nanoid(),
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
          id: nanoid(),
          type: "room-joined",
          payload: {
            now: Date.now(),
            roomId: roomId,
            role: joined.data.room.owner.id === ws.id ? "owner" : "member",
          },
        });
        if (joined.data.room.owner.id !== ws.id) {
          ws.send({
            id: nanoid(),
            type: "set-metronome",
            payload: joined.data.room.metronome,
          });
        }
        if (joined.data.room.lastPlayAt) {
          ws.send({
            id: nanoid(),
            type: "play-schedule",
            payload: {
              at: joined.data.room.lastPlayAt,
              state: joined.data.room.metronome,
            },
          });
        }
      },
      message(ws, message) {
        const check = roomService.checkMessagable(ws.id);
        if (!check.success) {
          ws.send({
            id: nanoid(),
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
            const now = Date.now();
            room.lastPlayAt = now;
            room.metronome = message.payload.state;
            message.payload.at = now;
            break;
          case "play-halt":
            room.lastPlayAt = null;
            break;
        }

        ws.send(message);
        ws.publish(room.id, message);
      },
      close(ws) {
        const left = roomService.leaveRoom(ws.id);
        if (left.success) {
          if (left.data.type === "owner-changed") {
            left.data.owner.send({
              id: nanoid(),
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
