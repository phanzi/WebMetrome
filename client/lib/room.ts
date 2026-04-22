import { treaty } from "@elysiajs/eden";
import type { App } from "@server/app";
import { timeout, TimeoutError } from "es-toolkit";
import { atom } from "./atom";
import { metronome } from "./metronome";

/**
 * type definitions
 */

type WS = App["~Routes"]["rooms"]["subscribe"];
type WSRequest = WS["body"];
type WSResponse = WS["response"]["200"];

type OpenData = Extract<WSResponse, { type: "room-joined" }>["payload"];
type MessageData = Exclude<WSResponse, { type: "error" | "room-joined" }>;
type ErrorData =
  | Extract<WSResponse, { type: "error" }>["payload"]
  | { code: "UNKNOWN" | "UNEXPECTED"; message: string };

/**
 * api and states
 */

const apiRooms = treaty<App>(location.origin).rooms;
const state = atom<"idle" | "connecting" | "online">("idle");
const error = atom("");
const role = atom<"owner" | "member">("owner");

let _con: ReturnType<typeof connect> | null = null;

/**
 * actions
 */

function connect(roomId: string) {
  const openListeners = new Set<(data: OpenData) => void>();
  const messageListeners = new Set<(data: MessageData) => void>();
  const errorListeners = new Set<(data: ErrorData) => void>();
  const closeListeners = new Set<() => void>();

  const ctrl = new AbortController();
  const con = apiRooms.subscribe({
    query: { roomId },
  });

  con.on(
    "message",
    ({ data }) => {
      switch (data.type) {
        case "room-joined":
          openListeners.forEach((listener) => listener(data.payload));
          break;
        case "error":
          errorListeners.forEach((listener) => listener(data.payload));
          break;
        default:
          messageListeners.forEach((listener) => listener(data));
          break;
      }
    },
    { signal: ctrl.signal },
  );
  con.on(
    "error",
    () => {
      errorListeners.forEach((listener) =>
        listener({ code: "UNEXPECTED", message: "Unexpected error" }),
      );
      con.close();
    },
    { signal: ctrl.signal },
  );
  con.on(
    "close",
    () => {
      closeListeners.forEach(() => {});
    },
    { signal: ctrl.signal },
  );

  return {
    onOpen: (listener: (data: OpenData) => void) => {
      openListeners.add(listener);
      return () => {
        openListeners.delete(listener);
      };
    },
    onMessage: (listener: (data: MessageData) => void) => {
      messageListeners.add(listener);
      return () => {
        messageListeners.delete(listener);
      };
    },
    onError: (listener: (data: ErrorData) => void) => {
      errorListeners.add(listener);
      return () => {
        errorListeners.delete(listener);
      };
    },
    onClose: (listener: () => void) => {
      closeListeners.add(listener);
      return () => {
        closeListeners.delete(listener);
      };
    },
    close: () => {
      openListeners.clear();
      messageListeners.clear();
      errorListeners.clear();
      closeListeners.clear();
      con?.close();
    },
    send: (message: WSRequest) => {
      con.send(message);
    },
  };
}

async function join(roomId: string) {
  error.set("");
  state.set("connecting");
  const { promise, resolve, reject } = Promise.withResolvers();
  const Tc = Date.now();

  _con = connect(roomId);
  _con.onOpen((data) => {
    const Tn = Date.now();
    const Ts = data.now;
    room.clockSkew = Ts - Tc - (Tn - Tc) / 2;
    role.set(data.role);
    state.set("online");
    resolve();

    if (data.role === "owner") {
      _con?.send({
        type: "set-metronome",
        payload: {
          bpm: metronome.bpm.get(),
          beats: metronome.beats.get(),
          subDivision: metronome.subDivision.get(),
        },
      });
    }
  });
  _con.onMessage((data) => {
    switch (data.type) {
      case "set-metronome":
        metronome.bpm.set(data.payload.bpm);
        metronome.beats.set(data.payload.beats);
        metronome.subDivision.set(data.payload.subDivision);
        break;
      case "play-schedule":
        metronome.bpm.set(data.payload.state.bpm);
        metronome.beats.set(data.payload.state.beats);
        metronome.subDivision.set(data.payload.state.subDivision);
        metronome.play(data.payload.at - room.clockSkew);
        break;
      case "play-halt":
        metronome.stop();
        break;
      case "promote-owner":
        role.set("owner");
        break;
    }
  });
  _con.onError((data) => {
    switch (data.code) {
      case "ROOM_NOT_FOUND":
        error.set("Room not exist or expired");
        break;
      case "UNAUTHORIZED":
        error.set("You are not host");
        break;
      case "UNEXPECTED":
        error.set("Unexpected error");
        break;
      case "UNKNOWN":
        error.set(data.message);
        break;
    }
  });
  _con.onClose(() => {
    reject();
    metronome.stop();
    role.set("owner");
    state.set("idle");
    _con = null;
  });

  return await Promise.race([promise, timeout(1000)]).catch(
    (maybeTimeoutError) => {
      if (maybeTimeoutError instanceof TimeoutError) {
        error.set("Connection timeout");
        _con?.close();
      }
      throw maybeTimeoutError;
    },
  );
}

function send(message: WSRequest) {
  if (state.get() !== "online") return;
  if (role.get() !== "owner") return;
  _con?.send(message);
}

async function create() {
  return await apiRooms.post();
}

function leave() {
  _con?.close();
}

/**
 * exports
 */

export const room = {
  role,
  error,
  state,
  clockSkew: 0,
  create,
  join,
  leave,
  send,
};
