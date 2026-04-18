import { z } from "zod";

/** Matches outbound messages from [server/app.ts](server/app.ts). */

export const roomCreatedSchema = z.object({
  type: z.literal("room-created"),
  payload: z.object({
    roomId: z.string(),
    role: z.literal("owner"),
  }),
});

export const roomJoinedSchema = z.object({
  type: z.literal("room-joined"),
  payload: z.object({
    roomId: z.string(),
    role: z.literal("member"),
  }),
});

export const setMetronomeSchema = z.object({
  type: z.literal("set-metronome"),
  payload: z.object({
    bpm: z.number(),
    beats: z.number(),
  }),
});

export const playScheduleSchema = z.object({
  type: z.literal("play-schedule"),
  payload: z.object({
    at: z.number(),
  }),
});

export const playHaltSchema = z.object({
  type: z.literal("play-halt"),
});

export const errorSchema = z.object({
  type: z.literal("error"),
  payload: z.object({
    code: z.string(),
    message: z.string(),
  }),
});

export const rateLimitErrorSchema = z.object({
  type: z.literal("error"),
  payload: z.object({
    code: z.literal("RATE_LIMIT"),
    message: z.literal("Too many requests"),
  }),
});
