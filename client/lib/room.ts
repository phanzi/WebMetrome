import { treaty } from "@elysiajs/eden";
import type { App } from "@server/app";
import { atom } from "./atom";
import { metronome } from "./metronome";

/**
 * type definitions
 */

type WS = App["~Routes"]["rooms"]["subscribe"];
type Connection = ReturnType<typeof apiRooms.subscribe>;
type WSRequest = WS["body"];
type WSResponse = WS["response"]["200"];

type MessageData = Exclude<WSResponse, { type: "error" | "room-joined" }>;
type ErrorData = Extract<WSResponse, { type: "error" }>["payload"];

/**
 * api and states
 */

const apiRooms = treaty<App>(location.origin).rooms;
const error = atom("");
const role = atom<"owner" | "member">("owner");

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
    });
}

function send(message: WSRequest) {
  if (role.get() !== "owner") return;
  _con?.send(message);
}

/**
 * exports
 */

export const room = {
  role,
  error,
  clockSkew: 0,
  create: () => apiRooms.post(),
  join,
  send,
};
