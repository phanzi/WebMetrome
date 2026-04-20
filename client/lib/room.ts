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

/**
 * api and states
 */
const apiRooms = treaty<App>(location.origin).rooms;
const state = atom<"idle" | "connecting" | "sending" | "online">("idle");
const error = atom("");
const role = atom<"owner" | "member">("owner");

let _close = () => {};
let _send = (_: WSRequest) => {};

async function join(roomId: string) {
  const { promise, resolve, reject } = Promise.withResolvers();

  const con = apiRooms.subscribe({
    query: { roomId },
  });

  con.on("message", ({ data }) => {
    switch (data.type) {
      case "room-joined":
        role.set(data.payload.role);
        state.set("online");
        _close = () => con.close();
        if (data.payload.role === "owner") {
          _send = (message) => con.send(message);
        }
        resolve();
        break;
      case "set-metronome":
        metronome.bpm.set(data.payload.bpm);
        metronome.beats.set(data.payload.beats);
        break;
      case "play-schedule":
        metronome.play(data.payload.at);
        break;
      case "play-halt":
        metronome.stop();
        break;
      case "promote-owner":
        role.set("owner");
        break;
      case "error": {
        switch (data.payload.code) {
          case "ROOM_NOT_FOUND":
            error.set("Room not exist or expired");
            break;
          case "UNAUTHORIZED":
            error.set("You are not host");
            break;
          default:
            error.set("Unknown error");
            break;
        }
        con.close();
        reject();
      }
    }
  });
  con.on("error", () => {
    error.set("Unexpected error");
    con.close();
    reject();
  });
  con.on("close", () => {
    state.set("idle");
    role.set("owner");
    _close = () => {};
    _send = () => {};
  });

  return await Promise.race([promise, timeout(1000)]).catch(
    (maybeTimeoutError) => {
      if (maybeTimeoutError instanceof TimeoutError) {
        error.set("Connection timeout");
        con.close();
      }
      throw maybeTimeoutError;
    },
  );
}

export const room = {
  state,
  role,
  error,
  create: () => apiRooms.post(),
  join,
  leave: () => _close(),
  send: (message: WSRequest) => _send(message),
};
