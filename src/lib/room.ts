import { treaty } from "@elysiajs/eden";
import type { App } from "@server/app";
import { app } from "@server/app";
import { Fail, Ok, Result } from "@server/shared/result";
import { createIsomorphicFn } from "@tanstack/react-start";
import { nanoid } from "nanoid";
import { atom } from "./atom";
import { metronome } from "./metronome";

/**
 * type definitions
 */

type WS = App["~Routes"]["api"]["rooms"]["subscribe"];
type Connection = ReturnType<typeof apiRooms.subscribe>;
type WSRequest = WS["body"];
type WSResponse = WS["response"]["200"];

type MessageData = Exclude<WSResponse, { type: "error" | "room-joined" }>;
type ErrorData = Extract<WSResponse, { type: "error" }>["payload"];

/**
 * api and states
 */

const _getTreaty = createIsomorphicFn()
  .client(() => treaty<App>(location.origin))
  .server(() => treaty(app));

const apiRooms = _getTreaty().api.rooms;
const error = atom("");
const role = atom<"owner" | "member">("owner");
const isPending = atom(false);

let _con: Connection | null = null;

/**
 * actions
 */

function _getClockSkewCalculator() {
  const Tc = Date.now();
  return (Tn: number) => {
    return Tn - Tc - (Tn - Tc) / 2;
  };
}

function _listen(con: Connection, onClose?: () => void) {
  const ctrl = new AbortController();

  const handleData = (data: MessageData) => {
    switch (data.type) {
      case "set-metronome":
        metronome.bpm.set(data.payload.bpm);
        metronome.beats.set(data.payload.beats);
        metronome.subDivision.set(data.payload.subDivision);
        break;
      case "play-schedule":
        metronome.play(data.payload.at - room.clockSkew);
        break;
      case "play-halt":
        metronome.stop();
        break;
      case "promote-owner":
        role.set("owner");
        break;
      default:
        error.set(`Unexpected message: ${(data as unsafe_any).type}`);
        console.log(data);
        break;
    }
  };
  const handleError = (data: ErrorData) => {
    switch (data.code) {
      case "UNAUTHORIZED":
        error.set("You are not host");
        break;
      default:
        error.set(`Unexpected error: ${(data as unsafe_any).code}`);
        console.log(data);
        break;
    }
  };
  const handleClose = () => {
    onClose?.();
    metronome.stop();
    role.set("owner");
    _con = null;
  };

  const onMessage = (data: WSResponse) => {
    if (data.type === "room-joined") return error.set("Already joined");
    if (data.type === "error") return handleError(data.payload);
    return handleData(data);
  };
  con.on("message", ({ data }) => onMessage(data), { signal: ctrl.signal });
  con.on("close", handleClose, { signal: ctrl.signal });

  return () => {
    ctrl.abort();
    con.close();
  };
}

async function join(roomId: string, onClose?: () => void) {
  error.set("");
  isPending.set(true);
  const calcClockSkew = _getClockSkewCalculator();
  const ctrl = new AbortController();
  const { promise, resolve, reject } =
    Promise.withResolvers<
      Extract<WSResponse, { type: "room-joined" }>["payload"]
    >();

  const con = apiRooms.subscribe({
    query: { roomId },
  });

  con.on(
    "message",
    ({ data }) => {
      if (data.type === "room-joined") {
        return resolve(data.payload);
      }
      if (data.type !== "error") {
        return reject(`Unknown ${data.type}`);
      }
      if (data.payload.code === "ROOM_NOT_FOUND") {
        return reject("Room not exist or expired");
      }
      return reject(`Unexpected ${data.payload.code}`);
    },
    { signal: ctrl.signal, once: true },
  );
  con.on(
    "error",
    () => {
      reject("Unexpected error");
    },
    { signal: ctrl.signal, once: true },
  );
  const timer = setTimeout(() => {
    reject("Connection timeout");
  }, 1000);

  return await promise
    .then((data) => {
      room.clockSkew = calcClockSkew(data.now);
      role.set(data.role);
      _con = con;
      return _listen(con, onClose);
    })
    .catch((cause: string) => {
      error.set(cause);
      con.close();
      throw new Error(cause);
    })
    .finally(() => {
      ctrl.abort();
      clearTimeout(timer);
      isPending.set(false);
    });
}

type SendReturn<T extends WSRequest["type"]> =
  | Result<Extract<WSResponse, { type: T }>["payload"], never>
  | Result<never, "UNAUTHORIZED" | "UNEXPECTED">;

async function send<T extends WSRequest["type"]>(
  type: T,
  payload: Extract<WSRequest, { type: T }>["payload"],
) {
  if (!_con) return Ok(payload);

  isPending.set(true);
  const id = nanoid();
  const message = { id, type, payload } as WSRequest;
  const { promise, resolve } = Promise.withResolvers<SendReturn<T>>();
  const ctrl = new AbortController();

  _con.on(
    "message",
    ({ data }) => {
      if (data.id !== id) {
        return;
      }
      if (data.type === type) {
        return resolve(Ok(data.payload as unsafe_any));
      }
      if (data.type !== "error") {
        return resolve(Fail("UNEXPECTED", `Unexpected ${data.type}`));
      }
      if (data.payload.code === "UNAUTHORIZED") {
        return resolve(Fail("UNAUTHORIZED", "You are not host"));
      }
      return resolve(Fail("UNEXPECTED", `Unexpected ${data.payload.code}`));
    },
    { signal: ctrl.signal },
  );
  _con.send(message);

  return await promise.finally(() => {
    ctrl.abort();
    isPending.set(false);
  });
}

/**
 * exports
 */

export const room = {
  role,
  error,
  isPending,
  clockSkew: 0,
  create: () => apiRooms.post(),
  join,
  send,
};
