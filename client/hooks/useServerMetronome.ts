import { Treaty, treaty } from "@elysiajs/eden";
import type { App } from "@server/app";
import { useEffect, useState } from "react";
import { MetronomeState } from "./useMetronomeController";

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

const getServerOrigin = (): string =>
  window?.location?.origin ?? "http://localhost:4000";

export function useServerMetronome(
  metronomeState: MetronomeState,
  callback: (response: WSResponse) => void,
) {
  const [ws, setWs] = useState<WS | null>(null);
  const [state, setState] = useState<"idle" | "connecting" | "online">("idle");
  const [role, setRole] = useState<"owner" | "member">("owner");
  const [roomId, setRoomId] = useState<string | null>(null);

  useEffect(() => {
    if (!ws) {
      return;
    }

    const abortController = new AbortController();
    const { signal } = abortController;

    ws.on("open", () => setState("online"), { signal });
    ws.on("error", () => ws?.close(), { signal });

    ws.on(
      "message",
      (event) => {
        const parsed = event.data;
        switch (parsed.type) {
          case "room-created": {
            setRole("owner");
            setRoomId(parsed.roomId);
            ws?.send({
              type: "set-metronome",
              metronome: metronomeState,
            });
            break;
          }
          case "room-joined": {
            setRole("member");
            setRoomId(parsed.roomId);
            break;
          }
          case "promote-owner": {
            setRole("owner");
            break;
          }
          default: {
            callback(parsed);
            break;
          }
        }
      },
      { signal },
    );

    ws.on(
      "close",
      () => {
        setState("idle");
        setRole("owner");
        setRoomId(null);
        setWs(null);
      },
      { signal },
    );

    return () => {
      abortController.abort();
    };
  }, [callback, metronomeState, roomId, ws]);

  const connect = (roomId?: string) => {
    setState("connecting");
    const ws = treaty<App>(getServerOrigin()).room.subscribe({
      query: roomId ? { id: roomId } : {},
    });

    setWs(ws);
  };

  const disconnect = () => {
    ws?.close();
  };

  const send = (message: WSRequest) => {
    if (!ws) {
      throw new Error("Not connected to server");
    }
    ws.send(message);
  };

  return {
    connect,
    disconnect,
    send,
    state,
    role,
    roomId,
  };
}
