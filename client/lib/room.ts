import { treaty } from "@elysiajs/eden";
import type { App } from "@server/app";
import { atom } from "./atom";
import { metronome } from "./metronome";

/**
 * type definitions
 */
type WS = App["~Routes"]["room"]["subscribe"];
type Connection = ReturnType<
  ReturnType<typeof treaty<App>>["room"]["subscribe"]
>;
type WSRequest = WS["body"];
type WSResponse = WS["response"][200];
type ErrorCode = (WSResponse & { type: "error" })["payload"]["code"];
type MessageCaseMap = {
  [key in WSResponse["type"]]: (
    con: Connection,
    data: (WSResponse & { type: key })["payload"],
  ) => unknown;
};
type ErrorCaseMap = Record<
  ErrorCode,
  (con: Connection, message: string) => unknown
>;

/**
 * constants
 */
const SERVER_ORIGIN = window?.location?.origin ?? "http://localhost:4000";

const state = atom<"idle" | "connecting" | "sending" | "online">("idle");
const error = atom("");
const role = atom<"owner" | "member">("owner");
const id = atom<string | null>(null);

let _close = () => {};
let _send = (_: WSRequest) => {};

const _errorCases: ErrorCaseMap = {
  INVALID_ROOM: (con) => {
    con.close();
  },
  UNAUTHORIZED: (con) => {
    con.close();
  },
  ALREADY_CREATED: (con, message) => {
    console.error(message);
  },
  FAILED_TO_CREATE_ROOM_ID: () => {
    error.set("Try again later");
  },
  INVALID_PAYLOAD: () => {
    error.set("Something went wrong");
  },
  RATE_LIMIT: () => {
    error.set("Try again later");
  },
  ALREADY_JOINED: () => {},
  INVALID_ROOM_ID: (con) => {
    error.set("Bad room id");
    con.close();
  },
  ROOM_NOT_FOUND: (con) => {
    con.close();
  },
};

const _messageCases: MessageCaseMap = {
  "room-created": (con, payload) => {
    role.set("owner");
    id.set(payload.roomId);
    state.set("online");
    con.send({
      type: "set-metronome",
      payload: { bpm: metronome.bpm.get(), beats: metronome.beats.get() },
    });
  },
  "room-joined": (con, payload) => {
    role.set("member");
    id.set(payload.roomId);
    state.set("online");
  },
  "set-metronome": (con, payload) => {
    metronome.bpm.set(payload.bpm);
    metronome.beats.set(payload.beats);
  },
  "play-schedule": (con, payload) => {
    metronome.play(payload.at);
  },
  "play-halt": () => {
    metronome.stop();
  },
  "promote-owner": () => {
    role.set("owner");
  },
  error: (con, payload) => {
    _errorCases[payload.code](con, payload.message);
    con.close();
  },
};

function connect(roomId?: string) {
  const con = treaty<App>(SERVER_ORIGIN).room.subscribe({
    query: roomId ? { id: roomId } : {},
  });

  con.on("message", ({ data }) => {
    _messageCases[data.type](con, data as unsafe_any);
  });
  con.on("error", () => {
    con.close();
  });
  con.on("close", () => {
    state.set("idle");
    role.set("owner");
    id.set(null);
    _close = () => {};
    _send = (_: WSRequest) => {};
  });

  _close = () => con.close();
  _send = (message: WSRequest) => con.send(message);
}

function leave() {
  _close();
}

function send(message: WSRequest) {
  if (state.get() !== "online") {
    return;
  }
  if (role.get() !== "owner") {
    return;
  }
  _send(message);
}

export const room = {
  state,
  role,
  error,
  id,
  connect,
  leave,
  send,
};
