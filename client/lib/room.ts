import type { Treaty } from "@elysiajs/eden";
import { treaty } from "@elysiajs/eden";
import { App } from "@server/app";
import { atom } from "./atom";
import { metronome } from "./metronome";

/**
 * type definitions
 */
type WS = ReturnType<ReturnType<typeof treaty<App>>["room"]["subscribe"]>;
type WSRequest = Parameters<WS["send"]>[0] extends infer T | Array<unknown>
  ? T
  : never;
type WSResponse =
  Parameters<Parameters<WS["subscribe"]>[0]>[0] extends Treaty.OnMessage<
    infer R
  >
    ? R
    : never;

/**
 * constants
 */
const SERVER_ORIGIN = window?.location?.origin ?? "http://localhost:4000";

const state = atom<"idle" | "connecting" | "sending" | "online">("idle");
const role = atom<"owner" | "member">("owner");
const id = atom<string | null>(null);

let _close = () => {};
let _send = (_: WSRequest) => {};

const _cases = {
  "room-created": (data) => {
    role.set("owner");
    id.set(data.payload.roomId);
  },
  "room-joined": (data) => {
    role.set("member");
    id.set(data.payload.roomId);
  },
  "set-metronome": (data) => {
    metronome.bpm.set(data.payload.bpm);
    metronome.beats.set(data.payload.beats);
  },
  "play-schedule": (data) => {
    metronome.play(data.payload.at);
  },
  "play-halt": () => {
    metronome.stop();
  },
  error: (data) => {
    console.log(data);
  },
  "promote-owner": () => {
    role.set("owner");
  },
} satisfies {
  [key in WSResponse["type"]]: (data: WSResponse & { type: key }) => unknown;
};

function connect(roomId?: string) {
  const con = treaty<App>(SERVER_ORIGIN).room.subscribe({
    query: roomId ? { id: roomId } : {},
  });

  con.on("open", () => {
    state.set("online");
    con.send({
      type: "set-metronome",
      payload: {
        bpm: metronome.bpm.get(),
        beats: metronome.beats.get(),
      },
    });
  });
  con.on("message", ({ data }) => {
    _cases[data.type](data as unsafe_any);
  });
  con.on("error", () => {
    con.close();
  });
  con.on("close", () => {
    state.set("idle");
    role.set("owner");
    id.set(null);
    _close = () => {};
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
  id,
  connect,
  leave,
  send,
};
