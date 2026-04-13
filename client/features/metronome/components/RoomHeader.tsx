export type RoomHeaderProps =
  | {
      kind: "offline";
      isConnecting: boolean;
      onJoinRoom: () => void;
      onCreateRoom: () => void;
    }
  | {
      kind: "live";
      roomId: string;
      isMaster: boolean;
      onExitRoom: () => void;
    };

export function RoomHeader(props: RoomHeaderProps) {
  return (
    <header className="mb-5 flex items-center justify-between">
      <h1 className="m-0 text-[1.2rem] font-bold text-slate-900">
        Sync Metronome
      </h1>
      <div className="flex gap-2">
        {props.kind === "offline" ? (
          <>
            <button
              className="rounded-lg bg-slate-700 px-3.5 py-2 text-xs font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              onClick={props.onJoinRoom}
              disabled={props.isConnecting}
            >
              {props.isConnecting ? "CONNECTING..." : "JOIN"}
            </button>
            <button
              className="rounded-lg bg-violet-600 px-3.5 py-2 text-xs font-bold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
              onClick={props.onCreateRoom}
              disabled={props.isConnecting}
            >
              SHARE
            </button>
          </>
        ) : (
          <div className="flex items-center gap-2">
            <div className="rounded-md bg-emerald-500 px-3 py-1.5 text-[0.75rem] font-bold text-white">
              {props.isMaster ? "HOST" : "MEMBER"}: {props.roomId}
            </div>
            <button
              className="rounded-md bg-red-500 px-2.5 py-1.5 text-xs font-semibold text-white transition hover:bg-red-600"
              onClick={props.onExitRoom}
            >
              EXIT
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
